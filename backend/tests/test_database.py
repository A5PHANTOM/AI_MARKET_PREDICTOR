"""Tests for database initialization and CRUD operations."""

import os
import uuid

import pytest

from app.database import get_db


@pytest.mark.asyncio
async def test_db_initialization_creates_tables(db_path: str) -> None:
    os.environ["DB_PATH"] = db_path
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = {row["name"] for row in await cursor.fetchall()}
    assert "users_profile" in tables
    assert "watchlist" in tables
    assert "positions" in tables
    assert "trades" in tables
    assert "portfolio_snapshots" in tables
    assert "chat_messages" in tables


@pytest.mark.asyncio
async def test_seed_user_exists(db_path: str) -> None:
    os.environ["DB_PATH"] = db_path
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, cash_balance FROM users_profile WHERE id = 'default'"
        )
        row = await cursor.fetchone()
    assert row is not None
    assert row["id"] == "default"
    assert row["cash_balance"] == 10000.0


@pytest.mark.asyncio
async def test_seed_watchlist_has_ten_tickers(db_path: str) -> None:
    os.environ["DB_PATH"] = db_path
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT ticker FROM watchlist WHERE user_id = 'default' ORDER BY ticker"
        )
        tickers = [row["ticker"] for row in await cursor.fetchall()]
    assert len(tickers) == 10
    assert "BTC" in tickers
    assert "ETH" in tickers
    assert "SOL" in tickers
    assert "XRP" in tickers
    assert "BNB" in tickers
    assert "DOGE" in tickers
    assert "ADA" in tickers
    assert "AVAX" in tickers
    assert "DOT" in tickers
    assert "LINK" in tickers


@pytest.mark.asyncio
async def test_insert_and_retrieve_trade(db_path: str) -> None:
    os.environ["DB_PATH"] = db_path
    async with get_db() as db:
        trade_id = uuid.uuid4().hex
        await db.execute(
            "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) "
            "VALUES (?, 'default', 'BTC', 'buy', 0.5, 105000.0, '2025-01-01T00:00:00')",
            (trade_id,),
        )
        await db.commit()

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT side, quantity, price FROM trades WHERE id = ?", (trade_id,)
        )
        row = await cursor.fetchone()
    assert row is not None
    assert row["side"] == "buy"
    assert row["quantity"] == 0.5
    assert row["price"] == 105000.0


@pytest.mark.asyncio
async def test_insert_and_retrieve_position(db_path: str) -> None:
    os.environ["DB_PATH"] = db_path
    position_id = uuid.uuid4().hex
    async with get_db() as db:
        await db.execute(
            "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) "
            "VALUES (?, 'default', 'BTC', 0.5, 105000.0, '2025-01-01T00:00:00')",
            (position_id,),
        )
        await db.commit()

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT quantity, avg_cost FROM positions WHERE id = ?", (position_id,)
        )
        row = await cursor.fetchone()
    assert row is not None
    assert row["quantity"] == 0.5
    assert row["avg_cost"] == 105000.0


@pytest.mark.asyncio
async def test_unique_watchlist_constraint(db_path: str) -> None:
    os.environ["DB_PATH"] = db_path
    async with get_db() as db:
        wid = uuid.uuid4().hex
        await db.execute(
            "INSERT INTO watchlist (id, user_id, ticker, added_at) "
            "VALUES (?, 'default', 'TEST', '2025-01-01T00:00:00')",
            (wid,),
        )
        await db.commit()

    with pytest.raises(Exception):
        async with get_db() as db:
            wid2 = uuid.uuid4().hex
            await db.execute(
                "INSERT INTO watchlist (id, user_id, ticker, added_at) "
                "VALUES (?, 'default', 'TEST', '2025-01-01T00:00:00')",
                (wid2,),
            )
            await db.commit()
