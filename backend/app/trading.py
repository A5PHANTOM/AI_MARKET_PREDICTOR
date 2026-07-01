import uuid
from datetime import datetime, timezone
from typing import Literal

from app.market import PriceCache
from app.models import TradeResponse


async def execute_portfolio_trade(
    db,
    price_cache: PriceCache,
    *,
    ticker: str,
    quantity: float,
    side: Literal["buy", "sell"],
    record_snapshot: bool = True,
) -> TradeResponse:
    ticker = ticker.upper()
    update = price_cache.get(ticker)
    if update is None:
        raise ValueError(f"No price data for ticker '{ticker}'")

    price = update.price
    now = datetime.now(timezone.utc).isoformat()

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

    if side == "buy":
        cost = quantity * price
        if cost > cash_balance:
            return TradeResponse(
                ticker=ticker,
                side="buy",
                quantity=quantity,
                price=round(price, 2),
                executed_at=now,
                success=False,
                error=f"Insufficient cash. Need ${cost:,.2f} but have ${cash_balance:,.2f}",
            )

        if existing:
            old_qty = existing["quantity"]
            old_avg = existing["avg_cost"]
            new_avg = ((old_avg * old_qty) + (price * quantity)) / (old_qty + quantity)
            new_quantity = old_qty + quantity

            await db.execute(
                "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE user_id = 'default' AND ticker = ?",
                (new_quantity, round(new_avg, 4), now, ticker),
            )
        else:
            pos_id = uuid.uuid4().hex
            await db.execute(
                "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) VALUES (?, 'default', ?, ?, ?, ?)",
                (pos_id, ticker, quantity, round(price, 4), now),
            )

        await db.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = 'default'",
            (round(cash_balance - cost, 2),),
        )

    else:
        if not existing or existing["quantity"] < quantity:
            have_qty = existing["quantity"] if existing else 0
            return TradeResponse(
                ticker=ticker,
                side="sell",
                quantity=quantity,
                price=round(price, 2),
                executed_at=now,
                success=False,
                error=f"Insufficient shares. Have {have_qty} but want to sell {quantity}",
            )

        new_quantity = existing["quantity"] - quantity
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

        proceeds = quantity * price
        await db.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = 'default'",
            (round(cash_balance + proceeds, 2),),
        )

    trade_id = uuid.uuid4().hex
    await db.execute(
        "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) VALUES (?, 'default', ?, ?, ?, ?, ?)",
        (trade_id, ticker, side, quantity, round(price, 2), now),
    )

    if record_snapshot:
        await record_portfolio_snapshot(db, price_cache)

    return TradeResponse(
        ticker=ticker,
        side=side,
        quantity=quantity,
        price=round(price, 2),
        executed_at=now,
        success=True,
    )


async def record_portfolio_snapshot(db, price_cache: PriceCache) -> None:
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
        update = price_cache.get(pos["ticker"])
        current_price = update.price if update else pos["avg_cost"]
        total_value += pos["quantity"] * current_price

    snap_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) VALUES (?, 'default', ?, ?)",
        (snap_id, round(total_value, 2), now),
    )
