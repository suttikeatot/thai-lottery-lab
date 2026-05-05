# Changelog

## 2026-05-06

- Completed `M5` backtest engine with leakage guard, walk-forward evaluator, strategy registry, worker route, and persistence through Next API routes.
- Completed `M6` Backtest Lab UI with strategy controls, metrics, prediction table, and runtime verification.
- Completed `M7` polish work with SQLite export at `/api/export/db`, export UI on the Import page, reviewed disclaimers, and updated project documentation.
- Added importer compatibility for the historical `lotto.csv` schema, including normalization of Python-style list strings for 3-digit prize columns.
- Added Vitest coverage for importer normalization to protect the real-dataset path.
