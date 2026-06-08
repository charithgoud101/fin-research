"""
India-specific sentiment analysis via free RSS/web feeds.
Sources:
  - Google News RSS (company-specific query, 100 articles, India locale)
  - LiveMint RSS (filtered for symbol/name)
  - The Hindu BusinessLine RSS (filtered for symbol/name)
"""

import urllib.parse
import feedparser
import httpx

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _vader = SentimentIntensityAnalyzer()
    _USE_VADER = True
except ImportError:
    _USE_VADER = False

import cache

_client = httpx.Client(
    timeout=15,
    headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
    follow_redirects=True,
)

# Financial terms VADER doesn't weight highly enough
_BOOST = {
    "surge": 0.20, "rally": 0.15, "beat": 0.15, "record high": 0.25,
    "strong buy": 0.30, "upgrade": 0.20, "outperform": 0.20,
    "dividend": 0.10, "buyback": 0.15, "profit jump": 0.25,
    "quarterly profit": 0.15, "revenue growth": 0.15, "expansion": 0.12,
    "crashes": -0.25, "plunge": -0.25, "downgrade": -0.25,
    "miss ": -0.15, "misses": -0.20, "fraud": -0.40,
    "investigation": -0.20, "sebi action": -0.30, "penalty": -0.20,
    "fine": -0.15, "default": -0.35, "bankruptcy": -0.45,
    "losses widen": -0.25, "profit falls": -0.25, "revenue decline": -0.20,
    "drag": -0.10, "tumble": -0.20, "crash": -0.30,
}

_POSITIVE_KW = {
    "beat", "surge", "gain", "rise", "growth", "profit", "record",
    "upgrade", "strong", "exceed", "revenue", "rally", "outperform",
    "dividend", "buyback", "expansion", "high", "jump", "soar",
}
_NEGATIVE_KW = {
    "miss", "fall", "drop", "loss", "decline", "cut", "downgrade",
    "weak", "below", "concern", "risk", "crash", "plunge", "drag",
    "fraud", "penalty", "fine", "default", "bankruptcy", "tumble",
}


def _fetch_rss(url: str) -> list:
    """Fetch RSS via httpx and parse with feedparser (avoids SSL cert issues)."""
    try:
        r = _client.get(url, timeout=12)
        if r.status_code != 200:
            return []
        return feedparser.parse(r.text).entries
    except Exception:
        return []


def _score(text: str) -> float:
    """Compound sentiment score in [-1, 1]."""
    if not text:
        return 0.0
    if _USE_VADER:
        score = _vader.polarity_scores(text)["compound"]
    else:
        text_lower = text.lower()
        pos = sum(1 for w in _POSITIVE_KW if w in text_lower)
        neg = sum(1 for w in _NEGATIVE_KW if w in text_lower)
        score = (pos - neg) / max(pos + neg, 1) if (pos + neg) else 0.0

    text_lower = text.lower()
    for kw, boost in _BOOST.items():
        if kw in text_lower:
            score = max(-1.0, min(1.0, score + boost))
    return round(score, 4)


def _classify(s: float) -> str:
    if s > 0.05:
        return "positive"
    if s < -0.05:
        return "negative"
    return "neutral"


def _entry_to_item(entry, source_name: str) -> dict:
    title = entry.get("title", "").strip()
    if not title:
        return None
    sc = _score(title)
    return {
        "text": title,
        "source": source_name,
        "source_type": "news",
        "url": entry.get("link", ""),
        "published": entry.get("published", ""),
        "score": sc,
        "sentiment": _classify(sc),
        "upvotes": None,
        "comments": None,
    }


# ── Google News RSS (company-specific) ──────────────────────────────────────

