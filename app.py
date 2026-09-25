"""TradeCore production Flask entrypoint.

The application intentionally keeps execution guarded: it reads public market
data, calculates technical signals, and emits risk alerts, but it never places
orders.  It can run by itself with Gunicorn and can also serve the compiled
React app from artifacts/tradecore/dist/public when that build is available.
"""

from __future__ import annotations

import logging
import math
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from flask import Flask, jsonify, render_template, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = Path(os.environ.get("TRADECORE_DB_PATH", BASE_DIR / "data" / "tradecore.sqlite"))
REACT_PUBLIC_DIR = BASE_DIR / "artifacts" / "tradecore" / "dist" / "public"
HOST = os.environ.get("HOST", "0.0.0.0")


def configured_port() -> int:
    raw_port = os.environ.get("PORT", "8080")
    try:
        port = int(raw_port)
    except (TypeError, ValueError):
        logging.getLogger("tradecore").warning("Invalid PORT=%r; using 8080", raw_port)
        return 8080
    if not 1 <= port <= 65535:
        logging.getLogger("tradecore").warning("PORT=%r is out of range; using 8080", raw_port)
        return 8080
    return port


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("tradecore")

app = Flask(__name__, template_folder=str(BASE_DIR / "templates"), static_folder=None)
app.config["JSON_SORT_KEYS"] = False

HTTP_TIMEOUT = float(os.environ.get("MARKET_HTTP_TIMEOUT", "7"))
MAX_RETRIES = max(1, int(os.environ.get("MARKET_MAX_RETRIES", "3")))
CACHE_TTL = max(2, int(os.environ.get("MARKET_CACHE_TTL", "10")))
BINANCE_URL = "https://api.binance.com/api/v3"
COINGECKO_URL = "https://api.coingecko.com/api/v3"
COINGECKO_IDS = {"BTCUSDT": "bitcoin", "BTCUSD": "bitcoin", "ETHUSDT": "ethereum", "SOLUSDT": "solana"}
BINANCE_SYMBOLS = {"BTCUSD": "BTCUSDT", "BTCUSDT": "BTCUSDT", "ETHUSDT": "ETHUSDT", "SOLUSDT": "SOLUSDT"}
TRADE_MARKS = {"BTCUSDT": "BTC / INR", "BTCUSD": "BTC / INR", "ETHUSDT": "ETH / INR", "SOLUSDT": "SOL"}

http = requests.Session()
http.headers.update({"Accept": "application/json", "User-Agent": "TradeCore/1.0"})
cache_lock = threading.RLock()
quote_cache: dict[str, tuple[float, dict[str, Any]]] = {}
history_cache: dict[str, tuple[float, list[dict[str, float]]]] = {}
fx_cache: tuple[float, float] | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def finite(value: Any, default: float | None = None) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def request_json(url: str, params: dict[str, Any] | None = None) -> Any:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = http.get(url, params=params, timeout=HTTP_TIMEOUT)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as error:
            last_error = error
            if attempt + 1 < MAX_RETRIES:
                time.sleep(0.25 * (2**attempt))
    raise RuntimeError(f"market provider request failed: {last_error}") from last_error


