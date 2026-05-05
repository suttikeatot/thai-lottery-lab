# Thai Lottery Lab — Project Handoff Document

> **Purpose:** Durable project context for new coding sessions. Do not rely on chat history.  
> **Last updated:** 2026-05-06  
> **Status:** **M7 complete.** Copy/disclaimer review, SQLite export, and documentation updates have been added. Next work is bug fixing, broader automated tests, or new product scope.

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
| Frontend + API | **Next.js 16.2.4** (App Router) + TypeScript 5 + React 19.2 | Full-stack TS. **Note: Next 16 has breaking changes** (e.g. `proxy.ts` replaces `middleware.ts`, `LayoutProps<"/[lang]">` and `PageProps` are global). Read `node_modules/next/dist/docs/` before writing Next.js code. |
| Styling | Tailwind 4 (no shadcn yet) | Rapid UI; shadcn deferred to a later milestone |
| Charts | Recharts + ECharts (heatmap) | Planned for M3 |
| i18n | **Hand-rolled** with `[lang]` route segment + `lib/i18n.ts` | next-intl deferred. Self-rolled is lighter and avoids Next-16-compat risk. Dictionaries at `messages/{en,th}.json`. |
| DB | SQLite via **Prisma 7.8** + **`@prisma/adapter-better-sqlite3`** | Prisma 7 changed config: `url` lives in `prisma.config.ts`, not the schema. Adapter required at runtime. |
| Python worker | FastAPI + pandas + numpy + scipy | Heavy stats & backtesting; localhost:8001 HTTP |
| Python tooling | **uv 0.11.7**, Python **3.14.4** | uv project at `worker/`. requires-python = ">=3.12". |
| Node tooling | **pnpm 10.33.3** (installed via `npm i -g pnpm` — corepack not present) | |
| Validation | Zod (TS) + Pydantic (Py) — added in later milestones | |
| Testing | pytest (worker, present), Vitest + Playwright (deferred) | |
| Node version | v25.9.0 | |

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

### M0 — Skeleton ✅
- Next.js 16.2.4 + TypeScript + Tailwind 4 scaffolded.
- Prisma 7.8 with `Draw`, `ImportBatch`, `BacktestRun`, `BacktestPrediction` models. Initial migration `20260505063539_init` applied. SQLite at `data/app.db` (gitignored). Adapter wired in `lib/prisma.ts`.
- Hand-rolled i18n: `app/[lang]/`, `messages/{en,th}.json`, `lib/i18n.ts`, `components/LangSwitcher.tsx`. Default-locale redirect via root `proxy.ts` (Next-16 convention).
- FastAPI worker at `worker/` (uv project) with `GET /health` and `app/backtest/leakage_guard.py` stub. pytest suite passes (2/2): health smoke + leakage guard NotImplemented.
- Next.js `app/api/health/route.ts` proxies the worker. `components/HealthBadge.tsx` polls it from the home page.
- `pnpm dev` runs both servers concurrently. Smoke-tested: `/`, `/en`, `/th`, `/api/health`, worker `:8001/health` all return 200.
- `pnpm build` produces a clean production build with three routes.

### M1 — Data Import ✅
- `docs/csv_schema.md` — canonical CSV/JSON schema documentation.
- `data/seed/glo_results_seed.csv` — 10 sample rows for development.
- `lib/import/validate.ts` — Zod-based row validator; derives `two_upper` from `first_prize`; collects per-row errors; deduplicates within a single file.
- `lib/import/import.ts` — idempotent inserter; queries existing `draw_date`s and skips them; creates `ImportBatch` record per upload.
- `app/api/imports/route.ts` — `POST` multipart handler; accepts `.csv` (papaparse) or `.json`; returns `{ batch, errors }`.
- `app/[lang]/import/page.tsx` — server page passing i18n strings to `components/ImportForm.tsx`.
- `components/ImportForm.tsx` — client component: file input, upload button, success panel with inserted/skipped counts, per-row error table.
- `messages/{en,th}.json` — `import.*` keys added in both languages.
- Acceptance verified: importing seed twice gives inserted=10 then inserted=0; malformed rows surface in error report.

