# TradeCore

Production-ready market monitoring and trading-operations dashboard with guarded execution, technical BTCUSD signals, and loss-prevention alerts.

## Run & Operate

- `gunicorn --bind 0.0.0.0:${PORT:-8080} app:app` — run the production Flask server
- `python -m py_compile app.py tradecord2626/app.py` — validate Python syntax
- `pnpm --filter @workspace/tradecore run build` — build the React dashboard served by Flask when available
- `pnpm run typecheck` — typecheck the TypeScript workspace
- `pnpm run build` — typecheck and build all TypeScript packages
- Required Python packages are pinned in `requirements.txt`
- Optional `TRADECORE_DB_PATH` selects the SQLite file; default is `data/tradecore.sqlite`

## Stack

- Primary server: Flask 3 + Gunicorn
- Market providers: Binance with CoinGecko fallback and bounded retries
- Storage: SQLite for dashboard state and trade marks
- Frontend: React/Vite build with a standalone HTML fallback template
- Existing TypeScript API artifact remains available under `artifacts/api-server`

## Where things live

- `app.py` — production Flask entrypoint, market provider, indicators, signals, alerts, and API routes
- `templates/index.html` — standalone fallback market dashboard
- `artifacts/tradecore` — primary React/Vite dashboard
- `artifacts/api-server` — existing TypeScript API service
- `data/tradecore.sqlite` — local dashboard state
- `vercel.json` and `.replit` — deployment entrypoint configuration

## Architecture decisions

- Public market data is read-only and execution is guarded; no order is placed by the signal engine.
- Binance is preferred for live BTCUSDT candles and CoinGecko is used as a fallback.
- Technical trend analysis returns HOLD when historical candles are unavailable instead of inventing a prediction.
- Cached provider data is labeled as cached when all live providers fail.

## Product

TradeCore shows live BTCUSD/BTCUSDT market data, RSI/MACD/moving averages, directional trend signals, volatility and drawdown warnings, wallet/trade summaries, and guarded WhatsApp command handling.

## User preferences

The required WhatsApp control number is `+919050093930`, and the admin contact is `tradecord20@gmail.com`.

## Gotchas

- `PORT` is parsed and validated; the app binds to `0.0.0.0` for hosted environments.
- Build the React artifact before production startup if the polished React UI should be served instead of the fallback template.
- WhatsApp remains `not_configured` until Twilio credentials are supplied through secrets.

## Pointers

- Market API: `/api/market-data?symbol=BTCUSDT`
- Technical analysis: `/api/analysis/BTCUSDT`
- Signals: `/api/signals?symbol=BTCUSDT`
- Risk alerts: `/api/alerts?symbol=BTCUSDT`
- Health: `/api/healthz`