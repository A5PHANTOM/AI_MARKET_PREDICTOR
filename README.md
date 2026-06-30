# FinAlly — AI Trading Workstation

A visually stunning AI-powered trading workstation that streams live market data, simulates portfolio trading, and integrates an LLM chat assistant that can analyze positions and execute trades via natural language.

Built entirely by coding agents as a capstone project for an agentic AI coding course.

## Features

- **Live price streaming** via SSE with green/red flash animations
- **Simulated portfolio** — $10k virtual cash, market orders, instant fills
- **Portfolio visualizations** — heatmap (treemap), P&L chart, positions table
- **AI chat assistant** — analyzes holdings, suggests and auto-executes trades
- **Watchlist management** — track tickers manually or via AI
- **Dark terminal aesthetic** — Bloomberg-inspired, data-dense layout

## Architecture

Single Docker container serving everything on port 8000:

- **Frontend**: Next.js (static export) with TypeScript, Tailwind CSS, lightweight-charts
- **Backend**: FastAPI (Python/uv) with SSE streaming
- **Database**: SQLite with lazy initialization
- **AI**: LiteLLM → OpenRouter (Cerebras inference) with structured outputs
- **Market data**: Built-in GBM simulator (default) or Massive API (optional)

## Quick Start

```bash
# Clone and configure
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env

# Run with Docker
docker build -t finally .
docker run -v finally-data:/app/db -p 8000:8000 --env-file .env finally

# Open http://localhost:8000
```

Or use the included script:
```bash
./scripts/start_mac.sh
```

### Development (no Docker)

**Terminal 1 — Backend:**
```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend (with hot reload):**
```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:3002, proxies /api/* to backend on port 8000
```

Or just use port 8000 without hot reload:
```bash
cd frontend && npm run build && cp -r out/ ../backend/static/
# Then open http://localhost:8000 (served by the backend)
```

## Project Structure

```
finally/
├── frontend/          # Next.js static export (TypeScript, Tailwind)
│   ├── src/
│   │   ├── app/       # Next.js app router pages
│   │   ├── components/ # React components (Watchlist, Chart, Chat, etc.)
│   │   └── lib/       # API client, SSE manager, types, utils
│   └── next.config.js
├── backend/           # FastAPI uv project (Python)
│   ├── app/
│   │   ├── market/    # Market data subsystem (simulator + Massive API)
│   │   ├── routes/    # API routes (portfolio, watchlist, chat, health)
│   │   ├── database.py # Async SQLite with lazy init
│   │   ├── llm.py     # LiteLLM/OpenRouter integration
│   │   └── main.py    # FastAPI app factory
│   └── tests/         # Pytest suite (94 tests)
├── planning/          # Project documentation and agent contracts
├── test/              # Playwright E2E tests (docker-compose)
├── db/                # SQLite volume mount (runtime, gitignored)
├── scripts/           # Start/stop helpers (macOS + Windows)
├── Dockerfile         # Multi-stage build (Node → Python)
└── docker-compose.yml # Development convenience wrapper
```

## Build Status

| Component | Status |
|-----------|--------|
| Market data (GBM simulator + Massive API) | ✅ Complete (73 tests) |
| Database (SQLite, lazy init, 6 tables) | ✅ Complete |
| REST API (portfolio, trades, watchlist, chat) | ✅ Complete |
| SSE streaming | ✅ Complete |
| LLM integration (OpenRouter + mock mode) | ✅ Complete |
| Frontend (Next.js static export) | ✅ Complete |
| Docker (multi-stage build) | ✅ Complete |
| E2E test infrastructure | ✅ Scaffolded |
| Backend tests | 94/94 passing |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for AI chat |
| `MASSIVE_API_KEY` | No | Massive (Polygon.io) key for real market data; omit to use simulator |
| `LLM_MOCK` | No | Set `true` for deterministic mock LLM responses (testing) |
| `DB_PATH` | No | Path to SQLite database (default: `db/finally.db`) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stream/prices` | SSE stream of live price updates |
| GET | `/api/portfolio` | Current positions, cash, total value, P&L |
| POST | `/api/portfolio/trade` | Execute a trade `{ticker, quantity, side}` |
| GET | `/api/portfolio/history` | Portfolio value snapshots over time |
| GET | `/api/watchlist` | Watchlist tickers with live prices |
| POST | `/api/watchlist` | Add a ticker `{ticker}` |
| DELETE | `/api/watchlist/{ticker}` | Remove a ticker |
| POST | `/api/chat` | Send a message to the AI assistant |

## License

See [LICENSE](LICENSE).