### M5 — Backtest Engine ✅
- `worker/app/backtest/leakage_guard.py` now opens SQLite read-only and returns only rows where `draw_date < as_of`.
- Walk-forward evaluator added in `worker/app/backtest/engine.py`; it fetches actual results separately and records `as_of`, `history_count`, and `history_hash` per prediction.
- Strategies implemented: `random_baseline`, `hot_n`, `cold_n`, `gap_weighted`.
- FastAPI worker route `POST /backtest/run` added.
- Next.js route `POST /api/backtest/run` added; it calls the worker and persists `BacktestRun` + `BacktestPrediction` rows via Prisma.
- pytest suite covers leakage guard, cheating-strategy scoring, and random-baseline e2e execution.
- Stats fetch hardening added with `AbortController` cleanup in `StatsView.tsx` and `NumberAnalysis.tsx`.
- Verification: `pnpm test:worker` (4 passed), `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` all pass. Initial sandboxed build failed because Google Fonts could not be fetched; rerun with network access passed.

### M6 — Backtest UI ✅
- `/[lang]/backtest` now renders a usable Backtest Lab instead of a placeholder.
- `components/BacktestLab.tsx` added with strategy selector, `k`, seed/lookback params, target window controls, optional date range, loading/error states, metrics cards, actual-vs-random bars, and prediction table.
- `app/api/backtest/run/route.ts` now returns `predictions`, `start_date`, and `end_date` to support the UI results view while still persisting runs/predictions.
- `messages/{en,th}.json` gained `backtest.*` keys for all visible UI strings.
- Runtime verified under `pnpm dev`: `/en/backtest` returns 200 and `POST /api/backtest/run` returns `run_id`, metrics, predictions, start date, and end date.

### M7 — Polish, Export, README ✅
- `app/api/export/db/route.ts` added to download the current SQLite database as a raw local snapshot.
- `components/ImportForm.tsx` now includes a database export section linked to `/api/export/db`.
- `messages/{en,th}.json` disclaimers and export-related copy were reviewed and tightened.
- `README.md` was rewritten to match the real current feature set and setup flow.
- `CHANGELOG.md` was added with a concise summary of M5–M7 work.
- Runtime verified under `pnpm dev`: `GET /api/export/db` returns a downloadable SQLite file.

---

## 14. Current Implementation Status

**M7 complete.** Export, copy review, and documentation are now aligned with the working tree. Remaining work is optional polish or broader test coverage rather than a defined milestone.

---

## 15. Files Created or Modified So Far

Top-level (all under `/Users/suttikeat/Bank/thai-lottery-lab/`):

- `package.json` — scripts: `dev` (concurrently web+worker), `dev:web`, `dev:worker`, `build`, `start`, `lint`, `test:worker`. Added `pnpm.onlyBuiltDependencies` for prisma + better-sqlite3.
- `prisma.config.ts` — Prisma 7 config (datasource URL, migrations path).
- `prisma/schema.prisma` — 4 models.
- `prisma/migrations/20260505063539_init/migration.sql` — initial migration.
- `proxy.ts` — locale redirect.
- `.env` — `DATABASE_URL`.
- `.gitignore` — adds `/data/*.db`, python caches, `.venv`.
- `lib/prisma.ts` — Prisma client singleton with adapter.
- `lib/i18n.ts` — locale list, dictionary loader, `t()` helper.
- `messages/{en,th}.json` — string catalogs.
- `app/[lang]/layout.tsx` — root layout, header w/ lang switcher, footer w/ disclaimer.
- `app/[lang]/page.tsx` — home page with health badge.
- `app/api/health/route.ts` — proxies to `http://127.0.0.1:8001/health`.
- `components/LangSwitcher.tsx`, `components/HealthBadge.tsx`.
- `worker/pyproject.toml` — fastapi, uvicorn, pandas, numpy, scipy, pydantic + dev: pytest, httpx.
- `worker/pytest.ini` — `pythonpath = .`.
- `worker/app/main.py` — FastAPI app with `/health`.
- `worker/app/backtest/leakage_guard.py` — stub raising NotImplementedError.
- `worker/tests/test_health.py`, `worker/tests/test_leakage_guard.py`.
- `docs/PROJECT_HANDOFF.md` — this file.
- `docs/csv_schema.md` — CSV/JSON import schema documentation.

