# Thai Lottery Lab

Thai Lottery Lab is a local-first web app for exploring Thai Government Lottery history with honest statistics and leakage-safe backtests. It is designed for one user on one machine, stores data in a local SQLite file, and keeps prediction claims intentionally conservative.

## Current status

`M7` is complete in the working tree:
- CSV/JSON import with validation and idempotent inserts
- Dashboard, stats, rolling frequency, and gap analysis
- Walk-forward backtest engine with random, hot, cold, and gap-weighted strategies
- Backtest Lab UI with persisted runs and prediction rows
- Local SQLite export from `/api/export/db`
- Thai and English UI copy

## Stack

- Next.js `16.2.4` + React `19` + TypeScript + Tailwind `4`
- Prisma `7.8` with `@prisma/adapter-better-sqlite3`
- SQLite at `data/app.db`
- FastAPI worker in `worker/` with pandas, numpy, and scipy
- `pnpm` for Node tooling, `uv` for Python tooling

## Quick start

```bash
pnpm install
pnpm dev
```

Local services:
- Web UI: `http://localhost:3000`
- Next API routes: `http://localhost:3000/api`
- Python worker: `http://127.0.0.1:8001`

## Commands

```bash
pnpm dev
pnpm lint
pnpm exec tsc --noEmit
pnpm test:worker
pnpm build
```

## Import format

Required columns:
- `draw_date` in `YYYY-MM-DD`
- `first_prize` as a zero-padded 6-digit string
- `two_lower` as a zero-padded 2-digit string

Derived field:
- `two_upper` is computed from the last two digits of `first_prize`

Optional fields:
- `three_front`
- `three_back`

See [docs/csv_schema.md](/Users/suttikeat/Bank/thai-lottery-lab/docs/csv_schema.md) for the canonical schema and [data/seed/glo_results_seed.csv](/Users/suttikeat/Bank/thai-lottery-lab/data/seed/glo_results_seed.csv) for a sample file.

## App surfaces

Dashboard:
- summary cards for total draws, date range, and latest draw
- recent draws table

Statistics:
- windows: `5y`, `10y`, `15y`, `20y`, `last N`
- frequency table, hot/cold lists, heatmap, deviation bars
- rolling frequency and gap analysis for a selected number

Backtest Lab:
- walk-forward evaluation with `random_baseline`, `hot_n`, `cold_n`, `gap_weighted`
- configurable `k`, lookback or seed, target draw count, minimum history, optional date range
- persisted `BacktestRun` and `BacktestPrediction` rows
- actual-vs-random comparison and per-draw prediction table

## Data storage and export

- Main database file: `data/app.db`
- Import batches and backtest runs are stored in the same SQLite file
- You can export the current database from the Import page or directly via `GET /api/export/db`

The export is a raw SQLite snapshot from the local machine. It is meant for backup and inspection, not as a stable public API format.

## Verification

The current working tree has been verified with:
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test:worker`
- `pnpm build`

Runtime smoke checks have also been exercised against `pnpm dev`, including `POST /api/backtest/run` and `GET /api/export/db`.

## Documentation

- [docs/PROJECT_HANDOFF.md](/Users/suttikeat/Bank/thai-lottery-lab/docs/PROJECT_HANDOFF.md) for durable coding-session context
- [docs/csv_schema.md](/Users/suttikeat/Bank/thai-lottery-lab/docs/csv_schema.md) for import schema details
- [AGENTS.md](/Users/suttikeat/Bank/thai-lottery-lab/AGENTS.md) for repo-specific Next.js warnings

## Notes

- Next.js `16` and Prisma `7` both have breaking changes compared with older defaults; this repo already follows those conventions.
- There are still no automated frontend tests. Worker tests currently cover health, leakage guard, and backtest engine paths.
- The app is educational. Lottery outcomes are random, and nothing here should be interpreted as gambling advice.
