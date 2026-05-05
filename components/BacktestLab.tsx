"use client";

import { FormEvent, useMemo, useState } from "react";

type StrategyKey = "random_baseline" | "hot_n" | "cold_n" | "gap_weighted";

type Metrics = {
  n_targets: number;
  k: number;
  hit_upper: number;
  hit_lower: number;
  hit_any: number;
  hit_upper_rate: number;
  hit_lower_rate: number;
  hit_any_rate: number;
  expected_random_upper_rate: number;
  expected_random_any_rate: number;
};

type Prediction = {
  target_date: string;
  predicted: string[];
  actual_upper: string;
  actual_lower: string;
  hit_upper: boolean;
  hit_lower: boolean;
};

type RunResult = {
  run_id: number;
  metrics: Metrics;
  predictions: Prediction[];
  start_date: string | null;
  end_date: string | null;
};

type Strings = {
  title: string;
  description: string;
  disclaimer: string;
  strategy: string;
  randomBaseline: string;
  hotN: string;
  coldN: string;
  gapWeighted: string;
  k: string;
  seed: string;
  lookback: string;
  lastTargets: string;
  minHistory: string;
  dateFrom: string;
  dateTo: string;
  optional: string;
  run: string;
  running: string;
  reset: string;
  errorTitle: string;
  results: string;
  runId: string;
  targetRange: string;
  noRange: string;
  nTargets: string;
  hitUpper: string;
  hitLower: string;
  hitAny: string;
  expectedRandomUpper: string;
  expectedRandomAny: string;
  liftTitle: string;
  actual: string;
  expected: string;
  predictions: string;
  colDate: string;
  colPredicted: string;
  colActualUpper: string;
  colActualLower: string;
  colHitUpper: string;
  colHitLower: string;
  yes: string;
  no: string;
};

const STRATEGIES: StrategyKey[] = [
  "random_baseline",
  "hot_n",
  "cold_n",
  "gap_weighted",
];

function pct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function clampRate(value: number) {
  return `${Math.min(100, Math.max(0, value * 100)).toFixed(2)}%`;
}

function strategyLabel(strings: Strings, strategy: StrategyKey) {
  return {
    random_baseline: strings.randomBaseline,
    hot_n: strings.hotN,
    cold_n: strings.coldN,
    gap_weighted: strings.gapWeighted,
  }[strategy];
}