**Added in M1:**
- `data/seed/glo_results_seed.csv` — 10-row development seed file.
- `lib/import/validate.ts` — Zod row validator.
- `lib/import/import.ts` — idempotent Prisma inserter.
- `app/api/imports/route.ts` — POST multipart import API route.
- `app/[lang]/import/page.tsx` — server page for import UI.
- `components/ImportForm.tsx` — client component with file input and result panel.
- `package.json` — added `papaparse`, `zod`, `@types/papaparse`.

**Added in M5:**
- `worker/app/backtest/engine.py` — walk-forward evaluator, target-date selection, metrics, and history hashing.
- `worker/app/backtest/router.py` — FastAPI `POST /backtest/run`.
- `worker/app/backtest/strategies/common.py` — strategy helpers for labels, frequencies, and prediction normalization.
- `worker/app/backtest/strategies/random_baseline.py` — seeded uniform baseline.
- `worker/app/backtest/strategies/hot_n.py` — top-k recent-frequency strategy.
- `worker/app/backtest/strategies/cold_n.py` — bottom-k recent-frequency strategy.
- `worker/app/backtest/strategies/gap_weighted.py` — gap/mean-gap ranking strategy.
- `app/api/backtest/run/route.ts` — Next API route that calls the worker and persists runs/predictions.
- `worker/tests/test_backtest.py` — engine and strategy e2e tests.
- `components/StatsView.tsx`, `components/NumberAnalysis.tsx` — fetch cleanup with `AbortController`.

**Added in M6:**
- `components/BacktestLab.tsx` — client UI for running backtests and displaying results.
- `app/[lang]/backtest/page.tsx` — replaced placeholder page with Backtest Lab wiring and i18n strings.
- `messages/en.json`, `messages/th.json` — `backtest.*` translations.
- `app/api/backtest/run/route.ts` — response expanded to include predictions and target range.

**Added in M7:**
- `app/api/export/db/route.ts` — SQLite download endpoint.
- `README.md` — rewritten to reflect M7 state and runtime workflows.
- `CHANGELOG.md` — milestone summary.
- `components/ImportForm.tsx` — export/download surface in the import page.

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

- **Next.js 16** is newer than typical training data. Always consult `node_modules/next/dist/docs/` (especially for `proxy.ts`, `LayoutProps`, `PageProps`, route conventions) before writing Next-specific code. AGENTS.md in repo root carries the same warning.
- **Prisma 7** requires `prisma.config.ts` for migrate CLI (`datasource.url` lives there, not in `schema.prisma`). Schema only declares the provider.
- **better-sqlite3** is a native module; `pnpm` requires it under `pnpm.onlyBuiltDependencies` to compile. If you fully nuke `node_modules`, run `pnpm rebuild better-sqlite3`.
- **next-intl was NOT used** in M0 (despite the original plan). The hand-rolled i18n is intentionally simpler. Switch to next-intl only if a feature requires it (e.g. ICU plural rules at scale).
- **shadcn/ui not installed**. Add it when the first non-trivial component needs it.
- Historical GLO data quality depends entirely on the user's seed CSV. The app validates but cannot fix typos in source data.
- **No automated tests for Next.js side** — export and UI runtime were smoke-tested manually, but there is still no dedicated frontend test harness.
- **No pytest for stats/compute.py** — worker coverage now includes health, leakage guard, and backtest engine, but stats compute tests are still planned for M7.
- **Only 10 seed rows** — all charts and statistics look sparse/extreme with prototype data. Import real GLO data to see meaningful output.

