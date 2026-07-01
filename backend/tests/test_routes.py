"""Tests for API routes."""

from collections.abc import AsyncGenerator

import httpx
import pytest
from fastapi import FastAPI
from httpx import ASGITransport


@pytest.fixture
async def client(test_app: FastAPI) -> AsyncGenerator[httpx.AsyncClient, None]:
    transport = ASGITransport(app=test_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"
    assert data["market_data_source"] == "TestMarketSource"


@pytest.mark.asyncio
async def test_get_empty_portfolio(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/portfolio")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cash_balance"] == 10000.0
    assert data["total_value"] == 10000.0
    assert data["positions"] == []
    assert data["unrealized_pnl"] == 0.0


@pytest.mark.asyncio
async def test_get_watchlist(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/watchlist")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 10
    tickers = [item["ticker"] for item in data]
    assert "BTC" in tickers
    assert "ETH" in tickers

    btc = next(item for item in data if item["ticker"] == "BTC")
    assert btc["price"] == 105000.0


@pytest.mark.asyncio
async def test_buy_trade(client: httpx.AsyncClient) -> None:
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 0.09, "side": "buy"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["ticker"] == "BTC"
    assert data["side"] == "buy"
    assert data["quantity"] == 0.09
    assert data["price"] == 105000.0

    resp = await client.get("/api/portfolio")
    data = resp.json()
    assert data["cash_balance"] == 10000.0 - 0.09 * 105000.0
    assert len(data["positions"]) == 1
    assert data["positions"][0]["ticker"] == "BTC"
    assert data["positions"][0]["quantity"] == 0.09
    assert data["positions"][0]["avg_cost"] == 105000.0


@pytest.mark.asyncio
async def test_sell_trade(client: httpx.AsyncClient) -> None:
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 0.09, "side": "buy"},
    )

    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 0.04, "side": "sell"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["side"] == "sell"

    resp = await client.get("/api/portfolio")
    data = resp.json()
    expected_cash = 10000.0 - (0.09 * 105000.0) + (0.04 * 105000.0)
    assert data["cash_balance"] == expected_cash
    assert len(data["positions"]) == 1
    assert data["positions"][0]["quantity"] == pytest.approx(0.05)


@pytest.mark.asyncio
async def test_sell_full_position_removes_it(client: httpx.AsyncClient) -> None:
    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 0.09, "side": "buy"},
    )

    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 0.09, "side": "sell"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    resp = await client.get("/api/portfolio")
    data = resp.json()
    assert data["positions"] == []
    assert data["cash_balance"] == 10000.0


@pytest.mark.asyncio
async def test_buy_insufficient_cash(client: httpx.AsyncClient) -> None:
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 100, "side": "buy"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert "Insufficient cash" in data["error"]


@pytest.mark.asyncio
async def test_sell_without_position(client: httpx.AsyncClient) -> None:
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 0.5, "side": "sell"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert "Insufficient shares" in data["error"]


@pytest.mark.asyncio
async def test_unknown_ticker_trade(client: httpx.AsyncClient) -> None:
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "UNKNOWN", "quantity": 1, "side": "buy"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_add_watchlist(client: httpx.AsyncClient) -> None:
    resp = await client.post("/api/watchlist", json={"ticker": "UNI"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["ticker"] == "UNI"
    assert data["added"] is True

    resp = await client.get("/api/watchlist")
    data = resp.json()
    tickers = [item["ticker"] for item in data]
    assert "UNI" in tickers
    assert len(tickers) == 11


@pytest.mark.asyncio
async def test_add_duplicate_watchlist(client: httpx.AsyncClient) -> None:
    await client.post("/api/watchlist", json={"ticker": "UNI"})
    resp = await client.post("/api/watchlist", json={"ticker": "UNI"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_remove_watchlist(client: httpx.AsyncClient) -> None:
    resp = await client.delete("/api/watchlist/BTC")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticker"] == "BTC"
    assert data["removed"] is True

    resp = await client.get("/api/watchlist")
    data = resp.json()
    tickers = [item["ticker"] for item in data]
    assert "BTC" not in tickers
    assert len(tickers) == 9


@pytest.mark.asyncio
async def test_remove_nonexistent_watchlist(client: httpx.AsyncClient) -> None:
    resp = await client.delete("/api/watchlist/NONEXIST")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_portfolio_history(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/portfolio/history")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

    await client.post(
        "/api/portfolio/trade",
        json={"ticker": "BTC", "quantity": 0.09, "side": "buy"},
    )

    resp = await client.get("/api/portfolio/history")
    data = resp.json()
    assert len(data) == 1
    assert "total_value" in data[0]
    assert "recorded_at" in data[0]


@pytest.mark.asyncio
async def test_chat_mock(client: httpx.AsyncClient) -> None:
    resp = await client.post("/api/chat", json={"message": "How is my portfolio doing?"})
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert "trades" in data
    assert isinstance(data["trades"], list)
    assert "watchlist_changes" in data
