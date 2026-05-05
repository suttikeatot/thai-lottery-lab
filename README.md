# Thai Lottery Lab

A local-first, single-user web app for statistical analysis and honest backtesting of Thai Government Lottery (GLO) historical results.

## Features

- **Data Import** — Upload CSV/JSON with GLO draw results
- **Statistics Dashboard** — Frequency analysis across multiple time windows (5y/10y/15y/20y/last N draws)
- **Visualizations** — Heatmap, frequency table, rolling charts, gap analysis, chi-square goodness-of-fit
- **Backtesting Lab** — Walk-forward evaluator with zero data leakage; strategies: random baseline, hot-N, cold-N, gap-weighted
- **Multilingual** — Thai + English (hand-rolled i18n, no next-intl)

## Tech Stack

- **Frontend:** Next.js 16.2 + React 19 + TypeScript + Tailwind 4
- **Backend/Stats:** FastAPI + pandas/numpy/scipy (Python 3.14)
- **Database:** SQLite (local file, no cloud)
- **ORM:** Prisma 7.8 + better-sqlite3 adapter

## Getting Started

```bash
pnpm install
pnpm dev
```

Opens:
- Web UI: http://localhost:3000
- API: http://localhost:3000/api
- Python worker: http://127.0.0.1:8001

## Documentation

- [PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md) — durable context for new coding sessions
- [csv_schema.md](docs/csv_schema.md) — data import schema
- [AGENTS.md](./AGENTS.md) — Next.js 16 breaking changes warning

## Status

**M4 complete** (Rolling frequency chart + gap analysis). Ready for **M5** (Backtest engine implementation).

---

**Not a gambling tool.** The app's educational goal is to demonstrate that no strategy significantly beats random within statistical noise.
