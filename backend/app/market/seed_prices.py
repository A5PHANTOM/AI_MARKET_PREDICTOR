"""Seed prices and per-ticker parameters for the market simulator."""

SEED_PRICES: dict[str, float] = {
    "BTC": 105000.00,
    "ETH": 5500.00,
    "SOL": 180.00,
    "XRP": 3.50,
    "BNB": 600.00,
    "DOGE": 0.15,
    "ADA": 0.60,
    "AVAX": 35.00,
    "DOT": 8.00,
    "LINK": 18.00,
}

TICKER_PARAMS: dict[str, dict[str, float]] = {
    "BTC": {"sigma": 0.35, "mu": 0.05},
    "ETH": {"sigma": 0.40, "mu": 0.05},
    "SOL": {"sigma": 0.55, "mu": 0.03},
    "XRP": {"sigma": 0.50, "mu": 0.03},
    "BNB": {"sigma": 0.40, "mu": 0.04},
    "DOGE": {"sigma": 0.70, "mu": 0.02},
    "ADA": {"sigma": 0.50, "mu": 0.03},
    "AVAX": {"sigma": 0.55, "mu": 0.03},
    "DOT": {"sigma": 0.50, "mu": 0.03},
    "LINK": {"sigma": 0.50, "mu": 0.04},
}

DEFAULT_PARAMS: dict[str, float] = {"sigma": 0.25, "mu": 0.05}

CORRELATION_GROUPS: dict[str, set[str]] = {
    "blue_chip": {"BTC", "ETH"},
    "large_cap": {"SOL", "XRP", "BNB", "ADA", "AVAX", "DOT", "LINK"},
}

INTRA_BLUE_CHIP_CORR = 0.7
INTRA_LARGE_CAP_CORR = 0.6
CROSS_GROUP_CORR = 0.4
MEME_CORR = 0.3
