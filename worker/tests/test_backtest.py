"""Backtest engine tests."""

from __future__ import annotations

import sqlite3
from collections import deque
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd

from app.backtest.engine import list_target_dates, run_walk_forward, summarize_results
from app.backtest.strategies import resolve_strategy


def _create_test_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE draw (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          draw_date DATETIME NOT NULL,
          first_prize TEXT NOT NULL,
          two_upper TEXT NOT NULL,
          two_lower TEXT NOT NULL,
          source TEXT NOT NULL,
          imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO draw (draw_date, first_prize, two_upper, two_lower, source)
        VALUES
          ('2024-01-01', '123401', '01', '11', 'test'),
          ('2024-01-16', '123402', '02', '22', 'test'),
          ('2024-02-01', '123403', '03', '33', 'test'),
          ('2024-02-16', '123404', '04', '44', 'test'),
          ('2024-03-01', '123405', '05', '55', 'test');
        """
    )
    conn.close()


def test_cheating_strategy_scores_100pct(tmp_path, monkeypatch):
    db_path = tmp_path / "app.db"
    _create_test_db(db_path)
    monkeypatch.setenv("DB_PATH", str(db_path))

    targets = [date(2024, 1, 16), date(2024, 2, 1), date(2024, 2, 16)]
    future_answers = deque(["02", "03", "04"])

    def cheating_strategy(
        history: pd.DataFrame,
        k: int,
        params: dict[str, Any],
    ) -> list[str]:
        assert all(row_date < params["current_floor"] for row_date in history["draw_date"])
        return [future_answers.popleft()]

    results = []
    for target in targets:
        results.extend(
            run_walk_forward(
                strategy_fn=cheating_strategy,
                params={"current_floor": target},
                target_dates=[target],
                k=1,
            )
        )

    metrics = summarize_results(results, k=1)

    assert metrics["hit_upper_rate"] == 1.0
    assert metrics["hit_lower_rate"] == 0.0


def test_random_baseline_runs_e2e(tmp_path, monkeypatch):
    db_path = tmp_path / "app.db"
    _create_test_db(db_path)
    monkeypatch.setenv("DB_PATH", str(db_path))

    targets = list_target_dates({"min_history": 1, "last_n_targets": 3})
    strategy = resolve_strategy("random_baseline")

    results = run_walk_forward(
        strategy_fn=strategy,
        params={"seed": 42},
        target_dates=targets,
        k=5,
    )
    metrics = summarize_results(results, k=5)

    assert len(results) == 3
    assert metrics["n_targets"] == 3
    assert all(len(result.predicted) == 5 for result in results)
    assert all(result.history_count > 0 for result in results)
