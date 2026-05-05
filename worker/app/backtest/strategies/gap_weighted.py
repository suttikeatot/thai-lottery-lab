"""Gap-weighted strategy: rank numbers by current gap relative to mean gap."""

from __future__ import annotations

from typing import Any

import pandas as pd

from .common import ALL_NUMBERS


def _hit_positions(history: pd.DataFrame, number: str) -> list[int]:
    if history.empty:
        return []
    hits = (history["two_upper"] == number) | (history["two_lower"] == number)
    return hits[hits].index.tolist()


def _score(history: pd.DataFrame, number: str) -> float:
    positions = _hit_positions(history, number)
    history_len = len(history)
    if not positions:
        return float(history_len)

    current_gap = history_len - 1 - positions[-1]
    if len(positions) == 1:
        mean_gap = max(1.0, float(positions[0] + 1))
    else:
        gaps = [positions[i] - positions[i - 1] - 1 for i in range(1, len(positions))]
        mean_gap = max(1.0, sum(gaps) / len(gaps))

    return current_gap / mean_gap


def predict(history: pd.DataFrame, k: int, params: dict[str, Any]) -> list[str]:
    lookback = int(params.get("lookback", 100))
    recent = history.tail(lookback) if lookback > 0 else history
    ranked = sorted(ALL_NUMBERS, key=lambda number: (-_score(recent, number), number))
    return ranked[:k]
