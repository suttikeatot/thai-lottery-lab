import { NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL ?? "http://127.0.0.1:8001";

export async function GET() {
  try {
    const res = await fetch(`${WORKER_URL}/health`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", workerStatus: res.status },
        { status: 502 },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
