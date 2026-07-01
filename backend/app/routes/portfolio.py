from fastapi import APIRouter, HTTPException, Request

from app.database import get_db
from app.market import PriceCache
from app.models import PortfolioResponse, PositionResponse, TradeRequest, TradeResponse
from app.trading import execute_portfolio_trade

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

    async with get_db() as db:
        try:
            response = await execute_portfolio_trade(
                db,
                price_cache,
                ticker=trade.ticker,
                quantity=trade.quantity,
                side=trade.side,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        await db.commit()

    return response


@router.get("/history")
async def get_portfolio_history(request: Request):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT total_value, recorded_at FROM portfolio_snapshots WHERE user_id = 'default' ORDER BY recorded_at ASC"
        )
        rows = await cursor.fetchall()
    return [{"total_value": row["total_value"], "recorded_at": row["recorded_at"]} for row in rows]