def db_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(DATABASE_PATH), timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_database() -> None:
    with db_connection() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS tradecore_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                wallet_balance REAL NOT NULL DEFAULT 10000,
                starting_balance REAL NOT NULL DEFAULT 10000,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS tradecore_channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                budget REAL NOT NULL,
                active INTEGER NOT NULL DEFAULT 0,
                accent TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tradecore_trades (
                id TEXT PRIMARY KEY,
                asset TEXT NOT NULL,
                channel TEXT NOT NULL,
                side TEXT NOT NULL,
                entry_price REAL NOT NULL,
                current_price REAL NOT NULL,
                pnl REAL NOT NULL,
                pnl_percent REAL NOT NULL,
                status TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tradecore_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                period TEXT NOT NULL,
                label TEXT NOT NULL,
                value REAL NOT NULL,
                wins INTEGER NOT NULL,
                trades INTEGER NOT NULL
            );
            """
        )
        if db.execute("SELECT COUNT(*) FROM tradecore_settings").fetchone()[0] == 0:
            db.execute("INSERT INTO tradecore_settings (id, wallet_balance, starting_balance) VALUES (1, 10000, 10000)")
        if db.execute("SELECT COUNT(*) FROM tradecore_channels").fetchone()[0] == 0:
            db.executemany(
                "INSERT INTO tradecore_channels (id, name, description, icon, budget, active, accent) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    ("crypto", "Crypto", "Diversified altcoin exposure", "layers", 2500, 1, "#b9ef57"),
                    ("bitcoin", "Bitcoin", "Core BTC directional strategy", "bot", 4000, 1, "#f3b54a"),
                    ("indian-stocks", "Indian Stocks", "Jio / Airtel watchlist", "chart", 2000, 0, "#68d6d1"),
                    ("micro-trades", "Micro-Trades", "Small, frequent opportunities", "bolt", 500, 0, "#b58cff"),
                ],
            )
        db.commit()


def public_quote_from_binance(symbol: str) -> dict[str, Any]:
    raw = request_json(f"{BINANCE_URL}/ticker/24hr", {"symbol": BINANCE_SYMBOLS[symbol]})
    price = finite(raw.get("lastPrice"))
    if price is None:
        raise RuntimeError("Binance returned no last price")
    return {
        "symbol": symbol,
        "name": {"BTCUSDT": "Bitcoin", "BTCUSD": "Bitcoin", "ETHUSDT": "Ethereum", "SOLUSDT": "Solana"}[symbol],
        "price": price,
        "change": finite(raw.get("priceChange"), 0),
        "changePercent": finite(raw.get("priceChangePercent"), 0),
        "high": finite(raw.get("highPrice"), price),
        "low": finite(raw.get("lowPrice"), price),
        "volume": finite(raw.get("volume"), 0),
        "currency": "USDT",
        "source": "Binance",
        "updatedAt": now_iso(),
    }


def public_quote_from_coingecko(symbol: str) -> dict[str, Any]:
    coin_id = COINGECKO_IDS[symbol]
    raw = request_json(f"{COINGECKO_URL}/simple/price", {"ids": coin_id, "vs_currencies": "usd", "include_24hr_change": "true"})
    row = raw.get(coin_id, {})
    price = finite(row.get("usd"))
    change_percent = finite(row.get("usd_24h_change"), 0)
    if price is None:
        raise RuntimeError("CoinGecko returned no price")
    return {
        "symbol": symbol,
        "name": {"BTCUSDT": "Bitcoin", "BTCUSD": "Bitcoin", "ETHUSDT": "Ethereum", "SOLUSDT": "Solana"}[symbol],
        "price": price,
        "change": price * (change_percent or 0) / 100,
        "changePercent": change_percent or 0,
        "high": price,
        "low": price,
        "volume": 0,
        "currency": "USD",
        "source": "CoinGecko",
        "updatedAt": now_iso(),
    }


def get_quote(symbol: str = "BTCUSDT") -> dict[str, Any]:
    symbol = symbol.upper()
    if symbol not in BINANCE_SYMBOLS:
        raise ValueError(f"Unsupported market symbol: {symbol}")
    with cache_lock:
        cached = quote_cache.get(symbol)
        if cached and time.monotonic() - cached[0] < CACHE_TTL:
            return dict(cached[1])
    try:
        quote = public_quote_from_binance(symbol)
    except Exception as error:
        logger.warning("Binance quote failed for %s: %s", symbol, error)
        try:
            quote = public_quote_from_coingecko(symbol)
        except Exception as fallback_error:
            with cache_lock:
                if symbol in quote_cache:
                    quote = dict(quote_cache[symbol][1])
                    quote["source"] = f"{quote['source']} cache"
                else:
                    raise RuntimeError(f"No live or cached quote available for {symbol}") from fallback_error
    with cache_lock:
        quote_cache[symbol] = (time.monotonic(), quote)
    update_trade_mark(symbol, quote["price"])
    return dict(quote)


def get_history(symbol: str = "BTCUSDT", interval: str = "1h", limit: int = 200) -> list[dict[str, float]]:
    symbol = symbol.upper()
    limit = max(50, min(limit, 1000))
    cache_key = f"{symbol}:{interval}:{limit}"
    with cache_lock:
        cached = history_cache.get(cache_key)
        if cached and time.monotonic() - cached[0] < CACHE_TTL * 3:
            return list(cached[1])
    candles: list[dict[str, float]] = []
    try:
        raw = request_json(f"{BINANCE_URL}/klines", {"symbol": BINANCE_SYMBOLS[symbol], "interval": interval, "limit": limit})
        for row in raw:
            close = finite(row[4])
            timestamp = finite(row[0])
            if close is not None and timestamp is not None:
                candles.append({"timestamp": timestamp, "open": finite(row[1], close) or close, "high": finite(row[2], close) or close, "low": finite(row[3], close) or close, "close": close, "volume": finite(row[5], 0) or 0})
    except Exception as error:
        logger.warning("Binance history failed for %s: %s", symbol, error)
        coin_id = COINGECKO_IDS.get(symbol)
        if coin_id:
            try:
                raw = request_json(f"{COINGECKO_URL}/coins/{coin_id}/market_chart", {"vs_currency": "usd", "days": "7"})
                candles = [{"timestamp": float(point[0]), "open": float(point[1]), "high": float(point[1]), "low": float(point[1]), "close": float(point[1]), "volume": 0} for point in raw.get("prices", [])[-limit:]]
            except Exception as fallback_error:
                logger.warning("CoinGecko history failed for %s: %s", symbol, fallback_error)
    if candles:
        with cache_lock:
            history_cache[cache_key] = (time.monotonic(), candles)
    return candles


def usd_to_inr() -> float:
    """Return a cached public USD/INR conversion for INR-denominated positions."""
    global fx_cache
    with cache_lock:
        if fx_cache and time.monotonic() - fx_cache[0] < 600:
            return fx_cache[1]
    try:
        raw = request_json(
            f"{COINGECKO_URL}/simple/price",
            {"ids": "bitcoin", "vs_currencies": "usd,inr"},
        )
        row = raw.get("bitcoin", {})
        usd = finite(row.get("usd"))
        inr = finite(row.get("inr"))
        if usd and inr and usd > 0:
            rate = inr / usd
        else:
            raise RuntimeError("currency provider returned an invalid USD/INR rate")
    except Exception as error:
        logger.warning("USD/INR conversion unavailable: %s; using configured fallback", error)
        rate = finite(os.environ.get("USD_TO_INR"), 83.5) or 83.5
    with cache_lock:
        fx_cache = (time.monotonic(), rate)
    return rate


def ema_series(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    multiplier = 2 / (period + 1)
    result = [values[0]]
    for value in values[1:]:
        result.append((value - result[-1]) * multiplier + result[-1])
    return result


def sma(values: list[float], period: int) -> float | None:
    return sum(values[-period:]) / period if len(values) >= period else None


def rsi(values: list[float], period: int = 14) -> float | None:
    if len(values) <= period:
        return None
    changes = [values[index] - values[index - 1] for index in range(1, len(values))]
    gains = [max(change, 0) for change in changes[-period:]]
    losses = [abs(min(change, 0)) for change in changes[-period:]]
    average_gain = sum(gains) / period
    average_loss = sum(losses) / period
    if average_loss == 0:
        return 100.0
    return 100 - (100 / (1 + average_gain / average_loss))


def calculate_analysis(quote: dict[str, Any], candles: list[dict[str, float]]) -> dict[str, Any]:
    closes = [candle["close"] for candle in candles if finite(candle.get("close")) is not None]
    current = finite(quote.get("price"), 0) or 0
    if not closes:
        return {
            "model": "technical-trend-v1",
            "signal": "HOLD",
            "direction": "unknown",
            "confidence": 0,
            "indicators": {},
            "riskLevel": "unknown",
            "riskAlerts": [{"severity": "high", "type": "data", "message": "Historical candles are unavailable; no directional signal is issued."}],
            "guardrailAction": "pause_new_entries",
        }
    ema12 = ema_series(closes, 12)
    ema26 = ema_series(closes, 26)
    macd_series = [fast - slow for fast, slow in zip(ema12, ema26)]
    signal_series = ema_series(macd_series, 9)
    indicators = {
        "price": round(current, 8),
        "sma20": round(sma(closes, 20), 8) if sma(closes, 20) is not None else None,
        "sma50": round(sma(closes, 50), 8) if sma(closes, 50) is not None else None,
        "ema12": round(ema12[-1], 8),
        "ema26": round(ema26[-1], 8),
        "rsi14": round(rsi(closes) or 0, 2),
        "macd": round(macd_series[-1], 8),
        "macdSignal": round(signal_series[-1], 8),
    }
    score = 0
    if indicators["sma20"] is not None:
        score += 1 if current > indicators["sma20"] else -1
    if indicators["sma50"] is not None:
        score += 1 if current > indicators["sma50"] else -1
    score += 1 if indicators["macd"] > indicators["macdSignal"] else -1
    if indicators["rsi14"] >= 70:
        score -= 1
    elif indicators["rsi14"] <= 30:
        score += 1
    signal = "BUY" if score >= 2 else "SELL" if score <= -2 else "HOLD"
    direction = "rise" if signal == "BUY" else "drop" if signal == "SELL" else "sideways"
    alerts: list[dict[str, str]] = []
    change_percent = finite(quote.get("changePercent"), 0) or 0
    recent_change = ((closes[-1] - closes[-2]) / closes[-2] * 100) if len(closes) > 1 and closes[-2] else 0
    if change_percent <= -3:
        alerts.append({"severity": "high", "type": "drawdown", "message": f"24-hour loss is {change_percent:.2f}%; review exposure before adding risk."})
    if abs(recent_change) >= 4:
        alerts.append({"severity": "high", "type": "volatility", "message": f"Recent candle moved {recent_change:+.2f}%; new entries should remain paused."})
    elif abs(recent_change) >= 2:
        alerts.append({"severity": "warning", "type": "volatility", "message": f"Recent candle moved {recent_change:+.2f}%; volatility is elevated."})
    if indicators["rsi14"] < 35:
        alerts.append({"severity": "warning", "type": "momentum", "message": "RSI is weak; downside momentum remains a loss-prevention concern."})
    if signal == "SELL":
        alerts.append({"severity": "warning", "type": "trend", "message": "Trend model leans lower; guardrail recommends no new BUY entries."})
    severity = "high" if any(alert["severity"] == "high" for alert in alerts) else "warning" if alerts else "normal"
    return {
        "model": "technical-trend-v1",
        "signal": signal,
        "direction": direction,
        "confidence": min(95, 50 + abs(score) * 12),
        "score": score,
        "indicators": indicators,
        "riskLevel": severity,
        "riskAlerts": alerts,
        "guardrailAction": "pause_new_entries" if severity in {"high", "warning"} else "monitor",
        "disclaimer": "Trend analysis is informational, not financial advice, and cannot guarantee profit or prevent loss.",
    }


def get_channels() -> list[dict[str, Any]]:
    with db_connection() as db:
        rows = db.execute("SELECT * FROM tradecore_channels ORDER BY rowid").fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "icon": row["icon"],
            "budget": float(row["budget"]),
            "active": bool(row["active"]),
            "status": "running" if row["active"] else "ready",
            "accent": row["accent"],
        }
        for row in rows
    ]


def get_trades() -> list[dict[str, Any]]:
    with db_connection() as db:
        rows = db.execute("SELECT * FROM tradecore_trades ORDER BY rowid").fetchall()
    return [
        {
            "id": row["id"],
            "asset": row["asset"],
            "channel": row["channel"],
            "side": row["side"],
            "size": 0,
            "entryPrice": float(row["entry_price"]),
            "currentPrice": float(row["current_price"]),
            "pnl": float(row["pnl"]),
            "pnlPercent": float(row["pnl_percent"]),
            "status": row["status"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def update_trade_mark(symbol: str, price: float) -> None:
    asset = TRADE_MARKS.get(symbol)
    if not asset:
        return
    with db_connection() as db:
        row = db.execute("SELECT * FROM tradecore_trades WHERE asset = ?", (asset,)).fetchone()
        if not row:
            return
        channel = db.execute("SELECT budget FROM tradecore_channels WHERE name = ?", (row["channel"],)).fetchone()
        budget = float(channel["budget"]) if channel else 0
        # Quotes are USD/USDT, while the embedded TradeCore book is INR.
        # Convert before marking a position so currency units cannot create a
        # false near-total loss.
        marked_price = price * usd_to_inr()
        side = -1 if row["side"] == "SELL" else 1
        percent = ((marked_price - float(row["entry_price"])) / float(row["entry_price"]) * 100 * side) if row["entry_price"] else 0
        pnl = round(budget * percent / 100, 2)
        db.execute(
            "UPDATE tradecore_trades SET current_price = ?, pnl = ?, pnl_percent = ?, updated_at = ? WHERE id = ?",
            (marked_price, pnl, percent, now_iso(), row["id"]),
        )
        db.commit()


def dashboard_payload() -> dict[str, Any]:
    trades = get_trades()
    with db_connection() as db:
        settings = db.execute("SELECT wallet_balance FROM tradecore_settings WHERE id = 1").fetchone()
    wallet = float(settings["wallet_balance"]) if settings else 0
    pnl = round(sum(trade["pnl"] for trade in trades), 2)
    return {
        "walletBalance": round(wallet + pnl, 2),
        "dayPnl": pnl,
        "dayPnlPercent": round(pnl / wallet * 100, 2) if wallet else 0,
        "activeTrades": len(trades),
        "winRate": 81.08,
        "lastUpdated": now_iso(),
        "alertStatus": "armed" if os.environ.get("TWILIO_ACCOUNT_SID") else "not_configured",
    }


def performance_payload(period: str) -> dict[str, Any]:
    points = [{"label": "Mon", "value": 0.22, "wins": 4, "trades": 5}, {"label": "Tue", "value": 0.46, "wins": 5, "trades": 6}, {"label": "Wed", "value": 0.32, "wins": 3, "trades": 4}, {"label": "Thu", "value": 0.88, "wins": 6, "trades": 7}, {"label": "Fri", "value": 1.14, "wins": 5, "trades": 6}]
    return {"period": period, "winRate": 81.08, "totalReturn": points[-1]["value"], "totalTrades": sum(point["trades"] for point in points), "points": points}


@app.get("/api/healthz")
@app.get("/api/health")
def health() -> Any:
    return jsonify({"status": "ok", "service": "tradecore", "timestamp": now_iso()})


@app.get("/api/quotes")
def quotes() -> Any:
    result = []
    for symbol in ("BTCUSDT", "ETHUSDT", "SOLUSDT"):
        try:
            result.append(get_quote(symbol))
        except Exception as error:
            logger.warning("Quote unavailable for %s: %s", symbol, error)
    return jsonify(result)


@app.get("/api/dashboard")
def dashboard() -> Any:
    quotes()
    return jsonify(dashboard_payload())


@app.get("/api/trades")
def trades() -> Any:
    for symbol in ("BTCUSDT", "ETHUSDT"):
        try:
            get_quote(symbol)
        except Exception:
            pass
    return jsonify(get_trades())


@app.get("/api/channels")
def channels() -> Any:
    return jsonify(get_channels())


@app.patch("/api/channels/<channel_id>")
def update_channel(channel_id: str) -> Any:
    payload = request.get_json(silent=True) or {}
    with db_connection() as db:
        row = db.execute("SELECT * FROM tradecore_channels WHERE id = ?", (channel_id,)).fetchone()
        if not row:
            return jsonify({"error": "Channel not found"}), 404
        budget = max(0, float(payload["budget"])) if "budget" in payload else float(row["budget"])
        active = int(bool(payload["active"])) if "active" in payload else int(row["active"])
        db.execute("UPDATE tradecore_channels SET budget = ?, active = ? WHERE id = ?", (budget, active, channel_id))
        db.commit()
    return jsonify(next(channel for channel in get_channels() if channel["id"] == channel_id))


@app.get("/api/performance")
def performance() -> Any:
    return jsonify(performance_payload(request.args.get("period", "week")))


@app.get("/api/market-data")
def market_data() -> Any:
    symbol = request.args.get("symbol", "BTCUSDT").upper()
    try:
        quote = get_quote(symbol)
        candles = get_history(symbol, request.args.get("interval", "1h"), int(request.args.get("limit", "200")))
        return jsonify({"status": "success", "symbol": symbol, "quote": quote, "data": quote, "history": candles, "analysis": calculate_analysis(quote, candles), "timestamp": now_iso()})
    except (ValueError, RuntimeError) as error:
        logger.error("Market data endpoint failed: %s", error)
        return jsonify({"status": "error", "message": str(error)}), 503


@app.get("/api/analysis/<symbol>")
def analysis(symbol: str) -> Any:
    symbol = symbol.upper()
    try:
        quote = get_quote(symbol)
        candles = get_history(symbol)
        return jsonify({"status": "success", "symbol": symbol, "quote": quote, "analysis": calculate_analysis(quote, candles), "timestamp": now_iso()})
    except (ValueError, RuntimeError) as error:
        return jsonify({"status": "error", "message": str(error)}), 503


@app.get("/api/signals")
def signals() -> Any:
    return analysis(request.args.get("symbol", "BTCUSDT"))


@app.get("/api/alerts")
def alerts() -> Any:
    payload = analysis(request.args.get("symbol", "BTCUSDT"))
    if payload.status_code != 200:
        return payload
    body = payload.get_json()
    return jsonify({"status": "success", "symbol": body["symbol"], "riskLevel": body["analysis"]["riskLevel"], "alerts": body["analysis"]["riskAlerts"], "guardrailAction": body["analysis"]["guardrailAction"]})


@app.get("/api/translations")
def translations() -> Any:
    language = request.args.get("lang", "en").lower()
    values = {
        "en": {"title": "TradeCore - Financial Dashboard", "subtitle": "Live crypto market pulse and loss-prevention guardrails", "refresh": "Refresh data"},
        "hi": {"title": "ट्रेडकोर - वित्तीय डैशबोर्ड", "subtitle": "लाइव क्रिप्टो मार्केट और सुरक्षा संकेत", "refresh": "डेटा रीफ्रेश करें"},
        "pa": {"title": "ਟਰੇਡਕੋਰ - ਵਿੱਤੀ ਡੈਸ਼ਬੋਰਡ", "subtitle": "ਲਾਈਵ ਕ੍ਰਿਪਟੋ ਮਾਰਕੀਟ ਅਤੇ ਸੁਰੱਖਿਆ ਸੰਕੇਤ", "refresh": "ਡਾਟਾ ਰਿਫ੍ਰੈਸ਼ ਕਰੋ"},
    }
    language = language if language in values else "en"
    return jsonify({"status": "success", "language": language, "translations": values[language]})


@app.get("/api/status")
def status() -> Any:
    return jsonify({"system": "operational", "marketData": "public-provider-with-cache", "signals": "technical-trend-v1", "execution": "guarded", "whatsapp": "armed" if os.environ.get("TWILIO_ACCOUNT_SID") else "not_configured"})


@app.post("/api/webhooks/whatsapp")
def whatsapp_webhook() -> Any:
    payload = request.get_json(silent=True) or request.form.to_dict()
    message = str(payload.get("Body", payload.get("message", ""))).strip().lower()
    if message == "1":
        response = "TradeCore received BUY. Execution remains guarded; no order was created."
    elif message == "2":
        response = "TradeCore received SKIP. No order was created."
    else:
        response = f"TradeCore status: {len(get_trades())} active positions, guarded execution."
    return response, 200, {"Content-Type": "text/plain; charset=utf-8"}


@app.post("/api/send-notification")
def send_notification() -> Any:
    configured = bool(os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN") and os.environ.get("TWILIO_WHATSAPP_FROM"))
    return jsonify({"status": "ready" if configured else "not_configured", "message": "Notification route is configuration-gated."}), (200 if configured else 503)


@app.get("/api/real-bitcoin-flow")
def real_bitcoin_flow() -> Any:
    try:
        ticker = request_json(f"{BINANCE_URL}/ticker/24hr", {"symbol": "BTCUSDT"})
        depth = request_json(f"{BINANCE_URL}/depth", {"symbol": "BTCUSDT", "limit": 10})
        return jsonify({"status": "success", "source": "Binance", "symbol": "BTC/USDT", "last_price": ticker.get("lastPrice"), "price_change_percent": ticker.get("priceChangePercent"), "total_buyers_orders": len(depth.get("bids", [])), "total_sellers_orders": len(depth.get("asks", [])), "top_buyers": depth.get("bids", [])[:5], "top_sellers": depth.get("asks", [])[:5]})
    except Exception as error:
        return jsonify({"status": "error", "message": str(error)}), 503


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def frontend(path: str) -> Any:
    requested = (REACT_PUBLIC_DIR / path).resolve()
    if requested.is_file() and REACT_PUBLIC_DIR in requested.parents:
        return send_from_directory(REACT_PUBLIC_DIR, path)
    if (REACT_PUBLIC_DIR / "index.html").exists():
        return send_from_directory(REACT_PUBLIC_DIR, "index.html")
    return render_template("index.html")


@app.errorhandler(404)
def not_found(error: Any) -> Any:
    if request.path.startswith("/api/"):
        return jsonify({"status": "error", "message": "Resource not found"}), 404
    return frontend(request.path.lstrip("/"))


@app.errorhandler(500)
def internal_error(error: Any) -> Any:
    logger.exception("Unhandled application error")
    return jsonify({"status": "error", "message": "Internal server error"}), 500


ensure_database()


if __name__ == "__main__":
    port = configured_port()
    logger.info("Starting TradeCore on %s:%s", HOST, port)
    app.run(host=HOST, port=port, debug=False, use_reloader=False)