#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$PROJECT_DIR/venv"

source "$VENV/bin/activate"
echo "Using Python: $(which python)"

# Kill any leftover processes on our ports
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Install nse-service deps if needed
if [ ! -d "$PROJECT_DIR/nse-service/node_modules" ]; then
  echo "Installing NSE service dependencies..."
  cd "$PROJECT_DIR/nse-service" && npm install --silent
fi

echo ""
echo "Starting FinResearch..."
echo ""

# Start NSE microservice (Node.js)
cd "$PROJECT_DIR/nse-service"
node index.js &
NSE_PID=$!
echo "NSE Service PID: $NSE_PID (port 3001)"

# Start FastAPI backend
cd "$PROJECT_DIR/backend"
uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID:     $BACKEND_PID (port 8000)"

# Start React frontend
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID:    $FRONTEND_PID (port 5173)"

echo ""
echo "  Open: http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop all servers."

trap "echo ''; echo 'Stopping...'; kill $NSE_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