def _google_news(query: str) -> list[dict]:
    encoded = urllib.parse.quote_plus(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"
    entries = _fetch_rss(url)
    results = []
    for e in entries[:20]:
        source_tag = e.get("source") or {}
        src_name = source_tag.get("title") if isinstance(source_tag, dict) else "Google News"
        item = _entry_to_item(e, src_name or "Google News")
        if item:
            results.append(item)
    return results


# ── LiveMint RSS (filter for symbol mentions) ───────────────────────────────

def _livemint(symbol: str, company_name: str) -> list[dict]:
    entries = _fetch_rss("https://www.livemint.com/rss/markets")
    sym_lower = symbol.lower()
    name_lower = company_name.lower() if company_name else ""
    results = []
    for e in entries:
        combined = (e.get("title", "") + " " + e.get("summary", "")).lower()
        if sym_lower in combined or (name_lower and name_lower in combined):
            item = _entry_to_item(e, "LiveMint")
            if item:
                results.append(item)
    return results[:8]


# ── Hindu BusinessLine RSS ───────────────────────────────────────────────────

def _hindu_bl(symbol: str, company_name: str) -> list[dict]:
    entries = _fetch_rss("https://www.thehindubusinessline.com/markets/?service=rss")
    sym_lower = symbol.lower()
    name_lower = company_name.lower() if company_name else ""
    results = []
    for e in entries:
        combined = (e.get("title", "") + " " + e.get("summary", "")).lower()
        if sym_lower in combined or (name_lower and name_lower in combined):
            item = _entry_to_item(e, "BusinessLine")
            if item:
                results.append(item)
    return results[:8]


# ── Main aggregation ─────────────────────────────────────────────────────────

def analyze(ticker: str, company_name: str = "") -> dict:
    """
    Scrape multi-source sentiment for an Indian stock.
    Returns a dict with headlines, scores, and a normalized 0–100 score.
    """
    symbol = ticker.replace(".NS", "").replace(".BO", "").upper()
    cache_key = f"india_sentiment_v2_{symbol}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    q1 = f"{symbol} NSE stock India"
    q2 = f"{company_name} stock NSE" if company_name else ""

    gn1 = _google_news(q1)
    gn2 = _google_news(q2) if q2 else []

    # Deduplicate gn2 against gn1 by URL
    seen = {h["url"] for h in gn1}
    gn2 = [h for h in gn2 if h["url"] not in seen]

    mint = _livemint(symbol, company_name)
    hbl = _hindu_bl(symbol, company_name)

    all_items = gn1 + gn2 + mint + hbl
    google_count = len(gn1) + len(gn2)
    supplementary_count = len(mint) + len(hbl)

    def avg_score(items):
        return round(sum(h["score"] for h in items) / len(items), 4) if items else 0.0

    gn_avg = avg_score(gn1 + gn2)
    supp_avg = avg_score(mint + hbl)

    if (gn1 or gn2) and (mint or hbl):
        overall = round(gn_avg * 0.75 + supp_avg * 0.25, 4)
    elif gn1 or gn2:
        overall = gn_avg
    else:
        overall = supp_avg

    total = len(all_items)
    bullish = sum(1 for h in all_items if h["score"] > 0.05)
    bearish = sum(1 for h in all_items if h["score"] < -0.05)
    neutral = total - bullish - bearish

    top = sorted(all_items, key=lambda h: abs(h["score"]), reverse=True)[:20]
    raw_score = round((overall + 1) / 2 * 100)

    result = {
        "source": "india_web",
        "total_items": total,
        "google_news_count": google_count,
        "supplementary_count": supplementary_count,
        "avg_compound": overall,
        "news_avg_compound": gn_avg,
        "supplementary_avg_compound": supp_avg,
        "bullish_count": bullish,
        "bearish_count": bearish,
        "neutral_count": neutral,
        "bullish_pct": round(bullish / total * 100, 1) if total else 0,
        "bearish_pct": round(bearish / total * 100, 1) if total else 0,
        "neutral_pct": round(neutral / total * 100, 1) if total else 0,
        "headlines": top,
        "score": {"raw": raw_score},
    }

    cache.set(cache_key, result, ttl=1800)
    return result
