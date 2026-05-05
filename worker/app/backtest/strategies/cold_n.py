"""Cold-N strategy: choose least frequent numbers in recent history."""

from __future__ import annotations

from typing import Any

import pandas as pd

from .common import frequency_counts


def predict(history: pd.DataFrame, k: int, params: dict[str, Any]) -> list[str]:
    lookback = int(params.get("lookback", 50))
    counts = frequency_counts(history, lookback)
    ranked = sorted(counts.items(), key=lambda item: (int(item[1]), item[0]))
    return [number for number, _count in ranked[:k]]
