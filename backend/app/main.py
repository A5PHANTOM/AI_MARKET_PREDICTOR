import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse

from app.market import PriceCache, create_market_data_source, create_stream_router
from app.routes import chat_router, health_router, portfolio_router, watchlist_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_TICKERS = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "DOT", "LINK"]
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FinAlly Backend...")

    market_source = create_market_data_source(app.state.price_cache)
    app.state.market_source = market_source

    await market_source.start(DEFAULT_TICKERS)
    logger.info("Market data source started with %d tickers", len(DEFAULT_TICKERS))

    yield

    logger.info("Shutting down FinAlly Backend...")
    await market_source.stop()
    logger.info("Market data source stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="FinAlly Backend",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.state.price_cache = PriceCache()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    stream_router = create_stream_router(app.state.price_cache)
    app.include_router(stream_router)
    app.include_router(portfolio_router)
    app.include_router(watchlist_router)
    app.include_router(chat_router)
    app.include_router(health_router)

    if os.path.isdir(STATIC_DIR):
        @app.get("/{full_path:path}")
        async def serve_static(full_path: str):
            if full_path.startswith("api/"):
                return HTMLResponse("Not Found", status_code=404)
            file_path = Path(STATIC_DIR) / (full_path or "index.html")
            if file_path.is_file():
                return FileResponse(str(file_path))
            index_path = Path(STATIC_DIR) / "index.html"
            if index_path.is_file():
                return FileResponse(str(index_path))
            return HTMLResponse("Not Found", status_code=404)

        logger.info("Serving static files from %s", STATIC_DIR)
    else:
        logger.info("No static directory found at %s --- API only", STATIC_DIR)

    return app


app = create_app()
