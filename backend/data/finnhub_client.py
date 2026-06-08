import httpx
import cache
from config import FINNHUB_API_KEY, FINNHUB_BASE


def _get(endpoint: str, params: dict) -> dict:
    params["token"] = FINNHUB_API_KEY
    try:
        r = httpx.get(f"{FINNHUB_BASE}/{endpoint}", params=params, timeout=10)
        if r.status_code in (401, 403, 429):
            return {}
        r.raise_for_status()
        return r.json()
    except Exception:
        return {}


def get_company_profile(ticker: str) -> dict:
    key = f"fh_profile_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get("stock/profile2", {"symbol": ticker})
    cache.set(key, result)
    return result


def get_news_sentiment(ticker: str) -> dict:
    key = f"fh_sentiment_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get("news-sentiment", {"symbol": ticker})
    cache.set(key, result)
    return result


def get_recommendation_trends(ticker: str) -> list:
    key = f"fh_rec_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get("stock/recommendation", {"symbol": ticker})
    cache.set(key, result)
    return result


def get_earnings_calendar(ticker: str) -> dict:
    key = f"fh_earnings_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached

    import datetime
    today = datetime.date.today()
    future = today + datetime.timedelta(days=90)
    result = _get("calendar/earnings", {
        "symbol": ticker,
        "from": str(today),
        "to": str(future),
    })
    cache.set(key, result)
    return result


def get_basic_financials(ticker: str) -> dict:
    key = f"fh_basicfin_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get("stock/metric", {"symbol": ticker, "metric": "all"})
    cache.set(key, result)
    return result


def symbol_search(query: str, us_only: bool = True) -> list:
    key = f"fh_search_{'us' if us_only else 'all'}_{query.lower()}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    result = _get("search", {"q": query})
    hits = result.get("result", []) if isinstance(result, dict) else []
    filtered = []
    for h in hits:
        sym = h.get("symbol", "")
        if not sym:
            continue
        if h.get("type") not in ("Common Stock", "ETP", "DR", "DEPOSITARY RECEIPT"):
            continue
        # For US-only: skip any symbol containing a dot (e.g. TSLA.L, AAPL.MX)
        if us_only and "." in sym:
            continue
        filtered.append({
            "symbol": sym,
            "name": h.get("description", ""),
            "type": h.get("type", ""),
            "exchange": "US",
        })
        if len(filtered) == 8:
            break
    cache.set(key, filtered, ttl=300)
    return filtered


def get_company_news(ticker: str, days: int = 7) -> list:
    key = f"fh_news_{ticker}_{days}"
    cached = cache.get(key)
    if cached:
        return cached

    import datetime
    today = datetime.date.today()
    past = today - datetime.timedelta(days=days)
    result = _get("company-news", {
        "symbol": ticker,
        "from": str(past),
        "to": str(today),
    })
    cache.set(key, result[:20] if isinstance(result, list) else result)
    return result[:20] if isinstance(result, list) else result
