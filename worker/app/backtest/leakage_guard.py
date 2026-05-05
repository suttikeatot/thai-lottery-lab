"""Leakage guard — the single point of access for historical draws during backtesting.

Core invariant: a strategy may only see rows where ``draw_date < as_of``.
Implemented in M5; this module is a stub for M0.
"""

from __future__ import annotations

from datetime import date

import pandas as pd


def get_history(as_of: date) -> pd.DataFrame:
    """Return draws with ``draw_date < as_of``.

    Strategies must receive only this function — never the underlying table —
    so that future rows are structurally invisible.
    """
    raise NotImplementedError("get_history is implemented in M5")
