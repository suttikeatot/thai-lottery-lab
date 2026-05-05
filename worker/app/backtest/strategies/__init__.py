"""Backtest strategy registry."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pandas as pd

from . import cold_n, gap_weighted, hot_n, random_baseline

StrategyFn = Callable[[pd.DataFrame, int, dict[str, Any]], list[str]]

STRATEGIES: dict[str, StrategyFn] = {
    "random_baseline": random_baseline.predict,
    "hot_n": hot_n.predict,
    "cold_n": cold_n.predict,
    "gap_weighted": gap_weighted.predict,
}


def resolve_strategy(strategy_key: str) -> StrategyFn:
    try:
        return STRATEGIES[strategy_key]
    except KeyError as exc:
        choices = ", ".join(sorted(STRATEGIES))
        raise ValueError(f"Unknown strategy '{strategy_key}'. Expected one of: {choices}") from exc
