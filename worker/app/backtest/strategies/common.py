"""Shared helpers for backtest strategies."""

from __future__ import annotations

import pandas as pd

ALL_NUMBERS = [f"{i:02d}" for i in range(100)]


def combined_numbers(history: pd.DataFrame, lookback: int | None = None) -> pd.Series:
    if lookback is not None and lookback > 0:
        history = history.tail(lookback)

    if history.empty:
        return pd.Series([], dtype="object")

    return pd.concat([history["two_upper"], history["two_lower"]], ignore_index=True)


def frequency_counts(history: pd.DataFrame, lookback: int | None = None) -> pd.Series:
    numbers = combined_numbers(history, lookback)
    return numbers.value_counts().reindex(ALL_NUMBERS, fill_value=0)


def dedupe_limit(numbers: list[str], k: int) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for number in numbers:
        value = str(number).zfill(2)
        if value in seen or value not in ALL_NUMBERS:
            continue
        seen.add(value)
        result.append(value)
        if len(result) == k:
            break
    return result
