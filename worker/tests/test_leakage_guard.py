"""Placeholder leakage-guard tests. Real assertions land in M5."""

from datetime import date

import pytest

from app.backtest.leakage_guard import get_history


def test_get_history_is_unimplemented_until_m5():
    with pytest.raises(NotImplementedError):
        get_history(date(2024, 1, 1))
