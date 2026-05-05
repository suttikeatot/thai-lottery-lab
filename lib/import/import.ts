import { prisma } from "@/lib/prisma";
import type { ParsedRow } from "./validate";

export type ImportResult = {
  filename: string;
  rowCount: number;
  okCount: number;
  errorCount: number;
  insertedCount: number;
};

export async function importRows(
  rows: ParsedRow[],
  filename: string,
  errorCount: number
): Promise<ImportResult> {
  const targetDates = rows.map((r) => new Date(r.draw_date));

  const existing = await prisma.draw.findMany({
    where: { drawDate: { in: targetDates } },
    select: { drawDate: true },
  });
  const existingSet = new Set(existing.map((d) => d.drawDate.toISOString()));

  const newRows = rows.filter(
    (r) => !existingSet.has(new Date(r.draw_date).toISOString())
  );

  const data = newRows.map((r) => ({
    drawDate: new Date(r.draw_date),
    firstPrize: r.first_prize,
    twoUpper: r.two_upper,
    twoLower: r.two_lower,
    threeFront: r.three_front,
    threeBack: r.three_back,
    source: `csv:${filename}`,
  }));

  const result = await prisma.draw.createMany({ data });

  await prisma.importBatch.create({
    data: {
      filename,
      rowCount: rows.length + errorCount,
      okCount: rows.length,
      errorCount,
    },
  });

  return {
    filename,
    rowCount: rows.length + errorCount,
    okCount: rows.length,
    errorCount,
    insertedCount: result.count,
  };
}
