"""
NSE data client — delegates to the local nse-service (Node.js, port 3001)
which uses the stock-nse-india library and handles NSE session cookies.
"""
import httpx
import cache

NSE_SERVICE = "http://localhost:3001"
_client = httpx.Client(timeout=20)


def _get(path: str, params: dict = None):
    try:
        r = _client.get(f"{NSE_SERVICE}{path}", params=params)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def _strip(ticker: str) -> str:
    return ticker.upper().replace(".NS", "").replace(".BO", "")


# ─── Search ──────────────────────────────────────────────────────────────────

def search_autocomplete(query: str) -> list:
    key = f"nse_search_{query.lower()}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    data = _get("/search/autocomplete", {"q": query})
    results = data.get("symbols", []) if isinstance(data, list) is False and data else []
    if results:
        cache.set(key, results, ttl=300)
    return results


# ─── Stock-specific data ──────────────────────────────────────────────────────

def get_quote(ticker: str) -> dict:
    symbol = _strip(ticker)
    key = f"nse2_quote_{symbol}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get(f"/equity/{symbol}")
    if data and isinstance(data, dict) and "priceInfo" in data:
        cache.set(key, data)
        return data
    return {}


def get_delivery_data(ticker: str) -> dict:
    symbol = _strip(ticker)
    key = f"nse2_delivery_{symbol}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get(f"/equity/{symbol}/trade-info")
    dp = data.get("securityWiseDP", {}) if isinstance(data, dict) else {}
    result = {
        "delivery_qty": dp.get("deliveryQuantity"),
        "delivery_pct": dp.get("deliveryToTradedQuantity"),
        "total_traded_qty": dp.get("quantityTraded"),
    }
    cache.set(key, result)
    return result


def get_circuit_limits(ticker: str) -> dict:
    data = get_quote(ticker)
    pi = data.get("priceInfo", {}) if isinstance(data, dict) else {}
    week = pi.get("weekHighLow", {}) or {}
    return {
        "upper_circuit": pi.get("upperCP") or None,
        "lower_circuit": pi.get("lowerCP") or None,
        "price_band": pi.get("priceBand") or None,
        "week_high_52": week.get("max") if isinstance(week, dict) else None,
        "week_low_52": week.get("min") if isinstance(week, dict) else None,
    }


def get_fii_dii_data() -> list:
    key = "nse2_fii_dii"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get("/fii-dii")
    if isinstance(data, list) and data:
        cache.set(key, data)
        return data
    return []


def get_shareholding(ticker: str) -> dict:
    symbol = _strip(ticker)
    key = f"nse2_shareholding_{symbol}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get(f"/equity/{symbol}/corporate-info")
    sh = data.get("shareholding", {}) if isinstance(data, dict) else {}
    if sh:
        cache.set(key, sh, ttl=3600 * 6)
    return sh


def get_corporate_announcements(ticker: str) -> list:
    symbol = _strip(ticker)
    key = f"nse2_ann_{symbol}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get(f"/equity/{symbol}/corporate-info")
    ann = data.get("announcements", []) if isinstance(data, dict) else []
    cache.set(key, ann)
    return ann


# ─── Aggregate India data ─────────────────────────────────────────────────────

def get_india_stock_data(ticker: str) -> dict:
    fii_dii = get_fii_dii_data()
    delivery = get_delivery_data(ticker)
    circuit = get_circuit_limits(ticker)
    shareholding = get_shareholding(ticker)
    announcements = get_corporate_announcements(ticker)

    return {
        "fii_dii_flows": fii_dii[-30:] if fii_dii else [],
        "delivery": delivery,
        "circuit_limits": circuit,
        "shareholding": shareholding,
        "announcements": announcements[:20],
    }
