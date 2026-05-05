"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

function useChart(
  ref: React.RefObject<HTMLDivElement | null>,
  builder: (chart: echarts.ECharts) => void,
  deps: unknown[]
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const existing = echarts.getInstanceByDom(el);
    if (existing) existing.dispose();
    const chart = echarts.init(el);
    builder(chart);
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(el);
    return () => { obs.disconnect(); chart.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

type RollingPoint = { draw_date: string; count: number };
type GapData = {
  number: string;
  current_gap: number | null;
  last_seen: string | null;
  mean_gap: number | null;
  median_gap: number | null;
  max_gap: number | null;
  gap_distribution: { gap: number; count: number }[];
};

type Strings = {
  rollingTitle: string;
  rollingWindowSize: string;
  gapTitle: string;
  gapCurrent: string;
  gapLastSeen: string;
  gapMean: string;
  gapMedian: string;
  gapMax: string;
  gapDist: string;
  gapColGap: string;
  gapColCount: string;
  selectNumber: string;
  never: string;
};

const WINDOW_PRESETS = [10, 20, 50];

export function NumberAnalysis({ strings }: { strings: Strings }) {
  const [number, setNumber] = useState("01");
  const [windowSize, setWindowSize] = useState(20);
  const [rolling, setRolling] = useState<RollingPoint[]>([]);
  const [gap, setGap] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(false);

  const lineRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (num: string, ws: number) => {
    setLoading(true);
    const [r, g] = await Promise.all([
      fetch(`/api/stats/rolling?number=${num}&window_size=${ws}`).then((r) => r.json()),
      fetch(`/api/stats/gap?number=${num}`).then((r) => r.json()),
    ]);
    setRolling(r.points ?? []);
    setGap(g);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(number, windowSize);
  }, [number, windowSize, fetchData]);

  useChart(
    lineRef,
    (chart) => {
      if (rolling.length === 0) return;
      chart.setOption({
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: rolling.map((p) => p.draw_date),
          axisLabel: { fontSize: 9, rotate: 30, interval: Math.floor(rolling.length / 8) },
        },
        yAxis: { type: "value", minInterval: 1 },
        series: [{ type: "line", data: rolling.map((p) => p.count), smooth: true, areaStyle: {} }],
      });
    },
    [rolling]
  );

  useChart(
    barRef,
    (chart) => {
      if (!gap || gap.gap_distribution.length === 0) return;
      chart.setOption({
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: gap.gap_distribution.map((d) => d.gap), name: strings.gapColGap },
        yAxis: { type: "value", name: strings.gapColCount, minInterval: 1 },
        series: [{ type: "bar", data: gap.gap_distribution.map((d) => d.count) }],
      });
    },
    [gap, strings]
  );

  const numbers = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div className="flex flex-col gap-6">
      {/* Number + window picker */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-500">{strings.selectNumber}:</label>
          <select
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
          >
            {numbers.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">{strings.rollingWindowSize}:</span>
          {WINDOW_PRESETS.map((w) => (
            <button
              key={w}
              onClick={() => setWindowSize(w)}
              className={`rounded px-2 py-1 text-xs ${windowSize === w ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-600"}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-400">Loading…</p>}

      {/* Rolling frequency chart */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {strings.rollingTitle} — <span className="font-mono">{number}</span>
        </h3>
        <div ref={lineRef} className="h-48 w-full rounded-md border border-zinc-200 dark:border-zinc-800" />
      </div>

      {/* Gap summary cards */}
      {gap && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {strings.gapTitle} — <span className="font-mono">{number}</span>
          </h3>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              [strings.gapCurrent, gap.current_gap ?? "—"],
              [strings.gapLastSeen, gap.last_seen ?? strings.never],
              [strings.gapMean, gap.mean_gap ?? "—"],
              [strings.gapMedian, gap.median_gap ?? "—"],
              [strings.gapMax, gap.max_gap ?? "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {gap.gap_distribution.length > 0 && (
            <>
              <p className="mb-1 text-xs text-zinc-500">{strings.gapDist}</p>
              <div ref={barRef} className="h-36 w-full rounded-md border border-zinc-200 dark:border-zinc-800" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
