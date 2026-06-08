from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analysis import fundamental, technical, sentiment, scoring
from data import yfinance_client as yf_client, finnhub_client, edgar_client, fmp_client, nse_client

app = FastAPI(title="Fin Research API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/analyze/{ticker}")
def analyze(ticker: str):
    ticker = ticker.upper().strip()
    try:
        info = yf_client.get_info(ticker)

        # Validate ticker via price data
        price_data = yf_client.get_price_history(ticker, "5d")
        if not price_data:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")

        # Supplement company profile from Finnhub if yf info is sparse
        profile = {}
        try:
            profile = finnhub_client.get_company_profile(ticker) or {}
        except Exception:
            pass

        # Current price: prefer yf fast_info, fallback to last close
        current_price = info.get("currentPrice") or (price_data[-1]["close"] if price_data else None)

        try:
            fund = fundamental.analyze(ticker)
        except Exception as e:
            fund = {"error": str(e), "score": {"raw": 50}}

        try:
            tech = technical.analyze(ticker)
        except Exception as e:
            tech = {"error": str(e), "score": {"raw": 50}, "chart_data": []}

        try:
            sent = sentiment.analyze(ticker)
        except Exception as e:
            sent = {"error": str(e), "score": {"raw": 50}}

        score = scoring.compute_composite(fund, tech, sent)

        return {
            "ticker": ticker,
            "name": (info.get("shortName") or info.get("longName") or
                     profile.get("name") or ticker),
            "exchange": info.get("exchange") or profile.get("exchange"),
            "sector": info.get("sector") or profile.get("finnhubIndustry"),
            "industry": info.get("industry"),
            "currency": info.get("currency") or profile.get("currency", "USD"),
            "description": info.get("longBusinessSummary") or profile.get("description"),
            "employees": info.get("fullTimeEmployees") or profile.get("employeeTotal"),
            "logo": profile.get("logo"),
            "score": score,
            "fundamental": fund,
            "technical": tech,
            "sentiment": sent,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/price/{ticker}")
def price_history(ticker: str, period: str = "1y"):
    ticker = ticker.upper().strip()
    data = yf_client.get_price_history(ticker, period=period)
    if not data:
        raise HTTPException(status_code=404, detail="No price data found")
    return {"ticker": ticker, "period": period, "data": data}


@app.get("/api/fundamental/{ticker}")
def get_fundamental(ticker: str):
    ticker = ticker.upper().strip()
    try:
        return fundamental.analyze(ticker)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/technical/{ticker}")
def get_technical(ticker: str):
    ticker = ticker.upper().strip()
    try:
        return technical.analyze(ticker)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sentiment/{ticker}")
def get_sentiment(ticker: str):
    ticker = ticker.upper().strip()
    try:
        return sentiment.analyze(ticker)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/news/{ticker}")
def get_news(ticker: str):
    ticker = ticker.upper().strip()
    try:
        news = finnhub_client.get_company_news(ticker, days=7)
        return {"ticker": ticker, "news": news}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/filings/{ticker}")
def get_filings(ticker: str):
    ticker = ticker.upper().strip()
    is_indian = ticker.endswith(".NS") or ticker.endswith(".BO")
    try:
        if is_indian:
            announcements = nse_client.get_corporate_announcements(ticker)
            return {"ticker": ticker, "market": "IN", "filings": announcements}
        else:
            filings = edgar_client.get_recent_filings(ticker)
            return {"ticker": ticker, "market": "US", "filings": filings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/india-data/{ticker}")
def get_india_data(ticker: str):
    ticker = ticker.upper().strip()
    try:
        data = nse_client.get_india_stock_data(ticker)
        return {"ticker": ticker, **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search/{query}")
def search_ticker(query: str):
    ticker = query.upper().strip()
    try:
        profile = finnhub_client.get_company_profile(ticker)
        info = yf_client.get_info(ticker)
        return {
            "ticker": ticker,
            "name": profile.get("name") or info.get("shortName"),
            "exchange": profile.get("exchange"),
            "sector": info.get("sector"),
            "logo": profile.get("logo"),
            "valid": bool(info.get("currentPrice")),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
