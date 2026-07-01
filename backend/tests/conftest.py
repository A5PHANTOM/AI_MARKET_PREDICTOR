"""Pytest configuration and fixtures."""

import os
import tempfile

import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.market import PriceCache
from app.market.interface import MarketDataSource
from app.routes import chat_router, health_router, portfolio_router, watchlist_router


class TestMarketSource(MarketDataSource):
    def __init__(self) -> None:
        self._tickers: list[str] = []

    async def start(self, tickers: list[str]) -> None:
        self._tickers = list(tickers)

    async def stop(self) -> None:
        pass

    async def add_ticker(self, ticker: str) -> None:
        if ticker not in self._tickers:
            self._tickers.append(ticker)

    async def remove_ticker(self, ticker: str) -> None:
        if ticker in self._tickers:
            self._tickers.remove(ticker)

    def get_tickers(self) -> list[str]:
        return list(self._tickers)


@pytest.fixture
def event_loop_policy():
    import asyncio
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture
def db_path() -> str:
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = f.name
    yield path
    os.unlink(path)


@pytest.fixture
def test_app(db_path: str) -> FastAPI:
    os.environ["DB_PATH"] = db_path
    os.environ["LLM_MOCK"] = "true"

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.price_cache = PriceCache()
    app.state.market_source = TestMarketSource()

    app.state.price_cache.update("BTC", 105000.00)
    app.state.price_cache.update("ETH", 5500.00)
    app.state.price_cache.update("SOL", 180.00)
    app.state.price_cache.update("DOGE", 0.15)

    app.include_router(portfolio_router)
    app.include_router(watchlist_router)
    app.include_router(chat_router)
    app.include_router(health_router)
    return app
