import httpx
import cache
from config import ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE


def _get(params: dict) -> dict:
    params["apikey"] = ALPHA_VANTAGE_API_KEY
    r = httpx.get(ALPHA_VANTAGE_BASE, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def _extract_series(data: dict, key: str) -> list:
    series = data.get(key, {})
    return [
        {"date": date, **values}
        for date, values in list(series.items())[:100]
    ]


def get_rsi(ticker: str, interval: str = "daily") -> list:
    key = f"av_rsi_{ticker}_{interval}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get({
        "function": "RSI",
        "symbol": ticker,
        "interval": interval,
        "time_period": 14,
        "series_type": "close",
    })
    result = _extract_series(data, "Technical Analysis: RSI")
    cache.set(key, result)
    return result


def get_macd(ticker: str, interval: str = "daily") -> list:
    key = f"av_macd_{ticker}_{interval}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get({
        "function": "MACD",
        "symbol": ticker,
        "interval": interval,
        "series_type": "close",
    })
    result = _extract_series(data, "Technical Analysis: MACD")
    cache.set(key, result)
    return result


def get_bbands(ticker: str, interval: str = "daily") -> list:
    key = f"av_bb_{ticker}_{interval}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get({
        "function": "BBANDS",
        "symbol": ticker,
        "interval": interval,
        "time_period": 20,
        "series_type": "close",
    })
    result = _extract_series(data, "Technical Analysis: BBANDS")
    cache.set(key, result)
    return result


def get_sma(ticker: str, period: int = 50, interval: str = "daily") -> list:
    key = f"av_sma_{ticker}_{period}_{interval}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get({
        "function": "SMA",
        "symbol": ticker,
        "interval": interval,
        "time_period": period,
        "series_type": "close",
    })
    result = _extract_series(data, "Technical Analysis: SMA")
    cache.set(key, result)
    return result


def get_ema(ticker: str, period: int = 20, interval: str = "daily") -> list:
    key = f"av_ema_{ticker}_{period}_{interval}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get({
        "function": "EMA",
        "symbol": ticker,
        "interval": interval,
        "time_period": period,
        "series_type": "close",
    })
    result = _extract_series(data, "Technical Analysis: EMA")
    cache.set(key, result)
    return result


def get_adx(ticker: str, interval: str = "daily") -> list:
    key = f"av_adx_{ticker}_{interval}"
    cached = cache.get(key)
    if cached:
        return cached
    data = _get({
        "function": "ADX",
        "symbol": ticker,
        "interval": interval,
        "time_period": 14,
    })
    result = _extract_series(data, "Technical Analysis: ADX")
    cache.set(key, result)
    return result