---

## 17b. Bug Log

Bugs found during manual UI testing (2026-05-06). All fixed in the same session.

### BUG-001 — Stats page stuck on "Loading…" ✅ Fixed
- **Symptom:** `/en/stats` showed "Loading…" indefinitely; data never appeared.
- **Root cause:** `StatsView.tsx` used `const [window, setWindow] = useState("5y")` — the name `window` shadows the browser global `window` object. React's state update triggered the effect but the fetch URL construction silently misbehaved.
- **Fix:** Renamed state to `selectedWindow` in `StatsView.tsx`.
- **File:** `components/StatsView.tsx`

### BUG-002 — App freezes / navigation stops after 3–4 page switches ✅ Fixed
- **Symptom:** After switching between pages 3–4 times, all nav links became unresponsive. The entire React tree appeared to be crashed.
- **Root cause:** ECharts `init()` was called on DOM elements that already had a chart instance (from a previous render cycle). Calling `echarts.init()` on an already-initialized element throws an internal error that crashes the React tree. The cleanup (`chart.dispose()`) in `useEffect` runs on unmount but Next.js App Router soft-navigation does not always fully unmount client components.
- **Fix:** Extracted a `useChart()` hook that calls `echarts.getInstanceByDom(el)` first, disposes any existing instance, then initializes fresh. Applied to both `StatsView.tsx` and `NumberAnalysis.tsx`.
- **Files:** `components/StatsView.tsx`, `components/NumberAnalysis.tsx`
- **Pattern to follow for all future ECharts usage:**
  ```ts
  const existing = echarts.getInstanceByDom(el);
  if (existing) existing.dispose();
  const chart = echarts.init(el);
  ```

### BUG-003 — `/backtest` nav link returns 404 ✅ Fixed
- **Symptom:** Clicking the Backtest nav link showed Next.js 404 page.
- **Root cause:** `app/[lang]/backtest/page.tsx` was never created (M6 milestone not yet started).
- **Fix:** Created stub page with "Coming in M5–M6." message.
- **File:** `app/[lang]/backtest/page.tsx`

### BUG-004 — Stats page "Loading…" stuck + nav freezes after a few page switches ✅ Fixed (operational)
- **Symptom (recurrence of BUG-001/002 patterns):** `/en/stats` showed "Loading…" indefinitely; after switching dashboard → stats → backtest → import the app froze and nav links became unresponsive.
- **Root cause:** The Python worker (`uvicorn` PID 42330 + child 42332) was in **STAT=T (stopped)** — likely from an accidental Ctrl+Z in the `pnpm dev` terminal, or a `kill -STOP` from elsewhere. The socket on `:8001` stayed bound (LISTEN) so connections established but never got a response.
  - That alone explains the stuck "Loading…" on stats (rolling/gap fetches hung).
  - It also explains the navigation freeze: in-flight fetches from a previous stats visit are not aborted on unmount, so each visit leaks 2 hung connections; after ~3 visits the browser hits its 6-connections-per-origin cap and any new fetch (RSC, HMR) blocks → app appears frozen.
- **Fix (operational):** `kill -CONT` then `kill -9` the suspended PIDs to free port 8001, then restart `pnpm dev`. A stopped uvicorn cannot receive SIGTERM until resumed.
- **Code-side hardening:** `AbortController` cleanup has been added to `StatsView.tsx` and `NumberAnalysis.tsx` so unmount/dep-change cancels pending fetches.
- **Diagnosis recipe (for future debugging):**
  ```bash
  lsof -i :8001 -P -n          # is something bound?
  ps -p <PID> -o stat,command  # STAT=T means stopped — workers can't reply
  curl -m 3 http://127.0.0.1:8001/health
  ```

