import httpx
import cache
from config import EDGAR_BASE

HEADERS = {"User-Agent": "FinResearchTool/1.0 charith.goud@gmail.com"}


def _get(url: str) -> dict:
    try:
        r = httpx.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception:
        return {}


def _get_cik(ticker: str) -> str | None:
    key = f"edgar_cik_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached

    try:
        r = httpx.get(
            "https://www.sec.gov/files/company_tickers.json",
            headers=HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        tickers_data = r.json()
        for entry in tickers_data.values():
            if entry.get("ticker", "").upper() == ticker.upper():
                cik = str(entry["cik_str"]).zfill(10)
                cache.set(key, cik)
                return cik
    except Exception:
        pass
    return None


def get_company_facts(ticker: str) -> dict:
    key = f"edgar_facts_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached

    cik = _get_cik(ticker)
    if not cik:
        return {"error": "CIK not found", "ticker": ticker}

    data = _get(f"{EDGAR_BASE}/api/xbrl/companyfacts/CIK{cik}.json")

    # Extract key GAAP facts
    us_gaap = data.get("facts", {}).get("us-gaap", {})
    key_concepts = [
        "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
        "NetIncomeLoss", "EarningsPerShareBasic", "EarningsPerShareDiluted",
        "Assets", "Liabilities", "StockholdersEquity",
        "OperatingIncomeLoss", "GrossProfit",
        "CashAndCashEquivalentsAtCarryingValue",
        "LongTermDebt", "CommonStockSharesOutstanding",
    ]

    result = {"cik": cik, "name": data.get("entityName"), "facts": {}}
    for concept in key_concepts:
        if concept in us_gaap:
            units = us_gaap[concept].get("units", {})
            usd_data = units.get("USD") or units.get("shares") or []
            # Keep only annual (10-K) filings, last 5
            annual = [
                e for e in usd_data
                if e.get("form") == "10-K"
            ][-5:]
            if annual:
                result["facts"][concept] = annual

    cache.set(key, result)
    return result


def get_recent_filings(ticker: str) -> list:
    key = f"edgar_filings_{ticker}"
    cached = cache.get(key)
    if cached:
        return cached

    cik = _get_cik(ticker)
    if not cik:
        return []

    data = _get(f"{EDGAR_BASE}/submissions/CIK{cik}.json")
    recent = data.get("filings", {}).get("recent", {})

    forms = recent.get("form", [])
    dates = recent.get("filingDate", [])
    descriptions = recent.get("primaryDocument", [])
    accessions = recent.get("accessionNumber", [])

    filings = []
    for i, form in enumerate(forms):
        if form in ("10-K", "10-Q", "8-K"):
            filings.append({
                "form": form,
                "date": dates[i] if i < len(dates) else None,
                "document": descriptions[i] if i < len(descriptions) else None,
                "accession": accessions[i] if i < len(accessions) else None,
            })
        if len(filings) >= 10:
            break

    cache.set(key, filings)
    return filings
