from typing import Literal

from pydantic import BaseModel, Field


class TradeRequest(BaseModel):
    ticker: str
    quantity: float = Field(gt=0)
    side: Literal["buy", "sell"]


class AddWatchlistRequest(BaseModel):
    ticker: str


class ChatRequest(BaseModel):
    message: str


class PositionResponse(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    current_price: float | None = None
    unrealized_pnl: float | None = None
    change_percent: float | None = None


class PortfolioResponse(BaseModel):
    cash_balance: float
    total_value: float
    positions: list[PositionResponse]
    unrealized_pnl: float


class TradeResponse(BaseModel):
    ticker: str
    side: str
    quantity: float
    price: float
    executed_at: str
    success: bool
    error: str | None = None


class WatchlistItemResponse(BaseModel):
    ticker: str
    price: float | None = None
    change: float | None = None
    change_percent: float | None = None


class ChatResponse(BaseModel):
    message: str
    trades: list[TradeResponse] = []
    watchlist_changes: list[dict] = []


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime: float
    market_data_source: str
