WEIGHTS = {
    "fundamental": 0.40,
    "technical": 0.35,
    "sentiment": 0.25,
}


def compute_composite(fundamental: dict, technical: dict, sentiment: dict) -> dict:
    f_score = fundamental.get("score", {}).get("raw", 50)
    t_score = technical.get("score", {}).get("raw", 50)
    s_score = sentiment.get("score", {}).get("raw", 50)

    composite = round(
        f_score * WEIGHTS["fundamental"]
        + t_score * WEIGHTS["technical"]
        + s_score * WEIGHTS["sentiment"],
        1,
    )

    return {
        "composite_score": composite,
        "breakdown": {
            "fundamental": f_score,
            "technical": t_score,
            "sentiment": s_score,
        },
        "weights": WEIGHTS,
        "verdict": _verdict(composite),
        "verdict_color": _verdict_color(composite),
        "confidence": _confidence(f_score, t_score, s_score),
    }


def _verdict(score: float) -> str:
    if score >= 75:
        return "Strong Buy"
    elif score >= 60:
        return "Buy"
    elif score >= 45:
        return "Hold"
    elif score >= 30:
        return "Sell"
    return "Strong Sell"


def _verdict_color(score: float) -> str:
    if score >= 75:
        return "#16a34a"   # green-700
    elif score >= 60:
        return "#22c55e"   # green-500
    elif score >= 45:
        return "#f59e0b"   # amber-500
    elif score >= 30:
        return "#ef4444"   # red-500
    return "#b91c1c"        # red-700


def _confidence(f, t, s) -> str:
    scores = [f, t, s]
    avg = sum(scores) / len(scores)
    spread = max(scores) - min(scores)
    if spread < 15:
        return "High"
    elif spread < 30:
        return "Medium"
    return "Low"
