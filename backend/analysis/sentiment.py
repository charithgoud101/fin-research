from data import finnhub_client, yfinance_client as yf_client
from data import india_sentiment as india_sent_module


def analyze(ticker: str) -> dict:
    is_indian = ticker.endswith(".NS") or ticker.endswith(".BO")
    if is_indian:
        return _analyze_india(ticker)
    return _analyze_us(ticker)


def _analyze_india(ticker: str) -> dict:
    info = yf_client.get_info(ticker)
    company_name = info.get("shortName") or info.get("longName") or ""

    india = india_sent_module.analyze(ticker, company_name=company_name)

    yf_analyst = {
        "recommendation": info.get("recommendationKey"),
        "recommendation_mean": info.get("recommendationMean"),
        "target_price_mean": info.get("targetMeanPrice"),
        "analyst_count": info.get("numberOfAnalystOpinions"),
    }

    return {
        "india_web_sentiment": india,
        "yf_analyst_summary": yf_analyst,
        "recent_headlines": india.get("headlines", [])[:12],
        "score": india.get("score", {"raw": 50}),
    }


def _analyze_us(ticker: str) -> dict:
    news_sentiment = finnhub_client.get_news_sentiment(ticker)
    rec_trends = finnhub_client.get_recommendation_trends(ticker)
    recent_news = finnhub_client.get_company_news(ticker, days=7)
    info = yf_client.get_info(ticker)

    sentiment_data = {}
    if isinstance(news_sentiment, dict):
        sentiment_data = {
            "buzz_score": news_sentiment.get("buzz", {}).get("buzz"),
            "articles_weekly": news_sentiment.get("buzz", {}).get("articlesInLastWeek"),
            "weekly_average": news_sentiment.get("buzz", {}).get("weeklyAverage"),
            "company_news_score": news_sentiment.get("companyNewsScore"),
            "sector_avg_bullish": news_sentiment.get("sectorAverageBullishPercent"),
            "sector_avg_score": news_sentiment.get("sectorAverageNewsScore"),
            "sentiment_score": news_sentiment.get("sentiment", {}).get("companyNewsScore"),
            "bearish_pct": news_sentiment.get("sentiment", {}).get("bearishPercent"),
            "bullish_pct": news_sentiment.get("sentiment", {}).get("bullishPercent"),
        }

    analyst_data = {}
    if rec_trends and isinstance(rec_trends, list):
        latest_rec = rec_trends[0]
        total = sum([
            latest_rec.get("strongBuy", 0),
            latest_rec.get("buy", 0),
            latest_rec.get("hold", 0),
            latest_rec.get("sell", 0),
            latest_rec.get("strongSell", 0),
        ])
        bullish_count = latest_rec.get("strongBuy", 0) + latest_rec.get("buy", 0)
        bearish_count = latest_rec.get("sell", 0) + latest_rec.get("strongSell", 0)

        analyst_data = {
            "period": latest_rec.get("period"),
            "strong_buy": latest_rec.get("strongBuy", 0),
            "buy": latest_rec.get("buy", 0),
            "hold": latest_rec.get("hold", 0),
            "sell": latest_rec.get("sell", 0),
            "strong_sell": latest_rec.get("strongSell", 0),
            "total": total,
            "bullish_pct": round(bullish_count / total * 100, 1) if total else None,
            "bearish_pct": round(bearish_count / total * 100, 1) if total else None,
            "consensus": _get_consensus(bullish_count, bearish_count, total),
        }

    yf_analyst = {
        "recommendation": info.get("recommendationKey"),
        "recommendation_mean": info.get("recommendationMean"),
        "target_price_mean": info.get("targetMeanPrice"),
        "analyst_count": info.get("numberOfAnalystOpinions"),
    }

    headlines = []
    if isinstance(recent_news, list):
        for item in recent_news[:10]:
            headlines.append({
                "text": item.get("headline"),
                "source": item.get("source"),
                "source_type": "news",
                "published": item.get("datetime"),
                "url": item.get("url"),
                "sentiment": _classify_headline(item.get("headline", "")),
                "score": 0,
            })

    score = _compute_sentiment_score(sentiment_data, analyst_data)

    return {
        "news_sentiment": sentiment_data,
        "analyst_recommendations": analyst_data,
        "yf_analyst_summary": yf_analyst,
        "recent_headlines": headlines,
        "score": score,
    }


def _get_consensus(bullish, bearish, total) -> str:
    if not total:
        return "N/A"
    bullish_pct = bullish / total
    bearish_pct = bearish / total
    if bullish_pct >= 0.6:
        return "Strong Buy"
    elif bullish_pct >= 0.4:
        return "Buy"
    elif bearish_pct >= 0.4:
        return "Sell"
    elif bearish_pct >= 0.6:
        return "Strong Sell"
    return "Hold"


def _classify_headline(headline: str) -> str:
    headline_lower = headline.lower()
    positive = ["beat", "surge", "gain", "rise", "growth", "profit", "record",
                 "upgrade", "strong", "positive", "exceed", "revenue", "up"]
    negative = ["miss", "fall", "drop", "loss", "decline", "cut", "downgrade",
                 "weak", "negative", "below", "concern", "risk", "down"]
    pos = sum(1 for w in positive if w in headline_lower)
    neg = sum(1 for w in negative if w in headline_lower)
    if pos > neg:
        return "positive"
    elif neg > pos:
        return "negative"
    return "neutral"


def _compute_sentiment_score(sentiment_data, analyst_data) -> dict:
    points = 0
    max_points = 0

    def add(condition, weight=1):
        nonlocal points, max_points
        max_points += weight
        if condition:
            points += weight

    bullish_pct = sentiment_data.get("bullish_pct")
    add(bullish_pct and bullish_pct > 0.5, 2)
    add(bullish_pct and bullish_pct > 0.65, 1)

    company_score = sentiment_data.get("company_news_score")
    add(company_score and company_score > 0.5, 2)

    analyst_bull = analyst_data.get("bullish_pct")
    add(analyst_bull and analyst_bull > 50, 2)
    add(analyst_bull and analyst_bull > 65, 1)

    consensus = analyst_data.get("consensus", "")
    add(consensus in ("Strong Buy", "Buy"), 2)

    raw = round((points / max_points) * 100) if max_points else 50
    return {"raw": raw, "points": points, "max_points": max_points}
