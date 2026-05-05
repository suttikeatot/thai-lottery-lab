"""Walk-forward backtesting engine."""

from __future__ import annotations

import hashlib
import sqlite3
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Any

import pandas as pd

from .leakage_guard import connect_readonly, get_history
from .strategies.common import ALL_NUMBERS, dedupe_limit

StrategyFn = Callable[[pd.DataFrame, int, dict[str, Any]], list[str]]


@dataclass(frozen=True)
class PredictionResult:
    target_date: date
    predicted: list[str]
    actual_upper: str
    actual_lower: str
    hit_upper: bool
    hit_lower: bool
    as_of: date
    history_count: int
    history_hash: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "target_date": self.target_date.isoformat(),
            "predicted": self.predicted,
            "actual_upper": self.actual_upper,
            "actual_lower": self.actual_lower,
            "hit_upper": self.hit_upper,
            "hit_lower": self.hit_lower,
            "as_of": self.as_of.isoformat(),
            "history_count": self.history_count,
            "history_hash": self.history_hash,
        }


def _parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _history_hash(history: pd.DataFrame) -> str:
    if history.empty:
        return hashlib.sha256(b"").hexdigest()
    csv = history[["draw_date", "two_upper", "two_lower"]].to_csv(index=False)
    return hashlib.sha256(csv.encode("utf-8")).hexdigest()


def _fetch_actual(conn: sqlite3.Connection, target_date: date) -> tuple[str, str]:
    row = conn.execute(
        """
        SELECT two_upper, two_lower
        FROM draw
        WHERE date(draw_date) = date(?)
        LIMIT 1
        """,
        (target_date.isoformat(),),
    ).fetchone()
    if row is None:
        raise ValueError(f"No draw found for target date {target_date.isoformat()}")
    return str(row[0]).zfill(2), str(row[1]).zfill(2)


def list_target_dates(window_spec: dict[str, Any] | None = None) -> list[date]:
    spec = window_spec or {}
    start_date = spec.get("start_date") or spec.get("date_from")
    end_date = spec.get("end_date") or spec.get("date_to")
    min_history = int(spec.get("min_history", 1))
    last_n_targets = spec.get("last_n_targets")

    clauses: list[str] = []
    params: list[str] = []
    if start_date:
        clauses.append("date(draw_date) >= date(?)")
        params.append(_parse_date(start_date).isoformat())
    if end_date:
        clauses.append("date(draw_date) <= date(?)")
        params.append(_parse_date(end_date).isoformat())

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    conn = connect_readonly()
    try:
        rows = conn.execute(
            f"SELECT draw_date FROM draw {where} ORDER BY draw_date ASC",
            params,
        ).fetchall()
    finally:
        conn.close()

    dates = [_parse_date(row[0]) for row in rows]
    if min_history > 0:
        dates = [target_date for target_date in dates if len(get_history(target_date)) >= min_history]
    if last_n_targets is not None:
        dates = dates[-int(last_n_targets) :]
    return dates


def run_walk_forward(
    strategy_fn: StrategyFn,
    params: dict[str, Any],
    target_dates: list[date | str],
    k: int,
) -> list[PredictionResult]:
    if k < 1 or k > 100:
        raise ValueError("k must be between 1 and 100")

    parsed_targets = [_parse_date(target) for target in target_dates]
    results: list[PredictionResult] = []

    conn = connect_readonly()
    try:
        for target_date in parsed_targets:
            history = get_history(target_date)
            raw_predictions = strategy_fn(history, k, params)
            predicted = dedupe_limit(raw_predictions, k)
            if not predicted:
                predicted = ALL_NUMBERS[:k]

            actual_upper, actual_lower = _fetch_actual(conn, target_date)
            results.append(
                PredictionResult(
                    target_date=target_date,
                    predicted=predicted,
                    actual_upper=actual_upper,
                    actual_lower=actual_lower,
                    hit_upper=actual_upper in predicted,
                    hit_lower=actual_lower in predicted,
                    as_of=target_date,
                    history_count=len(history),
                    history_hash=_history_hash(history),
                )
            )
    finally:
        conn.close()

    return results


def summarize_results(results: list[PredictionResult], k: int) -> dict[str, Any]:
    n_targets = len(results)
    hit_upper = sum(1 for result in results if result.hit_upper)
    hit_lower = sum(1 for result in results if result.hit_lower)
    hit_any = sum(1 for result in results if result.hit_upper or result.hit_lower)

    def rate(count: int) -> float:
        return round(count / n_targets, 4) if n_targets else 0.0

    return {
        "n_targets": n_targets,
        "k": k,
        "hit_upper": hit_upper,
        "hit_lower": hit_lower,
        "hit_any": hit_any,
        "hit_upper_rate": rate(hit_upper),
        "hit_lower_rate": rate(hit_lower),
        "hit_any_rate": rate(hit_any),
        "expected_random_upper_rate": round(k / 100, 4),
        "expected_random_any_rate": round(1 - ((100 - k) / 100) ** 2, 4),
    }
