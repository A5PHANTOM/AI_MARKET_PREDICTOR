"""Factory for creating market data sources."""

from __future__ import annotations

import logging
import os

from .cache import PriceCache
from .coingecko_client import CoinGeckoDataSource
from .interface import MarketDataSource
from .simulator import SimulatorDataSource

logger = logging.getLogger(__name__)


def create_market_data_source(price_cache: PriceCache) -> MarketDataSource:
    """Create the appropriate market data source based on environment variables.

    - COINGECKO_API_KEY set and non-empty -> CoinGeckoDataSource (real crypto data)
    - Otherwise -> SimulatorDataSource (GBM simulation)

    Returns an unstarted source. Caller must await source.start(tickers).
    """
    api_key = os.environ.get("COINGECKO_API_KEY", "").strip()

    if api_key:
        logger.info("Market data source: CoinGecko API (real crypto data)")
        return CoinGeckoDataSource(api_key=api_key, price_cache=price_cache)
    else:
        logger.info("Market data source: GBM Simulator")
        return SimulatorDataSource(price_cache=price_cache)
