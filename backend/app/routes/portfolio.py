import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.database import get_db
from app.market import PriceCache
from app.models import PortfolioResponse, PositionResponse, TradeRequest, TradeResponse

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def _get_price_cache(request: Request) -> PriceCache:
    return request.app.state.price_cache


@router.get("", response_model=PortfolioResponse)
async def get_portfolio(request: Request):
    price_cache = _get_price_cache(request)
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = 'default'"
        )
        user = await cursor.fetchone()
        cash_balance = user["cash_balance"] if user else 10000.0

        cursor = await db.execute(
            "SELECT ticker, quantity, avg_cost, updated_at FROM positions WHERE user_id = 'default'"
        )
        rows = await cursor.fetchall()

    positions = []
    total_position_value = 0.0
    total_unrealized_pnl = 0.0

    for row in rows:
        ticker = row["ticker"]
        quantity = row["quantity"]
        avg_cost = row["avg_cost"]

        update = price_cache.get(ticker)
        current_price = update.price if update else avg_cost
        unrealized_pnl = (current_price - avg_cost) * quantity
        change_percent = ((current_price - avg_cost) / avg_cost * 100) if avg_cost else 0.0

        total_position_value += quantity * current_price
        total_unrealized_pnl += unrealized_pnl

        positions.append(PositionResponse(
            ticker=ticker,
            quantity=quantity,
            avg_cost=avg_cost,
            current_price=round(current_price, 2),
            unrealized_pnl=round(unrealized_pnl, 2),
            change_percent=round(change_percent, 2),
        ))

    total_value = cash_balance + total_position_value

    return PortfolioResponse(
        cash_balance=round(cash_balance, 2),
        total_value=round(total_value, 2),
        positions=positions,
        unrealized_pnl=round(total_unrealized_pnl, 2),
    )


@router.post("/trade", response_model=TradeResponse)
async def execute_trade(request: Request, trade: TradeRequest):
    price_cache = _get_price_cache(request)
    update = price_cache.get(trade.ticker.upper())

    if update is None:
        raise HTTPException(status_code=400, detail=f"No price data for ticker '{trade.ticker.upper()}'")

    price = update.price
    now = datetime.now(timezone.utc).isoformat()
    ticker = trade.ticker.upper()

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = 'default'"
        )
        user = await cursor.fetchone()
        cash_balance = user["cash_balance"] if user else 10000.0

        cursor = await db.execute(
            "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = 'default' AND ticker = ?",
            (ticker,),
        )
        existing = await cursor.fetchone()

        if trade.side == "buy":
            cost = trade.quantity * price
            if cost > cash_balance:
                return TradeResponse(
                    ticker=ticker,
                    side="buy",
                    quantity=trade.quantity,
                    price=round(price, 2),
                    executed_at=now,
                    success=False,
                    error=f"Insufficient cash. Need ${cost:,.2f} but have ${cash_balance:,.2f}",
                )

            new_quantity = trade.quantity
            if existing:
                old_qty = existing["quantity"]
                old_avg = existing["avg_cost"]
                new_avg = ((old_avg * old_qty) + (price * trade.quantity)) / (old_qty + trade.quantity)
                new_quantity = old_qty + trade.quantity

                await db.execute(
                    "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE user_id = 'default' AND ticker = ?",
                    (new_quantity, round(new_avg, 4), now, ticker),
                )
            else:
                pos_id = uuid.uuid4().hex
                await db.execute(
                    "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) VALUES (?, 'default', ?, ?, ?, ?)",
                    (pos_id, ticker, trade.quantity, round(price, 4), now),
                )

            new_cash = cash_balance - cost
            await db.execute(
                "UPDATE users_profile SET cash_balance = ? WHERE id = 'default'",
                (round(new_cash, 2),),
            )

        else:
            if not existing or existing["quantity"] < trade.quantity:
                have_qty = existing["quantity"] if existing else 0
                return TradeResponse(
                    ticker=ticker,
                    side="sell",
                    quantity=trade.quantity,
                    price=round(price, 2),
                    executed_at=now,
                    success=False,
                    error=f"Insufficient shares. Have {have_qty} but want to sell {trade.quantity}",
                )

            new_quantity = existing["quantity"] - trade.quantity
            if new_quantity <= 0:
                await db.execute(
                    "DELETE FROM positions WHERE user_id = 'default' AND ticker = ?",
                    (ticker,),
                )
            else:
                await db.execute(
                    "UPDATE positions SET quantity = ?, updated_at = ? WHERE user_id = 'default' AND ticker = ?",
                    (new_quantity, now, ticker),
                )

            proceeds = trade.quantity * price
            new_cash = cash_balance + proceeds
            await db.execute(
                "UPDATE users_profile SET cash_balance = ? WHERE id = 'default'",
                (round(new_cash, 2),),
            )

        trade_id = uuid.uuid4().hex
        await db.execute(
            "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) VALUES (?, 'default', ?, ?, ?, ?, ?)",
            (trade_id, ticker, trade.side, trade.quantity, round(price, 2), now),
        )

        await _record_snapshot(db)

        await db.commit()

    return TradeResponse(
        ticker=ticker,
        side=trade.side,
        quantity=trade.quantity,
        price=round(price, 2),
        executed_at=now,
        success=True,
    )


@router.get("/history")
async def get_portfolio_history(request: Request):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT total_value, recorded_at FROM portfolio_snapshots WHERE user_id = 'default' ORDER BY recorded_at ASC"
        )
        rows = await cursor.fetchall()
    return [{"total_value": row["total_value"], "recorded_at": row["recorded_at"]} for row in rows]


async def _record_snapshot(db) -> None:
    cursor = await db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = 'default'"
    )
    user = await cursor.fetchone()
    cash = user["cash_balance"] if user else 10000.0

    cursor = await db.execute(
        "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = 'default'"
    )
    positions = await cursor.fetchall()

    total_value = cash
    for pos in positions:
        total_value += pos["quantity"] * pos["avg_cost"]

    snap_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) VALUES (?, 'default', ?, ?)",
        (snap_id, round(total_value, 2), now),
    )
