"""Tests for GBMSimulator."""

from app.market.seed_prices import SEED_PRICES
from app.market.simulator import GBMSimulator


class TestGBMSimulator:
    """Unit tests for the GBM price simulator."""

    def test_step_returns_all_tickers(self):
        sim = GBMSimulator(tickers=["BTC", "ETH"])
        result = sim.step()
        assert set(result.keys()) == {"BTC", "ETH"}

    def test_prices_are_positive(self):
        sim = GBMSimulator(tickers=["BTC"])
        for _ in range(10_000):
            prices = sim.step()
            assert prices["BTC"] > 0

    def test_initial_prices_match_seeds(self):
        sim = GBMSimulator(tickers=["BTC"])
        assert sim.get_price("BTC") == SEED_PRICES["BTC"]

    def test_add_ticker(self):
        sim = GBMSimulator(tickers=["BTC"])
        sim.add_ticker("ETH")
        result = sim.step()
        assert "ETH" in result

    def test_remove_ticker(self):
        sim = GBMSimulator(tickers=["BTC", "ETH"])
        sim.remove_ticker("ETH")
        result = sim.step()
        assert "ETH" not in result
        assert "BTC" in result

    def test_add_duplicate_is_noop(self):
        sim = GBMSimulator(tickers=["BTC"])
        sim.add_ticker("BTC")
        assert len(sim._tickers) == 1

    def test_remove_nonexistent_is_noop(self):
        sim = GBMSimulator(tickers=["BTC"])
        sim.remove_ticker("NOPE")

    def test_unknown_ticker_gets_random_seed_price(self):
        sim = GBMSimulator(tickers=["ZZZZ"])
        price = sim.get_price("ZZZZ")
        assert price is not None
        assert 50.0 <= price <= 300.0

    def test_empty_step(self):
        sim = GBMSimulator(tickers=[])
        result = sim.step()
        assert result == {}

    def test_prices_change_over_time(self):
        sim = GBMSimulator(tickers=["BTC"])
        initial_price = sim.get_price("BTC")

        for _ in range(1000):
            sim.step()

        final_price = sim.get_price("BTC")
        assert final_price != initial_price

    def test_cholesky_rebuilds_on_add(self):
        sim = GBMSimulator(tickers=["BTC"])
        assert sim._cholesky is None
        sim.add_ticker("ETH")
        assert sim._cholesky is not None

    def test_cholesky_none_with_one_ticker(self):
        sim = GBMSimulator(tickers=["BTC"])
        assert sim._cholesky is None

    def test_get_price_returns_none_for_unknown(self):
        sim = GBMSimulator(tickers=["BTC"])
        assert sim.get_price("UNKNOWN") is None

    def test_pairwise_correlation_blue_chip(self):
        corr = GBMSimulator._pairwise_correlation("BTC", "ETH")
        assert corr == 0.7

    def test_pairwise_correlation_large_cap(self):
        corr = GBMSimulator._pairwise_correlation("SOL", "ADA")
        assert corr == 0.6

    def test_pairwise_correlation_doge(self):
        corr = GBMSimulator._pairwise_correlation("DOGE", "BTC")
        assert corr == 0.3
        corr = GBMSimulator._pairwise_correlation("DOGE", "SOL")
        assert corr == 0.3

    def test_pairwise_correlation_cross_group(self):
        corr = GBMSimulator._pairwise_correlation("BTC", "SOL")
        assert corr == 0.4

    def test_default_dt_is_reasonable(self):
        assert 0 < GBMSimulator.DEFAULT_DT < 0.0001

    def test_prices_rounded_to_two_decimals(self):
        sim = GBMSimulator(tickers=["BTC"])
        result = sim.step()
        price_str = str(result["BTC"])
        if '.' in price_str:
            decimal_part = price_str.split('.')[1]
            assert len(decimal_part) <= 2
