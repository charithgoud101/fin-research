import httpx
import time
import cache
from datetime import date, timedelta

NSE_BASE = "https://www.nseindia.com/api"

_client = None
_client_ts = 0.0
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


def _ensure_session() -> httpx.Client:
    global _client, _client_ts
    now = time.time()
    if _client is None or (now - _client_ts) > 600:
        c = httpx.Client(
            headers=_HEADERS,
            follow_redirects=True,
            timeout=httpx.Timeout(20.0),
        )
        try:
            c.get("https://www.nseindia.com/")
            time.sleep(0.5)
        except Exception:
            pass
        _client = c
        _client_ts = now
    return _client


def _get(endpoint: str, params: dict = None) -> dict | list:
    try:
        c = _ensure_session()
        r = c.get(
            f"{NSE_BASE}{endpoint}",
            params=params,
            headers={
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.nseindia.com/",
                "X-Requested-With": "XMLHttpRequest",
            },
        )
        if r.status_code == 200:
            return r.json()
        # Session expired — refresh and retry once
        global _client_ts
        _client_ts = 0
        c = _ensure_session()
        r = c.get(
            f"{NSE_BASE}{endpoint}",
            params=params,
            headers={
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.nseindia.com/",
            },
        )
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return {}


def _strip_suffix(ticker: str) -> str:
    return ticker.upper().replace(".NS", "").replace(".BO", "")


def get_quote(ticker: str) -> dict:
    symbol = _strip_suffix(ticker)
    key = f"nse_quote_{symbol}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get("/quote-equity", params={"symbol": symbol})
    if isinstance(data, dict) and data:
        cache.set(key, data)
    return data if isinstance(data, dict) else {}


def get_delivery_data(ticker: str) -> dict:
    data = get_quote(ticker)
    trade = data.get("tradeInfo", {})
    return {
        "delivery_qty": trade.get("deliveryQuantity"),
        "delivery_pct": trade.get("deliveryToTradedQuantity"),
        "total_traded_qty": trade.get("totalTradedVolume"),
        "total_traded_value": trade.get("totalTradedValue"),
    }


def get_circuit_limits(ticker: str) -> dict:
    data = get_quote(ticker)
    price_info = data.get("priceInfo", {})
    return {
        "upper_circuit": price_info.get("upperCP"),
        "lower_circuit": price_info.get("lowerCP"),
        "price_band": price_info.get("priceBand"),
        "week_high_52": price_info.get("weekHighLow", {}).get("max"),
        "week_low_52": price_info.get("weekHighLow", {}).get("min"),
    }


def get_fii_dii_data() -> list:
    key = "nse_fii_dii"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get("/fiidiiTradeReact")
    if isinstance(data, list) and data:
        cache.set(key, data)
        return data
    return []


def get_shareholding(ticker: str) -> dict:
    symbol = _strip_suffix(ticker)
    key = f"nse_shareholding_{symbol}"
    cached = cache.get(key)
    if cached:
        return cached
    today = date.today()
    from_date = (today - timedelta(days=365)).strftime("%d-%m-%Y")
    to_date = today.strftime("%d-%m-%Y")
    data = _get(
        "/corporate-shareholding",
        params={"symbol": symbol, "series": "EQ", "from": from_date, "to": to_date},
    )
    if isinstance(data, dict) and data:
        cache.set(key, data)
        return data
    return {}


def get_corporate_announcements(ticker: str) -> list:
    symbol = _strip_suffix(ticker)
    key = f"nse_announcements_{symbol}"
    cached = cache.get(key)
    if cached:
        return cached
    today = date.today()
    from_date = (today - timedelta(days=90)).strftime("%d-%m-%Y")
    to_date = today.strftime("%d-%m-%Y")
    data = _get(
        "/corporate-announcements",
        params={
            "index": "equities",
            "symbol": symbol,
            "from_date": from_date,
            "to_date": to_date,
        },
    )
    if isinstance(data, list):
        cache.set(key, data)
        return data
    return []


def get_india_stock_data(ticker: str) -> dict:
    """Aggregate all India-specific data for a ticker."""
    fii_dii = get_fii_dii_data()
    delivery = get_delivery_data(ticker)
    circuit = get_circuit_limits(ticker)
    shareholding = get_shareholding(ticker)
    announcements = get_corporate_announcements(ticker)

    # Parse shareholding into a clean structure
    holding_summary = _parse_shareholding(shareholding)

    return {
        "fii_dii_flows": fii_dii[:30] if fii_dii else [],
        "delivery": delivery,
        "circuit_limits": circuit,
        "shareholding": holding_summary,
        "announcements": announcements[:20] if announcements else [],
    }


def _parse_shareholding(data: dict) -> dict:
    """Extract latest promoter/FII/DII/public holding from NSE response."""
    if not data:
        return {}
    try:
        # NSE returns shareholdingPatterns.data list sorted by date
        patterns = data.get("shareholdingPatterns", {}).get("data", [])
        if not patterns:
            return {}
        latest = patterns[0]
        return {
            "date": latest.get("date"),
            "promoter": _safe_pct(latest.get("promoterAndPromoterGroupTotal")),
            "fii": _safe_pct(latest.get("foreignPortfolioInvestors")),
            "dii": _safe_pct(latest.get("mutualFunds")),
            "public": _safe_pct(latest.get("publicShareholdingTotal")),
        }
    except Exception:
        return {}


def _safe_pct(val) -> float | None:
    try:
        return round(float(val), 2)
    except (TypeError, ValueError):
        return None