---

## 18. Pending Tasks

- [x] **M0:** Skeleton — done.
- [x] **M1:** CSV/JSON importer, validation, error report UI, idempotent insert, seed file — done.
- [x] **M2:** Dashboard (summary cards, latest draws table, nav links, language toggle) — done.
- [x] **M3:** Statistics page (window picker, frequency table, heatmap, deviation chart, chi-square) — done.
- [x] **M4:** Rolling frequency chart, gap analysis — done.
- [x] **M5:** Backtest engine (leakage guard, walk-forward, strategies, DB persistence, unit tests) — done.
- [x] **M6:** Backtest UI (form, run/progress, results page with metrics and lift chart) — done.
- [x] **M7:** Thai translation review, disclaimers, DB export, README — done.

---

## 19. Next Recommended Milestone

**Post-M7 Priorities**

Estimated effort: variable.

Goals:
- Add frontend automated tests for import, stats, backtest, and export flows.
- Fix bugs found from larger real-data imports and longer browser sessions.
- Decide whether to extend analytics scope or keep the app frozen as an MVP.

### Important reminders for next agent

- **ECharts pattern** — always call `echarts.getInstanceByDom(el)` and dispose before `echarts.init()`. See BUG-002 in §17b.
- **Never name a state variable `window`** — it shadows the browser global. See BUG-001 in §17b.
- **If "Loading…" hangs and/or nav freezes after a few page switches, check if the worker is suspended** (`ps -p <PID> -o stat` → `T`). See BUG-004.
- **Backtest audit data** — the worker returns `as_of`, `history_count`, and `history_hash` per prediction. Current Prisma schema does not have dedicated columns for these fields, so the Next API persists them inside `BacktestRun.metrics_json.audit`.
- **Read `node_modules/next/dist/docs/` before any Next-specific work.**
- **Prisma 7** datasource URL is in `prisma.config.ts`, not the schema.
- **i18n keys** — every new visible string belongs in both `messages/en.json` and `messages/th.json`.
- After milestone acceptance, update §13–§19 of this handoff before stopping.

---

## 20. Exact Instructions for the Next Coding Agent / Session

### Context
- Project root: `/Users/suttikeat/Bank/thai-lottery-lab/`
- Branch: `m5/backtest-engine`
- Node v25.9.0 | Python 3.14.4 | uv 0.11.7 | pnpm 10.33.3
- **M0–M7 complete.** Continue on `m5/backtest-engine` for bug fixes or open a new branch for new scope.

### Sanity check before coding
```bash
cd /Users/suttikeat/Bank/thai-lottery-lab
pnpm install              # idempotent
pnpm exec next build      # must succeed — currently 11 routes including /api/backtest/run
pnpm test:worker          # must show 4 passed
pnpm dev                  # http://localhost:3000 + worker on :8001
```

### Post-M7 Suggestions

1. Add Vitest or Playwright coverage for the export path and the main interactive pages.
2. Re-run the app with a larger real historical dataset and inspect statistical outputs for edge-case bugs.
3. If the product scope stays local-first, keep the SQLite export path and avoid adding cloud/auth complexity.

### Important reminders for the next agent

- **Read `node_modules/next/dist/docs/` before any Next-specific work.** Next 16 has breaking changes — `proxy.ts` not `middleware.ts`; `LayoutProps<"...">` and `PageProps<"...">` are global helpers; routes under `app/[lang]/` need typed `params: Promise<{ lang: string }>`.
- **Prisma 7** datasource URL is in `prisma.config.ts`, not the schema. Don't try to add `url` back to `schema.prisma`.
- **Default to no comments** in code unless the *why* is non-obvious.
- **i18n keys** — every new visible string belongs in both `messages/en.json` and `messages/th.json`. Reach for the `t(dict, "key")` helper in `lib/i18n.ts`.
- After future work, update §13–§19 of this handoff before stopping.
