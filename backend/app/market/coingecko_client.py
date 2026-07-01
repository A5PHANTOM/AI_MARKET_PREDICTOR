"""CoinGecko API client for cryptocurrency market data."""

from __future__ import annotations

import asyncio
import logging

import httpx

from .cache import PriceCache
from .interface import MarketDataSource

logger = logging.getLogger(__name__)

TICKER_TO_COINGECKO_ID: dict[str, str] = {
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
    "SHIB": "shiba-inu",
    "MATIC": "matic-network",
    "TRX": "tron",
    "UNI": "uniswap",
    "ATOM": "cosmos",
    "APT": "aptos",
    "SUI": "sui",
}

COINGECKO_ID_TO_TICKER: dict[str, str] = {
    v: k for k, v in TICKER_TO_COINGECKO_ID.items()
}


class CoinGeckoDataSource(MarketDataSource):
    """MarketDataSource backed by the CoinGecko API.

    Polls GET /simple/price for all watched tickers every `poll_interval`
    seconds and writes results to the PriceCache.

    Rate limits:
      - Demo API key: 10-30 calls/min
      - Default poll: every 10s (6 calls/min) -- well within limits
    """

    BASE_URL = "https://api.coingecko.com/api/v3"

    def __init__(
        self,
        api_key: str,
        price_cache: PriceCache,
        poll_interval: float = 10.0,
    ) -> None:
        self._api_key = api_key
        self._cache = price_cache
        self._interval = poll_interval
        self._tickers: list[str] = []
        self._task: asyncio.Task | None = None
        self._client: httpx.AsyncClient | None = None

    async def start(self, tickers: list[str]) -> None:
        self._client = httpx.AsyncClient()
        self._tickers = list(tickers)

        await self._poll_once()

        self._task = asyncio.create_task(
            self._poll_loop(), name="coingecko-poller"
        )
        logger.info(
            "CoinGecko poller started: %d tickers, %.1fs interval",
            len(tickers),
            self._interval,
        )

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        if self._client:
            await self._client.aclose()
            self._client = None
        logger.info("CoinGecko poller stopped")

    async def add_ticker(self, ticker: str) -> None:
        ticker = ticker.upper().strip()
        if ticker not in self._tickers:
            self._tickers.append(ticker)
            logger.info(
                "CoinGecko: added ticker %s (will appear on next poll)", ticker
            )

    async def remove_ticker(self, ticker: str) -> None:
        ticker = ticker.upper().strip()
        self._tickers = [t for t in self._tickers if t != ticker]
        self._cache.remove(ticker)
        logger.info("CoinGecko: removed ticker %s", ticker)

    def get_tickers(self) -> list[str]:
        return list(self._tickers)

    async def _poll_loop(self) -> None:
        while True:
            await asyncio.sleep(self._interval)
            await self._poll_once()

    async def _poll_once(self) -> None:
        if not self._tickers or not self._client:
            return

        try:
            coin_ids = [
                TICKER_TO_COINGECKO_ID.get(t, t.lower())
                for t in self._tickers
            ]
            ids_param = ",".join(coin_ids)

            url = f"{self.BASE_URL}/simple/price"
            params = {"vs_currencies": "usd", "ids": ids_param}
            headers = {"x-cg-demo-api-key": self._api_key}

            response = await self._client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

            now = asyncio.get_event_loop().time()
            processed = 0
            for coin_id, prices in data.items():
                ticker = COINGECKO_ID_TO_TICKER.get(coin_id, coin_id.upper())
                if ticker not in self._tickers:
                    continue
                usd_price = prices.get("usd")
                if usd_price is not None:
                    self._cache.update(
                        ticker=ticker,
                        price=float(usd_price),
                        timestamp=now,
                    )
                    processed += 1

            logger.debug(
                "CoinGecko poll: updated %d/%d tickers",
                processed,
                len(self._tickers),
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("CoinGecko rate limit hit, will retry next poll")
            else:
                logger.error(
                    "CoinGecko API error: %d %s",
                    e.response.status_code,
                    e.response.text[:200],
                )
        except httpx.RequestError as e:
            logger.error("CoinGecko request failed: %s", e)
        except Exception as e:
            logger.error("CoinGecko poll failed: %s", e)
