# Thai Lottery Lab — Project Handoff Document

> **Purpose:** Durable project context for new coding sessions. Do not rely on chat history.  
> **Last updated:** 2026-05-05  
> **Status:** Pre-implementation (M0 not yet started)

---

## 1. Project Overview

A local-first, single-user web app for **statistical analysis and backtesting** of Thai Government Lottery (GLO) historical results. The app focuses on the two-digit numbers drawn each session and provides frequency analytics across multiple time windows plus an honest, leakage-free backtesting lab.

---

## 2. Product Goal

Help hobbyists and data-curious users:
- Explore which two-digit numbers appear most/least often across any time window.
- Understand deviation from expected uniform distribution.
- Run simple prediction strategies honestly (walk-forward, no lookahead) and confirm that no strategy significantly beats random.

**Not a gambling tool.** The app's expected conclusion is "no strategy beats random within statistical noise." Every prediction-related view must carry an educational disclaimer.

---

## 3. Current MVP Scope (v1)

- CSV/JSON import + validation of GLO historical results.
- Local SQLite store (single file).
- Statistics dashboard with windows: **5y / 10y / 15y / 20y / last N draws** (N configurable; presets: 9, 10, 20, 50).
- Visualizations: frequency table, hot/cold top-10, 10×10 heatmap (`00`–`99`), rolling frequency line chart, deviation-from-uniform chart, chi-square goodness-of-fit.
- Backtesting Lab with strategies: random baseline, hot-N, cold-N, gap-weighted.
- Thai + English UI (next-intl).

---

## 4. Non-Goals for v1

- Web scraping / live updates / scheduled jobs.
- Multi-user accounts, authentication, cloud deployment.
- Deep 3-digit front/back analytics (data stored, no full UI).
- ML models (LSTM, gradient boosting, etc.).
- Mobile-native app.
- Any monetization or gambling-facilitation features.

---

## 5. Tech Stack Decisions

| Layer | Choice | Reason |
|---|---|---|
| Frontend + API | Next.js 15 (App Router) + TypeScript | Full-stack TS, App Router patterns |
| Styling | Tailwind + shadcn/ui | Rapid UI with accessible primitives |
| Charts | Recharts + ECharts (heatmap) | Recharts simple; ECharts for 10×10 grid |
| i18n | next-intl | Best-in-class App Router integration |
| DB | SQLite via Prisma | Local-first, zero-ops, single file |
| Python worker | FastAPI + pandas + numpy + scipy | Heavy stats & backtesting; localhost HTTP |
| Python tooling | uv (v0.11.7 confirmed on machine) | Fast dependency management |
| Node tooling | pnpm | **Not yet installed on this machine** — must install before M0 |
| Validation | Zod (TS) + Pydantic (Py) | Shared schema discipline |
| Testing | Vitest + pytest + Playwright (1 E2E) | |
| Node version | v25.9.0 (confirmed on machine) | |
| Python version | 3.14.4 (confirmed on machine) | |

---

## 6. Architecture Overview

```
Browser (Next.js UI)
   │  fetch
   ▼
Next.js API routes  ──── Prisma ────▶  SQLite  data/app.db
   │  HTTP localhost:8001
   ▼
Python FastAPI worker  ──── read-only ──▶  same SQLite
   app/stats/
   app/backtest/
     engine.py          (walk-forward evaluator)
     leakage_guard.py   (get_history(as_of) — core leakage fence)
     strategies/
```

- **Next.js** owns: imports, CRUD, UI, i18n, thin stats (counts).
- **Python worker** owns: chi-square, rolling stats, Wilson CIs, backtesting engine.
- Worker opens SQLite **read-only** to avoid write conflicts.
- Worker started as a child process alongside `pnpm dev` (via concurrently).

---

## 7. Folder Structure

```
thai-lottery-lab/
├── app/
│   ├── (dashboard)/page.tsx
│   ├── stats/page.tsx
│   ├── backtest/page.tsx
│   ├── import/page.tsx
│   └── api/
│       ├── draws/route.ts
│       ├── stats/route.ts       # proxies to Python
│       └── backtest/route.ts
├── components/
├── lib/                         # Prisma client, i18n config, TS utils
├── messages/
│   ├── en.json
│   └── th.json
├── prisma/
│   └── schema.prisma
├── worker/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── stats/
│   │   └── backtest/
│   │       ├── engine.py
│   │       ├── leakage_guard.py
│   │       └── strategies/
│   └── tests/
├── data/
│   ├── app.db                   # gitignored
│   └── seed/
│       └── glo_results_seed.csv
├── docs/
│   └── PROJECT_HANDOFF.md       # this file
└── scripts/
```

---

## 8. Data Model

### `Draw` (core table)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| draw_date | DATE UNIQUE NOT NULL | Canonical key |
| first_prize | TEXT NOT NULL | 6 digits, zero-padded string |
| two_upper | TEXT NOT NULL | Derived: `first_prize[-2:]` |
| two_lower | TEXT NOT NULL | Official GLO 2-digit bottom prize |
| three_front | TEXT NULL | Comma-separated, optional |
| three_back | TEXT NULL | Comma-separated, optional |
| source | TEXT NOT NULL | e.g. `"csv:filename"` |
| imported_at | DATETIME NOT NULL | |

