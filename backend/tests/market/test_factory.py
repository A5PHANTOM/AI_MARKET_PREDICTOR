"""Tests for market data source factory."""

import os
from unittest.mock import patch

from app.market.cache import PriceCache
from app.market.coingecko_client import CoinGeckoDataSource
from app.market.factory import create_market_data_source
from app.market.simulator import SimulatorDataSource


class TestFactory:
    """Tests for create_market_data_source factory."""

    def test_creates_simulator_when_no_api_key(self):
        cache = PriceCache()

        with patch.dict(os.environ, {}, clear=True):
            source = create_market_data_source(cache)

        assert isinstance(source, SimulatorDataSource)

    def test_creates_simulator_when_api_key_empty(self):
        cache = PriceCache()

        with patch.dict(os.environ, {"COINGECKO_API_KEY": ""}, clear=True):
            source = create_market_data_source(cache)

        assert isinstance(source, SimulatorDataSource)

    def test_creates_simulator_when_api_key_whitespace(self):
        cache = PriceCache()

        with patch.dict(os.environ, {"COINGECKO_API_KEY": "   "}, clear=True):
            source = create_market_data_source(cache)

        assert isinstance(source, SimulatorDataSource)

    def test_creates_coingecko_when_api_key_set(self):
        cache = PriceCache()

        with patch.dict(os.environ, {"COINGECKO_API_KEY": "test-key"}, clear=True):
            source = create_market_data_source(cache)

        assert isinstance(source, CoinGeckoDataSource)

    def test_coingecko_receives_api_key(self):
        cache = PriceCache()

        with patch.dict(os.environ, {"COINGECKO_API_KEY": "test-key-123"}, clear=True):
            source = create_market_data_source(cache)

        assert isinstance(source, CoinGeckoDataSource)
        assert source._api_key == "test-key-123"

    def test_simulator_receives_cache(self):
        cache = PriceCache()

        with patch.dict(os.environ, {}, clear=True):
            source = create_market_data_source(cache)

        assert isinstance(source, SimulatorDataSource)
        assert source._cache is cache

    def test_coingecko_receives_cache(self):
        cache = PriceCache()

        with patch.dict(os.environ, {"COINGECKO_API_KEY": "test-key"}, clear=True):
            source = create_market_data_source(cache)

        assert isinstance(source, CoinGeckoDataSource)
        assert source._cache is cache
