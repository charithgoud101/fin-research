# FinResearch — Stock Analysis Tool

Full-stack financial research tool with fundamental, technical, and sentiment analysis.

## Quick Start

### 1. Backend (Python FastAPI)

```bash
cd backend
pip install -r requirements.txt
# Add your API keys to .env (see .env.example)
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Data Sources

| Source | Data |
|--------|------|
| Yahoo Finance (yfinance) | Price history, financials, ratios, earnings |
| Finnhub (free key) | News sentiment, analyst recommendations, earnings calendar |
| Alpha Vantage (free key) | Technical indicators |
| Financial Modeling Prep (free key) | Statements, DCF, price targets |
| SEC EDGAR (no key) | 10-K/10-Q/8-K filings |

## API Keys

Create `backend/.env`:

```
FINNHUB_API_KEY=your_key
ALPHA_VANTAGE_API_KEY=your_key
FMP_API_KEY=your_key
```

## Features

- **Composite Score** (0–100): Fundamental 40% + Technical 35% + Sentiment 25%
- **Fundamental**: P/E, EV/EBITDA, ROE, margins, DCF valuation, analyst targets
- **Technical**: RSI, MACD, Bollinger Bands, SMA/EMA, support/resistance, signals
- **Sentiment**: News sentiment, analyst buy/sell counts, recent headlines
- **SEC Filings**: Recent 10-K, 10-Q, 8-K links from EDGAR
- **Price Chart**: 1M/3M/6M/1Y with MA and Bollinger Band overlays
