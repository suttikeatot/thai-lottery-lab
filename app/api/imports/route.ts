import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { validateRows } from "@/lib/import/validate";
import { importRows } from "@/lib/import/import";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const filename = file.name;
  const text = await file.text();

  let rawRows: Record<string, string>[];

  if (filename.endsWith(".json")) {
    try {
      rawRows = JSON.parse(text);
      if (!Array.isArray(rawRows)) throw new Error("JSON must be an array");
    } catch (e) {
      return NextResponse.json(
        { error: `Invalid JSON: ${(e as Error).message}` },
        { status: 400 }
      );
    }
  } else {
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parse error: ${parsed.errors[0].message}` },
        { status: 400 }
      );
    }
    rawRows = parsed.data;
  }

  const { ok, errors } = validateRows(rawRows);
  const result = await importRows(ok, filename, errors.length);

  return NextResponse.json({ batch: result, errors });
}
