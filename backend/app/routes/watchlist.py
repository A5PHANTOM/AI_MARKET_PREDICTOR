import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.database import get_db
from app.market import MarketDataSource, PriceCache
from app.models import AddWatchlistRequest, WatchlistItemResponse

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


def _get_price_cache(request: Request) -> PriceCache:
    return request.app.state.price_cache


@router.get("", response_model=list[WatchlistItemResponse])
async def get_watchlist(request: Request):
    price_cache = _get_price_cache(request)
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT ticker FROM watchlist WHERE user_id = 'default' ORDER BY added_at ASC"
        )
        rows = await cursor.fetchall()

    items = []
    for row in rows:
        ticker = row["ticker"]
        update = price_cache.get(ticker)
        items.append(WatchlistItemResponse(
            ticker=ticker,
            price=update.price if update else None,
            change=update.change if update else None,
            change_percent=update.change_percent if update else None,
        ))
    return items


@router.post("", status_code=201)
async def add_to_watchlist(request: Request, body: AddWatchlistRequest):
    ticker = body.ticker.upper()
    market_source: MarketDataSource = request.app.state.market_source

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id FROM watchlist WHERE user_id = 'default' AND ticker = ?",
            (ticker,),
        )
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(status_code=409, detail=f"Ticker '{ticker}' already in watchlist")

        wid = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, 'default', ?, ?)",
            (wid, ticker, now),
        )
        await db.commit()

    await market_source.add_ticker(ticker)
    return {"ticker": ticker, "added": True}


@router.delete("/{ticker}", status_code=200)
async def remove_from_watchlist(request: Request, ticker: str):
    ticker = ticker.upper()
    market_source: MarketDataSource = request.app.state.market_source

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id FROM watchlist WHERE user_id = 'default' AND ticker = ?",
            (ticker,),
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not in watchlist")

        await db.execute(
            "DELETE FROM watchlist WHERE user_id = 'default' AND ticker = ?",
            (ticker,),
        )
        await db.commit()

    await market_source.remove_ticker(ticker)
    return {"ticker": ticker, "removed": True}
