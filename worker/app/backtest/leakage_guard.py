"""Leakage guard: the single point of access for historical draws during backtesting.

Core invariant: a strategy may only see rows where ``draw_date < as_of``.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import date
from pathlib import Path

import pandas as pd

_DEFAULT_DB = str(Path(__file__).parent.parent.parent.parent / "data" / "app.db")


def get_db_path() -> str:
    return os.environ.get("DB_PATH", _DEFAULT_DB)


def connect_readonly() -> sqlite3.Connection:
    return sqlite3.connect(f"file:{get_db_path()}?mode=ro", uri=True)


def get_history(as_of: date) -> pd.DataFrame:
    """Return draws with ``draw_date < as_of``.

    Strategies must receive only this function — never the underlying table —
    so that future rows are structurally invisible.
    """
    conn = connect_readonly()
    try:
        df = pd.read_sql(
            """
            SELECT draw_date, two_upper, two_lower
            FROM draw
            WHERE date(draw_date) < date(?)
            ORDER BY draw_date ASC
            """,
            conn,
            params=(as_of.isoformat(),),
        )
    finally:
        conn.close()

    if not df.empty:
        df["draw_date"] = pd.to_datetime(df["draw_date"]).dt.date
        df["two_upper"] = df["two_upper"].astype(str).str.zfill(2)
        df["two_lower"] = df["two_lower"].astype(str).str.zfill(2)

    return df
