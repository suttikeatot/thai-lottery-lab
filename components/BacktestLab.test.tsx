import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BacktestLab } from "@/components/BacktestLab";

const strings = {
  title: "Backtest Lab",
  description: "Run walk-forward strategy tests using only data available before each target draw.",
  disclaimer: "Backtests are for leakage-free statistical exploration only.",
  strategy: "Strategy",
  randomBaseline: "Random baseline",
  hotN: "Hot-N",
  coldN: "Cold-N",
  gapWeighted: "Gap-weighted",
  k: "Number picks per draw",
  seed: "Seed",
  lookback: "Lookback draws",
  lastTargets: "Target draws",
  minHistory: "Minimum prior history",
  dateFrom: "Start date",
  dateTo: "End date",
  optional: "optional",
  run: "Run backtest",
  running: "Running...",
  reset: "Clear results",
  errorTitle: "Backtest failed",
  results: "Results",
  runId: "Run ID",
  targetRange: "Target range",
  noRange: "No target range",
  nTargets: "Targets",
  hitUpper: "Upper hits",
  hitLower: "Lower hits",
  hitAny: "Any hit",
  expectedRandomUpper: "Expected random upper",
  expectedRandomAny: "Expected random any",
  liftTitle: "Actual vs random expectation",
  actual: "Actual",
  expected: "Expected",
  predictions: "Predictions",
  colDate: "Draw date",
  colPredicted: "Predicted numbers",
  colActualUpper: "Actual upper",
  colActualLower: "Actual lower",
  colHitUpper: "Upper hit",
  colHitLower: "Lower hit",
  yes: "Yes",
  no: "No",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BacktestLab", () => {
  it("submits to the backtest route and renders returned results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          run_id: 11,
          start_date: "2024-04-16",
          end_date: "2024-05-16",
          metrics: {
            n_targets: 3,
            k: 5,
            hit_upper: 1,
            hit_lower: 0,
            hit_any: 1,
            hit_upper_rate: 0.3333,
            hit_lower_rate: 0,
            hit_any_rate: 0.3333,
            expected_random_upper_rate: 0.05,
            expected_random_any_rate: 0.0975,
          },
          predictions: [
            {
              target_date: "2024-04-16",
              predicted: ["01", "12", "23"],
              actual_upper: "12",
              actual_lower: "90",
              hit_upper: true,
              hit_lower: false,
            },
          ],
        }),
      })
    );

    render(<BacktestLab strings={strings} />);

    fireEvent.click(screen.getByRole("button", { name: strings.run }));

    expect(await screen.findByText(strings.results)).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("2024-04-16")).toBeInTheDocument();
    expect(screen.getByText("5.00%")).toBeInTheDocument();
    expect(screen.getByText("9.75%")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/backtest/run",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  it("renders an API error message when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Worker unavailable" }),
      })
    );

    render(<BacktestLab strings={strings} />);

    fireEvent.click(screen.getByRole("button", { name: strings.run }));

    expect(await screen.findByText(/Worker unavailable/)).toBeInTheDocument();
  });
});
