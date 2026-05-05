"""Leakage guard tests."""

from datetime import date
import sqlite3

from app.backtest.leakage_guard import get_history


def test_get_history_returns_only_rows_before_as_of(tmp_path, monkeypatch):
    db_path = tmp_path / "app.db"
    conn = sqlite3.connect(db_path)
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
          ('2024-02-01', '123403', '03', '33', 'test');
        """
    )
    conn.close()
    monkeypatch.setenv("DB_PATH", str(db_path))

    history = get_history(date(2024, 2, 1))

    assert history["draw_date"].max() < date(2024, 2, 1)
    assert history["two_upper"].tolist() == ["01", "02"]
