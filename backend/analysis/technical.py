import pandas as pd
import numpy as np
from data import yfinance_client as yf_client, alphavantage_client as av_client


def _safe_float(val):
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _clean(obj):
    """Recursively convert numpy scalars to native Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) else float(obj)
    return obj


def analyze(ticker: str) -> dict:
    price_history = yf_client.get_price_history(ticker, period="1y")
    if not price_history:
        return {"error": "No price data available"}

    df = pd.DataFrame(price_history)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]

    # Moving averages
    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean()
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()

    # MACD
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line

    # RSI
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))

    # Bollinger Bands
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    bb_upper = bb_mid + 2 * bb_std
    bb_lower = bb_mid - 2 * bb_std

    # ATR
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs(),
    ], axis=1).max(axis=1)
    atr = tr.rolling(14).mean()

    # OBV
    obv = (np.sign(close.diff()) * volume).fillna(0).cumsum()

    # Support / Resistance (simple: recent 20-day high/low)
    support = low.rolling(20).min().iloc[-1]
    resistance = high.rolling(20).max().iloc[-1]

    # Current values
    cp = close.iloc[-1]
    latest = {
        "price": round(cp, 4),
        "sma20": round(sma20.iloc[-1], 4) if not np.isnan(sma20.iloc[-1]) else None,
        "sma50": round(sma50.iloc[-1], 4) if not np.isnan(sma50.iloc[-1]) else None,
        "sma200": round(sma200.iloc[-1], 4) if not np.isnan(sma200.iloc[-1]) else None,
        "rsi": round(rsi.iloc[-1], 2) if not np.isnan(rsi.iloc[-1]) else None,
        "macd": round(macd_line.iloc[-1], 4) if not np.isnan(macd_line.iloc[-1]) else None,
        "macd_signal": round(signal_line.iloc[-1], 4) if not np.isnan(signal_line.iloc[-1]) else None,
        "macd_hist": round(macd_hist.iloc[-1], 4) if not np.isnan(macd_hist.iloc[-1]) else None,
        "bb_upper": round(bb_upper.iloc[-1], 4) if not np.isnan(bb_upper.iloc[-1]) else None,
        "bb_mid": round(bb_mid.iloc[-1], 4) if not np.isnan(bb_mid.iloc[-1]) else None,
        "bb_lower": round(bb_lower.iloc[-1], 4) if not np.isnan(bb_lower.iloc[-1]) else None,
        "atr": round(atr.iloc[-1], 4) if not np.isnan(atr.iloc[-1]) else None,
        "obv": int(obv.iloc[-1]),
        "support": round(support, 4) if not np.isnan(support) else None,
        "resistance": round(resistance, 4) if not np.isnan(resistance) else None,
        "volume": int(volume.iloc[-1]),
        "avg_volume_20": int(volume.rolling(20).mean().iloc[-1]),
    }

    signals = _compute_signals(latest, close, macd_line, signal_line, rsi)
    score = _compute_technical_score(latest, signals)

    # Serialize price history for chart (last 252 trading days)
    chart_data = [
        {
            "date": str(row["date"].date()),
            "close": row["close"],
            "volume": row["volume"],
            "sma20": round(sma20.iloc[i], 4) if not np.isnan(sma20.iloc[i]) else None,
            "sma50": round(sma50.iloc[i], 4) if not np.isnan(sma50.iloc[i]) else None,
            "sma200": round(sma200.iloc[i], 4) if not np.isnan(sma200.iloc[i]) else None,
            "bb_upper": round(bb_upper.iloc[i], 4) if not np.isnan(bb_upper.iloc[i]) else None,
            "bb_lower": round(bb_lower.iloc[i], 4) if not np.isnan(bb_lower.iloc[i]) else None,
            "rsi": round(rsi.iloc[i], 2) if not np.isnan(rsi.iloc[i]) else None,
            "macd": round(macd_line.iloc[i], 4) if not np.isnan(macd_line.iloc[i]) else None,
            "macd_signal": round(signal_line.iloc[i], 4) if not np.isnan(signal_line.iloc[i]) else None,
        }
        for i, row in df.iterrows()
    ]

    return _clean({
        "indicators": latest,
        "signals": signals,
        "score": score,
        "chart_data": chart_data,
    })


def _compute_signals(latest, close, macd_line, signal_line, rsi) -> dict:
    cp = latest["price"]
    signals = {}

    # Trend signals
    signals["above_sma20"] = cp > latest["sma20"] if latest["sma20"] else None
    signals["above_sma50"] = cp > latest["sma50"] if latest["sma50"] else None
    signals["above_sma200"] = cp > latest["sma200"] if latest["sma200"] else None
    signals["golden_cross"] = (
        latest["sma50"] and latest["sma200"] and latest["sma50"] > latest["sma200"]
    )
    signals["death_cross"] = (
        latest["sma50"] and latest["sma200"] and latest["sma50"] < latest["sma200"]
    )

    # Momentum
    rsi_val = latest["rsi"]
    signals["rsi_oversold"] = rsi_val < 30 if rsi_val else None
    signals["rsi_overbought"] = rsi_val > 70 if rsi_val else None
    signals["rsi_neutral"] = 40 <= rsi_val <= 60 if rsi_val else None

    # MACD
    signals["macd_bullish"] = (
        latest["macd"] and latest["macd_signal"] and latest["macd"] > latest["macd_signal"]
    )
    signals["macd_bearish"] = (
        latest["macd"] and latest["macd_signal"] and latest["macd"] < latest["macd_signal"]
    )

    # Bollinger Band position
    if latest["bb_upper"] and latest["bb_lower"] and latest["bb_mid"]:
        bb_range = latest["bb_upper"] - latest["bb_lower"]
        bb_pos = (cp - latest["bb_lower"]) / bb_range if bb_range else 0.5
        signals["bb_position"] = round(bb_pos, 3)
        signals["bb_squeeze"] = bb_range < (latest["bb_mid"] * 0.04)
    else:
        signals["bb_position"] = None
        signals["bb_squeeze"] = None

    # Volume trend
    signals["volume_spike"] = latest["volume"] > latest["avg_volume_20"] * 1.5

    return signals


def _compute_technical_score(latest, signals) -> dict:
    points = 0
    max_points = 0

    def add(condition, weight=1):
        nonlocal points, max_points
        max_points += weight
        if condition:
            points += weight

    add(signals.get("above_sma200"), 2)
    add(signals.get("above_sma50"), 2)
    add(signals.get("above_sma20"), 1)
    add(signals.get("golden_cross"), 2)
    add(not signals.get("death_cross"), 1)
    add(signals.get("macd_bullish"), 2)

    rsi = latest.get("rsi")
    add(rsi and 40 <= rsi <= 70, 2)
    add(rsi and rsi < 30, 1)  # oversold = potential buy

    bb_pos = signals.get("bb_position")
    add(bb_pos and 0.3 <= bb_pos <= 0.7, 1)

    raw = round((points / max_points) * 100) if max_points else 0
    return {"raw": raw, "points": points, "max_points": max_points}