### `ImportBatch`
`id, filename, row_count, ok_count, error_count, created_at`

### `BacktestRun`
`id, strategy_key, params_json, window_spec_json, start_date, end_date, n_targets, created_at, metrics_json`

### `BacktestPrediction`
`id, run_id, target_draw_date, predicted_numbers_json, actual_two_upper, actual_two_lower, hit_upper BOOL, hit_lower BOOL`

Indexes: `Draw(draw_date)`, `BacktestPrediction(run_id, target_draw_date)`.

---

## 9. Important Business / Domain Definitions

- **Two-digit upper (เลขท้าย 2 ตัวบน):** Last two digits of the 1st prize number.
- **Two-digit lower (เลขท้าย 2 ตัวล่าง):** Official separate 2-digit bottom prize from GLO.
- Both are **zero-padded strings** `"00"`–`"99"`. Never store as bare integers for analytics keys.
- Two-digit space = 100 possible values; uniform expected probability = **1% per number**.
- GLO draws occur on the **1st and 16th** of each month (with documented historical exceptions). Schedule is metadata only — not derived by the app.

---

## 10. Data Source Strategy

- **v1:** User-supplied CSV/JSON only. No scraping.
- Provide a documented CSV schema and a sample seed file at `data/seed/glo_results_seed.csv`.
- Importer is **idempotent** — re-importing the same file is a no-op; new rows append.
- Validation errors are collected and shown in the UI (per-row error report).
- Future (out of scope): optional scraper module behind a feature flag.

### CSV/JSON schema (required columns)
`draw_date, first_prize, two_lower` — `two_upper` is derived; `three_front`, `three_back` optional.

---

## 11. Statistical Methodology Decisions

For a window `W` of draws:
- **Frequency count** and **frequency %** per number.
- **Expected** = `|W| / 100`; **deviation** = observed − expected; **z-score** under multinomial approximation.
- **Top-k hot / bottom-k cold** lists.
- **Rolling frequency** for a chosen number (configurable window size).
- **Gap analysis:** current gap (draws since last appearance) + historical gap distribution.
- **Chi-square goodness-of-fit** vs uniform (df=99); p-value shown with caveat that significance ≠ predictability.
- **Pair co-occurrence** (upper vs lower on same draw) — optional in MVP.

Windows: `5y`, `10y`, `15y`, `20y`, `last N` (configurable).

---

## 12. Backtesting and Data Leakage Rules

### Core rule
For every target draw date `T`, a strategy may **only** see rows where `draw_date < T`.

### How it is enforced

1. **`leakage_guard.get_history(as_of: date) -> DataFrame`** — single access function in the Python worker. Returns only rows with `draw_date < as_of`. Strategies receive only this function.
2. **Walk-forward evaluator** (`engine.py`) — iterates target dates oldest → newest; calls `get_history(T)` per step; fetches the actual result separately (never passed to the strategy).
3. **No global fit step** touching the test window. Hyperparameters are user-fixed.
4. **Deterministic seeds** for any randomness, recorded in `BacktestRun.params_json`.
5. **Audit log:** each prediction records the `as_of` date + hash of history slice.
6. **Unit tests** assert that a "cheating" strategy (returning the actual answer) scores correctly and that history slices contain no future rows.
7. **UI guardrails:** date pickers cannot select overlapping train/test windows; form shows the resulting split.

### Strategies (v1)
1. **Random baseline** — uniform sample of k numbers (seeded).
2. **Hot-N** — top-k most frequent in last N draws.
3. **Cold-N** — bottom-k least frequent in last N draws (expected to fail; included to demonstrate).
4. **Gap-weighted** — rank by current gap vs historical mean gap.

---

## 13. Completed Milestones

**None.** Project has not yet been initialized.

---

## 14. Current Implementation Status

Pre-implementation. Planning phase complete. No code written yet.

- Project directory created: `/Users/suttikeat/Bank/thai-lottery-lab/`
- This handoff document created.
- No `package.json`, no `pyproject.toml`, no SQLite file.

---

## 15. Files Created or Modified So Far

```
/Users/suttikeat/Bank/thai-lottery-lab/docs/PROJECT_HANDOFF.md   ← this file (NEW)
```

---

## 16. Important Design Decisions and Reasons

| Decision | Reason |
|---|---|
| Manual CSV import only (no scraping) | Simplicity for v1; avoids GLO ToS risk |
| Single SQLite file | Local-first; zero operational overhead |
| Python worker as separate process | pandas/scipy are the right tools for heavy stats; TS analytics tooling is weaker |
| Worker opens SQLite read-only | Prevents write conflicts with Prisma |
| `get_history(as_of)` as the sole data access function for strategies | Structural leakage prevention; impossible to bypass accidentally |
| Hyperparameters user-fixed, not auto-tuned | Prevents test-set leakage through hyperparameter optimization |
| Thai + English from day one | Target audience is Thai; English for accessibility; retrofitting i18n is painful |
| pnpm not yet installed | Must install before any `pnpm` commands |

