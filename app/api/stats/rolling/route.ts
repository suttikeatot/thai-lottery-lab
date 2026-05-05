import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL ?? "http://127.0.0.1:8001";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const number = searchParams.get("number") ?? "00";
  const windowSize = searchParams.get("window_size") ?? "20";

  try {
    const res = await fetch(
      `${WORKER_URL}/stats/rolling?number=${number}&window_size=${windowSize}`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ error: `Worker ${res.status}` }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
