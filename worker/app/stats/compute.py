"""Statistics computation for Thai Lottery draws."""

from __future__ import annotations

import os
import sqlite3
from datetime import date, timedelta
from pathlib import Path
from statistics import median

import numpy as np
import pandas as pd
from scipy.stats import chisquare

# DB path: worker runs from worker/, DB is at ../data/app.db
_DEFAULT_DB = str(Path(__file__).parent.parent.parent.parent / "data" / "app.db")
DB_PATH = os.environ.get("DB_PATH", _DEFAULT_DB)


def _load_all_draws() -> pd.DataFrame:
    """Load all draws oldest-first for rolling/gap analysis."""
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        return pd.read_sql(
            "SELECT draw_date, two_upper, two_lower FROM draw ORDER BY draw_date ASC",
            conn,
        )
    finally:
        conn.close()


def _hit_series(df: pd.DataFrame, number: str) -> pd.Series:
    """Boolean series: True when `number` appeared (upper or lower) on that draw."""
    return (df["two_upper"] == number) | (df["two_lower"] == number)


def compute_rolling(number: str, window_size: int) -> dict:
    df = _load_all_draws()
    if df.empty:
        return {"number": number, "window_size": window_size, "points": []}

    hits = _hit_series(df, number).astype(int)
    rolling = hits.rolling(window=window_size, min_periods=1).sum().astype(int)

    points = [
        {"draw_date": str(df["draw_date"].iloc[i])[:10], "count": int(rolling.iloc[i])}
        for i in range(len(df))
    ]
    return {"number": number, "window_size": window_size, "points": points}


def compute_gap(number: str) -> dict:
    df = _load_all_draws()
    if df.empty:
        return {
            "number": number,
            "current_gap": None,
            "last_seen": None,
            "mean_gap": None,
            "median_gap": None,
            "max_gap": None,
            "gap_distribution": [],
        }

    hits = _hit_series(df, number)
    hit_indices = hits[hits].index.tolist()

    if not hit_indices:
        return {
            "number": number,
            "current_gap": len(df),
            "last_seen": None,
            "mean_gap": None,
            "median_gap": None,
            "max_gap": None,
            "gap_distribution": [],
        }

    # Current gap = draws since last hit (0 if last draw was a hit)
    last_hit_pos = hit_indices[-1]
    current_gap = len(df) - 1 - last_hit_pos
    last_seen = str(df["draw_date"].iloc[last_hit_pos])[:10]

    # Historical gaps between consecutive hits
    gaps: list[int] = []
    for i in range(1, len(hit_indices)):
        gaps.append(hit_indices[i] - hit_indices[i - 1] - 1)

    if not gaps:
        return {
            "number": number,
            "current_gap": current_gap,
            "last_seen": last_seen,
            "mean_gap": None,
            "median_gap": None,
            "max_gap": None,
            "gap_distribution": [],
        }

    gap_counts: dict[int, int] = {}
    for g in gaps:
        gap_counts[g] = gap_counts.get(g, 0) + 1

    return {
        "number": number,
        "current_gap": current_gap,
        "last_seen": last_seen,
        "mean_gap": round(sum(gaps) / len(gaps), 2),
        "median_gap": float(median(gaps)),
        "max_gap": max(gaps),
        "gap_distribution": [
            {"gap": k, "count": v}
            for k, v in sorted(gap_counts.items())
        ],
    }


def _load_draws(window: str, n: int) -> pd.DataFrame:
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        today = date.today()

        if window == "lastN":
            df = pd.read_sql(
                "SELECT draw_date, two_upper, two_lower FROM draw ORDER BY draw_date DESC LIMIT ?",
                conn,
                params=(n,),
            )
        else:
            years = {"5y": 5, "10y": 10, "15y": 15, "20y": 20}[window]
            cutoff = today - timedelta(days=years * 365)
            df = pd.read_sql(
                "SELECT draw_date, two_upper, two_lower FROM draw WHERE draw_date >= ? ORDER BY draw_date DESC",
                conn,
                params=(cutoff.isoformat(),),
            )
        return df
    finally:
        conn.close()


def compute_stats(window: str, n: int) -> dict:
    df = _load_draws(window, n)

    if df.empty:
        return {
            "window_spec": window,
            "n": n,
            "draw_count": 0,
            "date_from": None,
            "date_to": None,
            "chi_square": None,
            "frequencies": [],
            "hot_10": [],
            "cold_10": [],
        }

    draw_count = len(df)

    # Combine upper and lower digits — each draw contributes two numbers
    all_numbers = pd.concat([df["two_upper"], df["two_lower"]], ignore_index=True)
    total_obs = len(all_numbers)
    expected_per_number = total_obs / 100.0

    # Count all 00-99
    all_labels = [f"{i:02d}" for i in range(100)]
    counts = all_numbers.value_counts().reindex(all_labels, fill_value=0)

    observed = counts.values.astype(float)
    chi_stat, p_value = chisquare(observed)

    # Build frequency table
    deviations = observed - expected_per_number
    with np.errstate(divide="ignore", invalid="ignore"):
        z_scores = np.where(
            expected_per_number > 0,
            deviations / np.sqrt(expected_per_number * (1 - 1 / 100)),
            0.0,
        )

    frequencies = [
        {
            "number": all_labels[i],
            "count": int(observed[i]),
            "pct": round(float(observed[i]) / total_obs * 100, 2),
            "expected": round(expected_per_number, 2),
            "deviation": round(float(deviations[i]), 2),
            "z_score": round(float(z_scores[i]), 3),
        }
        for i in range(100)
    ]

    sorted_freq = sorted(frequencies, key=lambda x: x["count"], reverse=True)

    return {
        "window_spec": window,
        "n": n,
        "draw_count": draw_count,
        "total_observations": total_obs,
        "date_from": df["draw_date"].min(),
        "date_to": df["draw_date"].max(),
        "chi_square": {
            "stat": round(float(chi_stat), 4),
            "p_value": round(float(p_value), 4),
            "df": 99,
        },
        "frequencies": frequencies,
        "hot_10": sorted_freq[:10],
        "cold_10": sorted_freq[-10:][::-1],
    }
