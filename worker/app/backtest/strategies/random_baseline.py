"""Uniform random baseline strategy."""

from __future__ import annotations

import random
from typing import Any

import pandas as pd

from .common import ALL_NUMBERS


def predict(history: pd.DataFrame, k: int, params: dict[str, Any]) -> list[str]:
    seed = params.get("seed", 0)
    rng = random.Random(f"{seed}:{len(history)}")
    return rng.sample(ALL_NUMBERS, k=min(k, len(ALL_NUMBERS)))
