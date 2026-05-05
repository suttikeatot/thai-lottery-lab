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

type RawInputRow = Record<string, unknown>;

function asTrimmedString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeListValue(value: unknown): string {
  if (value == null || value === "") return "";

  if (Array.isArray(value)) {
    return value.map((item) => asTrimmedString(item)).filter(Boolean).join(",");
  }

  const raw = asTrimmedString(value);
  if (!raw) return "";

  if (THREE_DIGITS_LIST.test(raw)) return raw;

  try {
    const jsonReady = raw.replace(/'/g, '"');
    const parsed = JSON.parse(jsonReady);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => asTrimmedString(item)).filter(Boolean).join(",");
    }
  } catch {
    // Fall through to plain-string handling below.
  }

  return raw.replace(/[\[\]'"]/g, "").replace(/\s+/g, "");
}

function normalizeRawRow(raw: RawInputRow): Record<string, string> {
  const drawDate = asTrimmedString(raw.draw_date ?? raw.date);
  const firstPrize = asTrimmedString(raw.first_prize ?? raw.prize_1st);
  const twoLower = asTrimmedString(raw.two_lower ?? raw.prize_2digits);
  const twoUpper = asTrimmedString(raw.two_upper);
  const threeFront = normalizeListValue(raw.three_front ?? raw.prize_pre_3digit);
  const threeBack = normalizeListValue(raw.three_back ?? raw.prize_sub_3digits);

  return {
    draw_date: drawDate,
    first_prize: firstPrize.padStart(6, "0"),
    two_lower: twoLower.padStart(2, "0"),
    two_upper: twoUpper ? twoUpper.padStart(2, "0") : "",
    three_front: threeFront,
    three_back: threeBack,
  };
}

export function validateRows(
  rawRows: RawInputRow[]
): ValidateResult {
  const ok: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seenDates = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // 1-based, row 1 is header
    const raw = normalizeRawRow(rawRows[i]);

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
