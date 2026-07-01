import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app.database import get_db
from app.llm import _build_portfolio_context, call_llm
from app.market import MarketDataSource, PriceCache
from app.models import ChatRequest, ChatResponse, TradeResponse
from app.trading import execute_portfolio_trade

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _get_price_cache(request: Request) -> PriceCache:
    return request.app.state.price_cache


@router.post("", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    price_cache = _get_price_cache(request)
    market_source: MarketDataSource = request.app.state.market_source
    now = datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        user_msg_id = uuid.uuid4().hex
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) VALUES (?, 'default', 'user', ?, NULL, ?)",
            (user_msg_id, body.message, now),
        )

        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = 'default'"
        )
        user = await cursor.fetchone()
        cash_balance = user["cash_balance"] if user else 10000.0

        cursor = await db.execute(
            "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = 'default'"
        )
        position_rows = await cursor.fetchall()

        cursor = await db.execute(
            "SELECT ticker FROM watchlist WHERE user_id = 'default' ORDER BY added_at ASC"
        )
        watchlist_rows = await cursor.fetchall()

        cursor = await db.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = 'default' ORDER BY created_at DESC LIMIT 10"
        )
        history_rows = await cursor.fetchall()

    positions = []
    total_position_value = 0.0
    for row in position_rows:
        ticker = row["ticker"]
        quantity = row["quantity"]
        avg_cost = row["avg_cost"]
        update = price_cache.get(ticker)
        current_price = update.price if update else avg_cost
        unrealized_pnl = (current_price - avg_cost) * quantity
        change_percent = ((current_price - avg_cost) / avg_cost * 100) if avg_cost else 0.0
        total_position_value += quantity * current_price
        positions.append({
            "ticker": ticker,
            "quantity": quantity,
            "avg_cost": avg_cost,
            "current_price": round(current_price, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "change_percent": round(change_percent, 2),
        })

    context = _build_portfolio_context(cash_balance, positions, [r["ticker"] for r in watchlist_rows])

    history = []
    for r in reversed(history_rows):
        history.append({"role": r["role"], "content": r["content"]})
    history.append({"role": "user", "content": body.message})

    llm_response = await call_llm(portfolio_context=context, messages=history)

    executed_trades: list[TradeResponse] = []

    async with get_db() as db:
        for trade in llm_response.get("trades", []):
            ticker = trade["ticker"].upper()
            side = trade["side"]
            quantity = float(trade["quantity"])

            try:
                executed_trades.append(await execute_portfolio_trade(
                    db,
                    price_cache,
                    ticker=ticker,
                    quantity=quantity,
                    side=side,
                ))
            except ValueError as exc:
                executed_trades.append(TradeResponse(
                    ticker=ticker,
                    side=side,
                    quantity=quantity,
                    price=0.0,
                    executed_at=datetime.now(timezone.utc).isoformat(),
                    success=False,
                    error=str(exc),
                ))

        for change in llm_response.get("watchlist_changes", []):
            ticker = change["ticker"].upper()
            action = change["action"]

            if action == "add":
                cursor = await db.execute(
                    "SELECT id FROM watchlist WHERE user_id = 'default' AND ticker = ?",
                    (ticker,),
                )
                if not await cursor.fetchone():
                    wid = uuid.uuid4().hex
                    t_now = datetime.now(timezone.utc).isoformat()
                    await db.execute(
                        "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, 'default', ?, ?)",
                        (wid, ticker, t_now),
                    )
                    await market_source.add_ticker(ticker)

            elif action == "remove":
                cursor = await db.execute(
                    "SELECT id FROM watchlist WHERE user_id = 'default' AND ticker = ?",
                    (ticker,),
                )
                if await cursor.fetchone():
                    await db.execute(
                        "DELETE FROM watchlist WHERE user_id = 'default' AND ticker = ?",
                        (ticker,),
                    )
                    await market_source.remove_ticker(ticker)

        msg_id = uuid.uuid4().hex
        actions_json = str({
            "trades": [t.model_dump() for t in executed_trades],
            "watchlist_changes": llm_response.get("watchlist_changes", []),
        })
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) VALUES (?, 'default', 'assistant', ?, ?, ?)",
            (msg_id, llm_response["message"], actions_json, now),
        )

        await db.commit()

    return ChatResponse(
        message=llm_response["message"],
        trades=executed_trades,
        watchlist_changes=llm_response.get("watchlist_changes", []),
    )
