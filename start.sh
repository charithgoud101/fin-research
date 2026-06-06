#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$PROJECT_DIR/venv"

# Activate virtual environment
source "$VENV/bin/activate"

# Verify venv is active
echo "Using Python: $(which python)"

# Kill any leftover processes on our ports
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo ""
echo "Starting FinResearch..."
echo ""

# Start FastAPI backend in background
cd "$PROJECT_DIR/backend"
uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID (port 8000)"

# Start React frontend in background
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Frontend PID: $FRONTEND_PID (port 5173)"
echo ""
echo "Open: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C and kill both servers
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Wait for both
wait