export function BacktestLab({ strings }: { strings: Strings }) {
  const [strategyKey, setStrategyKey] = useState<StrategyKey>("random_baseline");
  const [k, setK] = useState(5);
  const [seed, setSeed] = useState(7);
  const [lookback, setLookback] = useState(50);
  const [lastTargets, setLastTargets] = useState(10);
  const [minHistory, setMinHistory] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const params = useMemo(() => {
    if (strategyKey === "random_baseline") return { seed };
    return { lookback };
  }, [strategyKey, seed, lookback]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const windowSpec: Record<string, string | number> = {
      min_history: minHistory,
      last_n_targets: lastTargets,
    };
    if (startDate) windowSpec.start_date = startDate;
    if (endDate) windowSpec.end_date = endDate;

    try {
      const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_key: strategyKey,
          params,
          window_spec: windowSpec,
          k,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unknown error");
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const metricCards = result
    ? [
        [strings.nTargets, result.metrics.n_targets],
        [strings.hitUpper, `${result.metrics.hit_upper} (${pct(result.metrics.hit_upper_rate)})`],
        [strings.hitLower, `${result.metrics.hit_lower} (${pct(result.metrics.hit_lower_rate)})`],
        [strings.hitAny, `${result.metrics.hit_any} (${pct(result.metrics.hit_any_rate)})`],
        [strings.expectedRandomUpper, pct(result.metrics.expected_random_upper_rate)],
        [strings.expectedRandomAny, pct(result.metrics.expected_random_any_rate)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <section className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-100">
        {strings.disclaimer}
      </section>

      <form
        onSubmit={onSubmit}
        className="grid gap-5 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-zinc-500">{strings.strategy}</span>
            <select
              value={strategyKey}
              onChange={(event) => setStrategyKey(event.target.value as StrategyKey)}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {STRATEGIES.map((strategy) => (
                <option key={strategy} value={strategy}>
                  {strategyLabel(strings, strategy)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-500">{strings.k}</span>
            <input
              type="number"
              min={1}
              max={100}
              value={k}
              onChange={(event) => setK(Number(event.target.value))}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          {strategyKey === "random_baseline" ? (
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-500">{strings.seed}</span>
              <input
                type="number"
                value={seed}
                onChange={(event) => setSeed(Number(event.target.value))}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          ) : (
            <label className="grid gap-1 text-sm">
              <span className="text-zinc-500">{strings.lookback}</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={lookback}
                onChange={(event) => setLookback(Number(event.target.value))}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          )}

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-500">{strings.lastTargets}</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={lastTargets}
              onChange={(event) => setLastTargets(Number(event.target.value))}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-500">{strings.minHistory}</span>
            <input
              type="number"
              min={0}
              max={1000}
              value={minHistory}
              onChange={(event) => setMinHistory(Number(event.target.value))}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-500">
              {strings.dateFrom} <span className="text-xs">({strings.optional})</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-zinc-500">
              {strings.dateTo} <span className="text-xs">({strings.optional})</span>
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? strings.running : strings.run}
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            {strings.reset}
          </button>
        </div>
      </form>

      {error && (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <strong>{strings.errorTitle}</strong>: {error}
        </section>
      )}

      {result && (
        <section className="grid gap-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{strings.results}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {strings.runId}: <span className="font-mono">{result.run_id}</span>
              {" · "}
              {strings.targetRange}:{" "}
              {result.start_date && result.end_date
                ? `${result.start_date} - ${result.end_date}`
                : strings.noRange}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {metricCards.map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {strings.liftTitle}
            </h3>
            {[
              [
                strings.hitAny,
                result.metrics.hit_any_rate,
                result.metrics.expected_random_any_rate,
              ],
              [
                strings.hitUpper,
                result.metrics.hit_upper_rate,
                result.metrics.expected_random_upper_rate,
              ],
            ].map(([label, actualRate, expectedRate]) => (
              <div key={String(label)} className="mb-4 last:mb-0">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>{label}</span>
                  <span>
                    {strings.actual} {pct(Number(actualRate))} · {strings.expected}{" "}
                    {pct(Number(expectedRate))}
                  </span>
                </div>
                <div className="grid gap-1">
                  <div className="h-2 rounded bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded bg-sky-500"
                      style={{ width: clampRate(Number(actualRate)) }}
                    />
                  </div>
                  <div className="h-2 rounded bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded bg-zinc-400"
                      style={{ width: clampRate(Number(expectedRate)) }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {strings.predictions}
            </h3>
            <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2">{strings.colDate}</th>
                    <th className="px-3 py-2">{strings.colPredicted}</th>
                    <th className="px-3 py-2">{strings.colActualUpper}</th>
                    <th className="px-3 py-2">{strings.colActualLower}</th>
                    <th className="px-3 py-2">{strings.colHitUpper}</th>
                    <th className="px-3 py-2">{strings.colHitLower}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.predictions.map((prediction) => (
                    <tr
                      key={prediction.target_date}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {prediction.target_date}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {prediction.predicted.map((number) => (
                            <span
                              key={number}
                              className="rounded border border-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-700"
                            >
                              {number}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono">{prediction.actual_upper}</td>
                      <td className="px-3 py-2 font-mono">{prediction.actual_lower}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`font-medium ${
                            prediction.hit_upper ? "text-emerald-600" : "text-zinc-400"
                          }`}
                        >
                          {prediction.hit_upper ? strings.yes : strings.no}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`font-medium ${
                            prediction.hit_lower ? "text-emerald-600" : "text-zinc-400"
                          }`}
                        >
                          {prediction.hit_lower ? strings.yes : strings.no}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
