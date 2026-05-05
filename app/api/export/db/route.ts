import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const dbPath = path.join(process.cwd(), "data", "app.db");

  try {
    const file = await readFile(dbPath);
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="thai-lottery-lab-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 404 }
    );
  }
}
