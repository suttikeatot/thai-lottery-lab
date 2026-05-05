import { describe, expect, it } from "vitest";
import { validateRows } from "@/lib/import/validate";

describe("validateRows", () => {
  it("accepts the canonical app schema", () => {
    const result = validateRows([
      {
        draw_date: "2024-12-16",
        first_prize: "097863",
        two_lower: "21",
        three_front: "290,742",
        three_back: "339,881",
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.ok).toEqual([
      {
        draw_date: "2024-12-16",
        first_prize: "097863",
        two_upper: "63",
        two_lower: "21",
        three_front: "290,742",
        three_back: "339,881",
      },
    ]);
  });

  it("normalizes the lotto.csv schema and parses list-like strings", () => {
    const result = validateRows([
      {
        date: "2024-12-16",
        prize_1st: 97863,
        prize_pre_3digit: "['290', '742']",
        prize_sub_3digits: "['339', '881']",
        prize_2digits: 21,
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.ok).toEqual([
      {
        draw_date: "2024-12-16",
        first_prize: "097863",
        two_upper: "63",
        two_lower: "21",
        three_front: "290,742",
        three_back: "339,881",
      },
    ]);
  });

  it("keeps malformed list strings as validation errors", () => {
    const result = validateRows([
      {
        date: "2024-12-16",
        prize_1st: "097863",
        prize_pre_3digit: "['29', '742']",
        prize_sub_3digits: "['339', '881']",
        prize_2digits: "21",
      },
    ]);

    expect(result.ok).toEqual([]);
    expect(result.errors[0]?.reason).toContain("three_front must be comma-separated 3-digit strings");
  });
});
