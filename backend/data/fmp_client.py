import httpx
import cache
from config import FMP_API_KEY, FMP_BASE


def _get(path: str, params: dict = {}) -> dict | list:
    params["apikey"] = FMP_API_KEY
    try:
        r = httpx.get(f"{FMP_BASE}/{path}", params=params, timeout=15)
        if r.status_code in (401, 403, 429):
            return []  # gracefully degrade on auth/rate errors
        r.raise_for_status()
        data = r.json()
        # FMP returns {"Error Message": "..."} on invalid plan
        if isinstance(data, dict) and "Error Message" in data:
            return []
        return data
    except Exception:
        return []


def get_income_statement(ticker: str, limit: int = 5) -> list:
    key = f"fmp_income_{ticker}_{limit}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"income-statement/{ticker}", {"limit": limit})
    cache.set(key, result)
    return result


def get_balance_sheet(ticker: str, limit: int = 5) -> list:
    key = f"fmp_balance_{ticker}_{limit}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"balance-sheet-statement/{ticker}", {"limit": limit})
    cache.set(key, result)
    return result


def get_cash_flow(ticker: str, limit: int = 5) -> list:
    key = f"fmp_cashflow_{ticker}_{limit}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"cash-flow-statement/{ticker}", {"limit": limit})
    cache.set(key, result)
    return result


def get_key_metrics(ticker: str, limit: int = 5) -> list:
    key = f"fmp_metrics_{ticker}_{limit}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"key-metrics/{ticker}", {"limit": limit})
    cache.set(key, result)
    return result


def get_financial_ratios(ticker: str, limit: int = 5) -> list:
    key = f"fmp_ratios_{ticker}_{limit}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"ratios/{ticker}", {"limit": limit})
    cache.set(key, result)
    return result


def get_dcf(ticker: str) -> dict:
    key = f"fmp_dcf_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"discounted-cash-flow/{ticker}")
    if isinstance(result, list) and result:
        result = result[0]
    cache.set(key, result)
    return result


def get_analyst_estimates(ticker: str, limit: int = 4) -> list:
    key = f"fmp_estimates_{ticker}_{limit}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"analyst-estimates/{ticker}", {"limit": limit})
    cache.set(key, result)
    return result


def get_price_target(ticker: str) -> list:
    key = f"fmp_target_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached
    result = _get(f"price-target/{ticker}")
    cache.set(key, result[:5] if isinstance(result, list) else result)
    return result[:5] if isinstance(result, list) else result
