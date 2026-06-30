import time

from fastapi import APIRouter, Request

from app.models import HealthResponse

router = APIRouter(prefix="/api/health", tags=["health"])

_start_time = time.time()


@router.get("", response_model=HealthResponse)
async def health(request: Request):
    market_source = request.app.state.market_source
    source_type = type(market_source).__name__ if market_source else "None"
    return HealthResponse(
        status="ok",
        version="0.1.0",
        uptime=round(time.time() - _start_time, 2),
        market_data_source=source_type,
    )
