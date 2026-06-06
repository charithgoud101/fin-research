from data import yfinance_client as yf_client, fmp_client


def _safe(val, default=None):
    if val is None or val != val:  # handles NaN
        return default
    return val


def _pct(val):
    if val is None:
        return None
    return round(val * 100, 2)


def analyze(ticker: str) -> dict:
    info = yf_client.get_info(ticker)
    fmp_ratios = fmp_client.get_financial_ratios(ticker, limit=1)
    fmp_metrics = fmp_client.get_key_metrics(ticker, limit=1)
    dcf = fmp_client.get_dcf(ticker)
    estimates = fmp_client.get_analyst_estimates(ticker, limit=4)
    price_targets = fmp_client.get_price_target(ticker)

    r = fmp_ratios[0] if fmp_ratios else {}
    m = fmp_metrics[0] if fmp_metrics else {}

    # Use fast_info last_price if currentPrice is unavailable
    current_price = _safe(info.get("currentPrice"))
    if not current_price:
        try:
            import yfinance as yf
            current_price = yf.Ticker(ticker).fast_info.last_price
        except Exception:
            pass

    # DCF valuation
    dcf_value = None
    dcf_upside = None
    if isinstance(dcf, dict):
        dcf_value = _safe(dcf.get("dcf"))
        if dcf_value and current_price:
            dcf_upside = round(((dcf_value - current_price) / current_price) * 100, 2)

    # Price targets
    target_mean = _safe(info.get("targetMeanPrice"))
    target_upside = None
    if target_mean and current_price:
        target_upside = round(((target_mean - current_price) / current_price) * 100, 2)

    # Revenue growth from estimates
    rev_growth_fwd = None
    if estimates and len(estimates) >= 2:
        try:
            rev_0 = estimates[0].get("estimatedRevenueAvg") or 0
            rev_1 = estimates[1].get("estimatedRevenueAvg") or 0
            if rev_1:
                rev_growth_fwd = round(((rev_0 - rev_1) / abs(rev_1)) * 100, 2)
        except Exception:
            pass

    valuation = {
        "pe_trailing": _safe(info.get("trailingPE")),
        "pe_forward": _safe(info.get("forwardPE")),
        "price_to_book": _safe(info.get("priceToBook")),
        "price_to_sales": _safe(info.get("priceToSalesTrailingTwelveMonths")),
        "ev_to_ebitda": _safe(info.get("enterpriseToEbitda")),
        "ev_to_revenue": _safe(info.get("enterpriseToRevenue")),
        "peg_ratio": _safe(r.get("priceEarningsToGrowthRatio")),
    }

    profitability = {
        "gross_margin": _pct(info.get("grossMargins")),
        "operating_margin": _pct(info.get("operatingMargins")),
        "net_margin": _pct(info.get("profitMargins")),
        "roe": _pct(info.get("returnOnEquity")),
        "roa": _pct(info.get("returnOnAssets")),
        "roic": _safe(r.get("returnOnCapitalEmployed")),
    }

    liquidity_leverage = {
        "current_ratio": _safe(r.get("currentRatio") or info.get("currentRatio")),
        "quick_ratio": _safe(r.get("quickRatio") or info.get("quickRatio")),
        "debt_to_equity": _safe(info.get("debtToEquity")),
        "interest_coverage": _safe(r.get("interestCoverage")),
        "total_debt": _safe(info.get("totalDebt")),
        "total_cash": _safe(info.get("totalCash")),
        "free_cash_flow": _safe(info.get("freeCashflow")),
    }

    growth = {
        "revenue_growth_yoy": _pct(info.get("revenueGrowth")),
        "earnings_growth_yoy": _pct(info.get("earningsGrowth")),
        "revenue_growth_fwd": rev_growth_fwd,
        "eps_trailing": _safe(info.get("trailingEps")),
        "eps_forward": _safe(info.get("forwardEps")),
    }

    score = _compute_fundamental_score(valuation, profitability, liquidity_leverage, growth)

    return {
        "current_price": current_price,
        "market_cap": _safe(info.get("marketCap")),
        "valuation": valuation,
        "profitability": profitability,
        "liquidity_leverage": liquidity_leverage,
        "growth": growth,
        "dcf": {
            "intrinsic_value": dcf_value,
            "upside_pct": dcf_upside,
        },
        "price_target": {
            "mean": target_mean,
            "upside_pct": target_upside,
            "analyst_count": _safe(info.get("numberOfAnalystOpinions")),
            "recommendation": _safe(info.get("recommendationKey")),
        },
        "score": score,
    }


def _compute_fundamental_score(valuation, profitability, liquidity, growth) -> dict:
    points = 0
    max_points = 0

    def add(condition, weight=1):
        nonlocal points, max_points
        max_points += weight
        if condition:
            points += weight

    # Valuation
    pe = valuation.get("pe_trailing")
    add(pe and pe < 25, 2)
    add(pe and pe < 15, 1)
    ev_ebitda = valuation.get("ev_to_ebitda")
    add(ev_ebitda and ev_ebitda < 15, 2)

    # Profitability
    roe = profitability.get("roe")
    add(roe and roe > 15, 2)
    net_margin = profitability.get("net_margin")
    add(net_margin and net_margin > 10, 2)
    op_margin = profitability.get("operating_margin")
    add(op_margin and op_margin > 15, 1)

    # Liquidity
    current = liquidity.get("current_ratio")
    add(current and current > 1.5, 2)
    de = liquidity.get("debt_to_equity")
    add(de and de < 100, 1)
    fcf = liquidity.get("free_cash_flow")
    add(fcf and fcf > 0, 2)

    # Growth
    rev_growth = growth.get("revenue_growth_yoy")
    add(rev_growth and rev_growth > 5, 2)
    eps_growth = growth.get("earnings_growth_yoy")
    add(eps_growth and eps_growth > 5, 2)

    raw = round((points / max_points) * 100) if max_points else 0
    return {"raw": raw, "points": points, "max_points": max_points}
