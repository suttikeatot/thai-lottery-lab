import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const WORKER_URL = process.env.WORKER_URL ?? "http://127.0.0.1:8001";

const requestSchema = z.object({
  strategy_key: z.enum(["random_baseline", "hot_n", "cold_n", "gap_weighted"]),
  params: z.record(z.string(), z.unknown()).default({}),
  window_spec: z.record(z.string(), z.unknown()).default({}),
  k: z.number().int().min(1).max(100).default(5),
});

type WorkerPrediction = {
  target_date: string;
  predicted: string[];
  actual_upper: string;
  actual_lower: string;
  hit_upper: boolean;
  hit_lower: boolean;
  as_of: string;
  history_count: number;
  history_hash: string;
};

type WorkerResponse = {
  strategy_key: string;
  params: Record<string, unknown>;
  window_spec: Record<string, unknown>;
  start_date: string | null;
  end_date: string | null;
  metrics: {
    n_targets: number;
    [key: string]: unknown;
  };
  predictions: WorkerPrediction[];
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const workerRes = await fetch(`${WORKER_URL}/backtest/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });

    if (!workerRes.ok) {
      const errorText = await workerRes.text();
      return NextResponse.json(
        { error: `Worker responded ${workerRes.status}`, detail: errorText },
        { status: 502 }
      );
    }

    const data = (await workerRes.json()) as WorkerResponse;
    if (!data.start_date || !data.end_date || data.predictions.length === 0) {
      return NextResponse.json(
        { error: "Backtest produced no target draws", metrics: data.metrics },
        { status: 400 }
      );
    }

    const run = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.backtestRun.create({
        data: {
          strategyKey: data.strategy_key,
          paramsJson: JSON.stringify(data.params),
          windowSpecJson: JSON.stringify(data.window_spec),
          startDate: new Date(data.start_date as string),
          endDate: new Date(data.end_date as string),
          nTargets: data.metrics.n_targets,
          metricsJson: JSON.stringify({
            ...data.metrics,
            audit: data.predictions.map((prediction) => ({
              target_date: prediction.target_date,
              as_of: prediction.as_of,
              history_count: prediction.history_count,
              history_hash: prediction.history_hash,
            })),
          }),
        },
      });

      await tx.backtestPrediction.createMany({
        data: data.predictions.map((prediction) => ({
          runId: createdRun.id,
          targetDrawDate: new Date(prediction.target_date),
          predictedNumbersJson: JSON.stringify(prediction.predicted),
          actualTwoUpper: prediction.actual_upper,
          actualTwoLower: prediction.actual_lower,
          hitUpper: prediction.hit_upper,
          hitLower: prediction.hit_lower,
        })),
      });

      return createdRun;
    });

    return NextResponse.json({
      run_id: run.id,
      metrics: data.metrics,
      predictions: data.predictions,
      start_date: data.start_date,
      end_date: data.end_date,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
