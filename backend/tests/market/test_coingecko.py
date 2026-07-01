"""Tests for CoinGeckoDataSource (mocked)."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.market.cache import PriceCache
from app.market.coingecko_client import TICKER_TO_COINGECKO_ID, CoinGeckoDataSource


@pytest.mark.asyncio
class TestCoinGeckoDataSource:
    """Unit tests for CoinGeckoDataSource with mocked API."""

    async def test_poll_updates_cache(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(
            api_key="test-key",
            price_cache=cache,
            poll_interval=60.0,
        )
        source._tickers = ["BTC", "ETH"]
        source._client = AsyncMock(spec=httpx.AsyncClient)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "bitcoin": {"usd": 105500.00},
            "ethereum": {"usd": 5525.00},
        }
        source._client.get.return_value = mock_response

        await source._poll_once()

        assert cache.get_price("BTC") == 105500.00
        assert cache.get_price("ETH") == 5525.00

    async def test_poll_skips_unknown_tickers(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(
            api_key="test-key",
            price_cache=cache,
            poll_interval=60.0,
        )
        source._tickers = ["BTC", "UNKNOWN"]
        source._client = AsyncMock(spec=httpx.AsyncClient)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "bitcoin": {"usd": 105500.00},
        }
        source._client.get.return_value = mock_response

        await source._poll_once()

        assert cache.get_price("BTC") == 105500.00
        assert cache.get_price("UNKNOWN") is None

    async def test_api_error_does_not_crash(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(
            api_key="test-key",
            price_cache=cache,
            poll_interval=60.0,
        )
        source._tickers = ["BTC"]
        source._client = AsyncMock(spec=httpx.AsyncClient)
        source._client.get.side_effect = Exception("network error")

        await source._poll_once()

        assert cache.get_price("BTC") is None

    async def test_rate_limit_handled_gracefully(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(
            api_key="test-key",
            price_cache=cache,
            poll_interval=60.0,
        )
        source._tickers = ["BTC"]
        source._client = AsyncMock(spec=httpx.AsyncClient)

        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.text = "rate limited"

        source._client.get.side_effect = httpx.HTTPStatusError(
            "rate limited", request=MagicMock(), response=mock_response
        )

        await source._poll_once()

        assert cache.get_price("BTC") is None

    async def test_add_ticker(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(api_key="test-key", price_cache=cache)

        await source.add_ticker("BTC")
        assert "BTC" in source.get_tickers()

    async def test_add_ticker_uppercase_normalization(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(api_key="test-key", price_cache=cache)

        await source.add_ticker("btc")
        assert "BTC" in source.get_tickers()

    async def test_add_ticker_strips_whitespace(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(api_key="test-key", price_cache=cache)

        await source.add_ticker("  BTC  ")
        assert "BTC" in source.get_tickers()

    async def test_remove_ticker(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(api_key="test-key", price_cache=cache)
        source._tickers = ["BTC", "ETH"]
        cache.update("BTC", 105000.00)

        await source.remove_ticker("BTC")
        assert "BTC" not in source.get_tickers()
        assert cache.get("BTC") is None

    async def test_get_tickers(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(api_key="test-key", price_cache=cache)
        source._tickers = ["BTC", "ETH"]

        tickers = source.get_tickers()
        assert tickers == ["BTC", "ETH"]

    async def test_empty_tickers_skips_poll(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(api_key="test-key", price_cache=cache)
        source._tickers = []
        source._client = AsyncMock(spec=httpx.AsyncClient)

        await source._poll_once()
        source._client.get.assert_not_called()

    async def test_stop_is_idempotent(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(api_key="test-key", price_cache=cache)

        await source.stop()
        await source.stop()

    async def test_stop_cancels_task(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(
            api_key="test-key", price_cache=cache, poll_interval=10.0
        )

        with patch("app.market.coingecko_client.httpx.AsyncClient"):
            with patch.object(source, "_poll_once"):
                await source.start(["BTC"])

        assert source._task is not None
        assert not source._task.done()

        source._client = AsyncMock(spec=httpx.AsyncClient)
        await source.stop()
        assert source._task is None

    async def test_start_immediate_poll(self):
        cache = PriceCache()
        source = CoinGeckoDataSource(
            api_key="test-key", price_cache=cache, poll_interval=60.0
        )

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "bitcoin": {"usd": 105500.00},
        }

        with patch("app.market.coingecko_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_cls.return_value = mock_client

            await source.start(["BTC"])

        assert cache.get_price("BTC") == 105500.00

        await source.stop()

    async def test_ticker_to_coingecko_mapping(self):
        expected = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "SOL": "solana",
            "XRP": "ripple",
            "BNB": "binancecoin",
            "DOGE": "dogecoin",
            "ADA": "cardano",
            "AVAX": "avalanche-2",
            "DOT": "polkadot",
            "LINK": "chainlink",
        }
        for ticker, coin_id in expected.items():
            assert TICKER_TO_COINGECKO_ID[ticker] == coin_id
