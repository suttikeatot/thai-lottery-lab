import { z } from "zod";

const SIX_DIGITS = /^\d{6}$/;
const TWO_DIGITS = /^\d{2}$/;
const THREE_DIGITS_LIST = /^(\d{3})(,\d{3})*$/;

const RawRowSchema = z
  .object({
    draw_date: z.string().refine((v) => !isNaN(Date.parse(v)), {
      message: "draw_date must be a valid date (YYYY-MM-DD)",
    }),
    first_prize: z.string().regex(SIX_DIGITS, "first_prize must be 6 digits"),
    two_lower: z.string().regex(TWO_DIGITS, "two_lower must be 2 digits"),
    two_upper: z.string().regex(TWO_DIGITS).optional().or(z.literal("")),
    three_front: z
      .string()
      .refine((v) => v === "" || THREE_DIGITS_LIST.test(v), {
        message: "three_front must be comma-separated 3-digit strings",
      })
      .optional()
      .or(z.literal("")),
    three_back: z
      .string()
      .refine((v) => v === "" || THREE_DIGITS_LIST.test(v), {
        message: "three_back must be comma-separated 3-digit strings",
      })
      .optional()
      .or(z.literal("")),
  })
  .passthrough();

export type ParsedRow = {
  draw_date: string;
  first_prize: string;
  two_upper: string;
  two_lower: string;
  three_front: string | null;
  three_back: string | null;
};

export type RowError = { row: number; reason: string };

export type ValidateResult = {
  ok: ParsedRow[];
  errors: RowError[];
};

export function validateRows(
  rawRows: Record<string, string>[]
): ValidateResult {
  const ok: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seenDates = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // 1-based, row 1 is header
    const raw = rawRows[i];

    const parsed = RawRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: rowNum,
        reason: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    const derivedUpper = data.first_prize.slice(-2);

    if (data.two_upper && data.two_upper !== "" && data.two_upper !== derivedUpper) {
      errors.push({
        row: rowNum,
        reason: `two_upper "${data.two_upper}" does not match last 2 digits of first_prize "${data.first_prize}"`,
      });
      continue;
    }

    const drawDate = data.draw_date.trim();
    if (seenDates.has(drawDate)) {
      errors.push({
        row: rowNum,
        reason: `duplicate draw_date "${drawDate}" within this file`,
      });
      continue;
    }
    seenDates.add(drawDate);

    ok.push({
      draw_date: drawDate,
      first_prize: data.first_prize,
      two_upper: derivedUpper,
      two_lower: data.two_lower,
      three_front: data.three_front && data.three_front !== "" ? data.three_front : null,
      three_back: data.three_back && data.three_back !== "" ? data.three_back : null,
    });
  }

  return { ok, errors };
}
