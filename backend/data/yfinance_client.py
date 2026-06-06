import yfinance as yf
import cache


def _ticker(symbol: str):
    return yf.Ticker(symbol)


def get_price_history(ticker: str, period: str = "1y"):
    key = f"yf_price_{ticker}_{period}"
    cached = cache.get(key)
    if cached:
        return cached

    hist = _ticker(ticker).history(period=period)
    if hist.empty:
        return None

    result = [
        {
            "date": str(idx.date()),
            "open": round(row["Open"], 4),
            "high": round(row["High"], 4),
            "low": round(row["Low"], 4),
            "close": round(row["Close"], 4),
            "volume": int(row["Volume"]),
        }
        for idx, row in hist.iterrows()
    ]
    cache.set(key, result)
    return result


def get_info(ticker: str) -> dict:
    """
    Use fast_info (lightweight, no rate limit issues) and supplement
    with yf.Ticker.info for extended fields when available.
    """
    key = f"yf_info2_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached

    t = _ticker(ticker)
    fi = t.fast_info  # never rate-limited

    result = {
        "shortName": ticker,
        "longName": ticker,
        "sector": None,
        "industry": None,
        "country": None,
        "marketCap": _safe_attr(fi, "market_cap"),
        "currentPrice": _safe_attr(fi, "last_price"),
        "previousClose": _safe_attr(fi, "previous_close"),
        "fiftyTwoWeekHigh": _safe_attr(fi, "year_high"),
        "fiftyTwoWeekLow": _safe_attr(fi, "year_low"),
        "averageVolume": _safe_attr(fi, "three_month_average_volume"),
        "trailingPE": None,
        "forwardPE": None,
        "priceToBook": None,
        "priceToSalesTrailingTwelveMonths": None,
        "trailingEps": None,
        "forwardEps": None,
        "dividendYield": None,
        "beta": None,
        "enterpriseValue": None,
        "enterpriseToEbitda": None,
        "enterpriseToRevenue": None,
        "profitMargins": None,
        "operatingMargins": None,
        "grossMargins": None,
        "returnOnEquity": None,
        "returnOnAssets": None,
        "debtToEquity": None,
        "currentRatio": None,
        "quickRatio": None,
        "totalRevenue": None,
        "revenueGrowth": None,
        "earningsGrowth": None,
        "totalCash": None,
        "totalDebt": None,
        "freeCashflow": None,
        "operatingCashflow": None,
        "numberOfAnalystOpinions": None,
        "targetMeanPrice": None,
        "recommendationKey": None,
        "recommendationMean": None,
        "currency": _safe_attr(fi, "currency", "USD"),
        "exchange": _safe_attr(fi, "exchange"),
        "fullTimeEmployees": None,
        "longBusinessSummary": None,
    }

    # Try extended info — gracefully skip if rate-limited
    try:
        info = t.info
        if info and isinstance(info, dict) and info.get("shortName"):
            extended = [
                "shortName", "longName", "sector", "industry", "country",
                "trailingPE", "forwardPE", "priceToBook",
                "priceToSalesTrailingTwelveMonths", "trailingEps", "forwardEps",
                "dividendYield", "beta", "enterpriseValue",
                "enterpriseToEbitda", "enterpriseToRevenue", "profitMargins",
                "operatingMargins", "grossMargins", "returnOnEquity",
                "returnOnAssets", "debtToEquity", "currentRatio", "quickRatio",
                "totalRevenue", "revenueGrowth", "earningsGrowth",
                "totalCash", "totalDebt", "freeCashflow", "operatingCashflow",
                "numberOfAnalystOpinions", "targetMeanPrice",
                "recommendationKey", "recommendationMean",
                "fullTimeEmployees", "longBusinessSummary",
            ]
            for f in extended:
                if info.get(f) is not None:
                    result[f] = info[f]
    except Exception:
        pass  # fast_info data is still usable

    cache.set(key, result)
    return result


def _safe_attr(obj, attr, default=None):
    try:
        val = getattr(obj, attr, default)
        if val is None or (isinstance(val, float) and val != val):
            return default
        return val
    except Exception:
        return default


def get_financials(ticker: str) -> dict:
    key = f"yf_financials_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached

    t = _ticker(ticker)

    def df_to_dict(df):
        if df is None or df.empty:
            return {}
        return {
            str(col.date()): {k: (None if v != v else v) for k, v in df[col].items()}
            for col in df.columns
        }

    result = {
        "income_statement": df_to_dict(t.financials),
        "balance_sheet": df_to_dict(t.balance_sheet),
        "cash_flow": df_to_dict(t.cashflow),
    }
    cache.set(key, result)
    return result


def get_earnings(ticker: str) -> dict:
    key = f"yf_earnings_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached

    t = _ticker(ticker)
    try:
        earnings = t.earnings_history
    except Exception:
        return {"history": []}

    if earnings is None or (hasattr(earnings, "empty") and earnings.empty):
        return {"history": []}

    history = []
    for idx, row in earnings.iterrows():
        history.append({
            "date": str(idx) if not hasattr(idx, "date") else str(idx.date()),
            "epsEstimate": row.get("epsEstimate"),
            "epsActual": row.get("epsActual"),
            "epsSurprise": row.get("surprisePercent"),
        })

    result = {"history": history}
    cache.set(key, result)
    return result