---

## 17. Known Issues or Limitations

- **pnpm not installed** on the machine. Must run `npm install -g pnpm` or `corepack enable pnpm` before M0.
- Node v25.9.0 is very recent (bleeding-edge). If any Next.js 15 dependency fails, downgrade to Node LTS (22.x) via `nvm`.
- Python 3.14.4 is a pre-release/dev version. If any scipy/pandas build fails, use 3.12 LTS as a fallback via `uv python install 3.12`.
- Historical GLO data quality depends entirely on the user's seed CSV. The app validates but cannot fix typos in source data.

---

## 18. Pending Tasks

- [ ] **M0:** Install pnpm, scaffold Next.js app, set up Prisma + SQLite, set up Python worker with uv, wire `pnpm dev` to boot both, stub `leakage_guard.py` with a failing test, i18n stub.
- [ ] **M1:** CSV/JSON importer, validation, error report UI, idempotent insert, seed file.
- [ ] **M2:** Dashboard (summary cards, latest draws table, language toggle).
- [ ] **M3:** Statistics page (window picker, frequency table, heatmap, deviation chart, chi-square).
- [ ] **M4:** Rolling frequency chart, gap analysis.
- [ ] **M5:** Backtest engine (leakage guard, walk-forward, strategies, DB persistence, unit tests).
- [ ] **M6:** Backtest UI (form, run/progress, results page with metrics and lift chart).
- [ ] **M7:** Thai translation review, disclaimers, DB export, README.

---

## 19. Next Recommended Milestone

**M0 — Repo Scaffolding**

Estimated effort: 1–2 hours.

---

## 20. Exact Instructions for the Next Coding Agent / Session

### Context
- Project root: `/Users/suttikeat/Bank/thai-lottery-lab/`
- Node: v25.9.0 | Python: 3.14.4 | uv: 0.11.7
- pnpm: **NOT installed** — install it first.
- No code exists yet. Start from scratch.

### Step-by-step M0 tasks

**Step 1 — Install pnpm**
```bash
corepack enable pnpm
# OR if corepack is not available:
npm install -g pnpm
```

**Step 2 — Scaffold Next.js app**
```bash
cd /Users/suttikeat/Bank/thai-lottery-lab
pnpm create next-app . \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --no-git
```

**Step 3 — Add dependencies**
```bash
pnpm add next-intl
pnpm add -D @types/node
pnpm dlx shadcn@latest init
pnpm add @prisma/client
pnpm add -D prisma
```

**Step 4 — Set up Prisma**
- Run `pnpm prisma init --datasource-provider sqlite`
- Write `prisma/schema.prisma` with the `Draw`, `ImportBatch`, `BacktestRun`, `BacktestPrediction` models (see §8 above).
- Run `pnpm prisma migrate dev --name init`
- Add `data/app.db` to `.gitignore`

**Step 5 — Set up next-intl**
- Create `messages/en.json` and `messages/th.json` with stub keys.
- Configure `i18n/routing.ts`, `middleware.ts`, `next.config.ts` per next-intl App Router docs.
- Add a language toggle component to the root layout.

**Step 6 — Set up Python worker**
```bash
cd worker
uv init
uv add fastapi uvicorn pandas numpy scipy sqlalchemy pydantic
uv add --dev pytest httpx
```
- Create `worker/app/main.py` with FastAPI app and `GET /health` returning `{"status": "ok"}`.
- Create `worker/app/backtest/leakage_guard.py` with:
  ```python
  def get_history(as_of: date) -> pd.DataFrame:
      raise NotImplementedError  # implemented in M5
  ```
- Create `worker/tests/test_leakage_guard.py` with a failing placeholder test.

**Step 7 — Wire concurrently**
```bash
pnpm add -D concurrently
```
Update `package.json` `dev` script:
```json
"dev": "concurrently \"next dev\" \"cd worker && uv run uvicorn app.main:app --port 8001 --reload\""
```

**Step 8 — Smoke-test API route**
- Create `app/api/health/route.ts` that proxies `GET http://localhost:8001/health`.
- Verify with `curl http://localhost:3000/api/health`.

**Step 9 — Acceptance check**
- `pnpm dev` starts both Next.js and Python worker without errors.
- `curl http://localhost:3000` returns the Next.js UI.
- `curl http://localhost:8001/health` returns `{"status":"ok"}`.
- `pnpm prisma migrate dev` succeeds.
- Language toggle renders in the UI.
- `cd worker && uv run pytest` runs (1 failing test is expected for leakage_guard).

**Step 10 — Git init and first commit**
```bash
cd /Users/suttikeat/Bank/thai-lottery-lab
git init
git add -A
git commit -m "M0: project skeleton — Next.js + Python worker + Prisma + i18n stub"
git tag v0.0.1-skeleton
```

After M0 is green, proceed to **M1 (Data Import)**.
