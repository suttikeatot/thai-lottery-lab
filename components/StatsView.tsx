"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { HeatmapChart, BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  HeatmapChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
  CanvasRenderer,
]);

type FreqRow = {
  number: string;
  count: number;
  pct: number;
  expected: number;
  deviation: number;
  z_score: number;
};

type StatsData = {
  window_spec: string;
  draw_count: number;
  total_observations: number;
  date_from: string | null;
  date_to: string | null;
  chi_square: { stat: number; p_value: number; df: number } | null;
  frequencies: FreqRow[];
  hot_10: FreqRow[];
  cold_10: FreqRow[];
};

type Strings = {
  window: string;
  w5y: string;
  w10y: string;
  w15y: string;
  w20y: string;
  wlastN: string;
  nDraws: string;
  drawCount: string;
  totalObs: string;
  chiSquare: string;
  pValue: string;
  df: string;
  chiNote: string;
  noData: string;
  freqTable: string;
  colNumber: string;
  colCount: string;
  colPct: string;
  colExpected: string;
  colDev: string;
  colZ: string;
  hot10: string;
  cold10: string;
  heatmap: string;
  devChart: string;
};

const WINDOWS = ["5y", "10y", "15y", "20y", "lastN"] as const;
const N_PRESETS = [9, 10, 20, 50];

function useChart(
  ref: React.RefObject<HTMLDivElement | null>,
  builder: (chart: echarts.ECharts) => void,
  deps: unknown[]
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Dispose any existing instance before creating a new one
    const existing = echarts.getInstanceByDom(el);
    if (existing) existing.dispose();

    const chart = echarts.init(el);
    builder(chart);

    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(el);

    return () => {
      obs.disconnect();
      chart.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function StatsView({ strings }: { strings: Strings }) {
  const [selectedWindow, setSelectedWindow] = useState<string>("5y");
  const [n, setN] = useState(50);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heatmapRef = useRef<HTMLDivElement>(null);
  const devChartRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(async (win: string, nVal: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stats?window=${win}&n=${nVal}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unknown error");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(selectedWindow, n);
  }, [selectedWindow, n, fetchStats]);

  useChart(
    heatmapRef,
    (chart) => {
      if (!data || data.frequencies.length === 0) return;
      const rows = Array.from({ length: 10 }, (_, r) =>
        Array.from({ length: 10 }, (_, c) => {
          const num = r * 10 + c;
          const label = String(num).padStart(2, "0");
          const freq = data.frequencies.find((f) => f.number === label);
          return [c, 9 - r, freq?.count ?? 0, label];
        })
      ).flat();
      chart.setOption({
        tooltip: { formatter: (p: { data: (string | number)[] }) => `${p.data[3]}: ${p.data[2]}` },
        visualMap: {
          min: 0,
          max: Math.max(...data.frequencies.map((f) => f.count), 1),
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: 0,
          inRange: { color: ["#e0f2fe", "#0369a1"] },
        },
        grid: { top: 10, bottom: 60, left: 30, right: 10 },
        xAxis: { type: "category", data: Array.from({ length: 10 }, (_, i) => String(i)), splitArea: { show: true } },
        yAxis: { type: "category", data: Array.from({ length: 10 }, (_, i) => String(9 - i)), splitArea: { show: true } },
        series: [{
          type: "heatmap",
          data: rows,
          label: { show: true, fontSize: 9, formatter: (p: { data: (string | number)[] }) => String(p.data[3]) },
        }],
      });
    },
    [data]
  );

  useChart(
    devChartRef,
    (chart) => {
      if (!data || data.frequencies.length === 0) return;
      chart.setOption({
        tooltip: { trigger: "axis", formatter: (params: { name: string; data: number }[]) => `${params[0].name}: ${params[0].data.toFixed(2)}` },
        xAxis: { type: "category", data: data.frequencies.map((f) => f.number), axisLabel: { fontSize: 8, interval: 9 } },
        yAxis: { type: "value", name: "Δ" },
        series: [{
          type: "bar",
          data: data.frequencies.map((f) => f.deviation),
          itemStyle: { color: (p: { data: number }) => (p.data >= 0 ? "#0ea5e9" : "#f87171") },
        }],
      });
    },
    [data]
  );

  const windowLabel = (w: string) =>
    ({ "5y": strings.w5y, "10y": strings.w10y, "15y": strings.w15y, "20y": strings.w20y, lastN: strings.wlastN }[w] ?? w);

  return (
    <div className="flex flex-col gap-6">
      {/* Window picker */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-500">{strings.window}:</span>
        {WINDOWS.map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWindow(w)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedWindow === w
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
            }`}
          >
            {windowLabel(w)}
          </button>
        ))}
        {selectedWindow === "lastN" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{strings.nDraws}:</span>
            {N_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setN(preset)}
                className={`rounded px-2 py-1 text-xs ${n === preset ? "bg-zinc-700 text-white" : "border border-zinc-300 dark:border-zinc-600"}`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="text-sm text-zinc-400">Loading…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      {!loading && data && data.draw_count === 0 && (
        <div className="text-sm text-zinc-500">{strings.noData}</div>
      )}

      {!loading && data && data.draw_count > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [strings.drawCount, data.draw_count],
              [strings.totalObs, data.total_observations],
              [strings.chiSquare, data.chi_square?.stat.toFixed(2) ?? "—"],
              [strings.pValue, data.chi_square?.p_value.toFixed(4) ?? "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 italic">{strings.chiNote}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: strings.hot10, rows: data.hot_10, color: "text-orange-500" },
              { label: strings.cold10, rows: data.cold_10, color: "text-sky-500" },
            ].map(({ label, rows, color }) => (
              <div key={label} className="rounded-md border border-zinc-200 dark:border-zinc-800">
                <div className="px-4 py-2 font-medium text-sm border-b border-zinc-100 dark:border-zinc-800">{label}</div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {rows.map((r, i) => (
                    <div key={r.number} className="flex items-center justify-between px-4 py-1.5 text-sm">
                      <span className="text-zinc-400 w-4">{i + 1}</span>
                      <span className={`font-mono font-semibold ${color}`}>{r.number}</span>
                      <span className="tabular-nums">{r.count}</span>
                      <span className="tabular-nums text-zinc-400">{r.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{strings.heatmap}</h3>
            <div ref={heatmapRef} className="h-72 w-full rounded-md border border-zinc-200 dark:border-zinc-800" />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{strings.devChart}</h3>
            <div ref={devChartRef} className="h-48 w-full rounded-md border border-zinc-200 dark:border-zinc-800" />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{strings.freqTable}</h3>
            <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500">
                  <tr>
                    {[strings.colNumber, strings.colCount, strings.colPct, strings.colExpected, strings.colDev, strings.colZ].map((h) => (
                      <th key={h} className="px-3 py-2 text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.frequencies.map((row) => (
                    <tr key={row.number} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-3 py-1.5 font-mono font-semibold">{row.number}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{row.count}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{row.pct}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{row.expected}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${row.deviation > 0 ? "text-orange-500" : row.deviation < 0 ? "text-sky-500" : ""}`}>
                        {row.deviation > 0 ? "+" : ""}{row.deviation}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-400">{row.z_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
