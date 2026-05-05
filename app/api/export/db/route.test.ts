/** @vitest-environment node */

import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";

const readFileMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

afterEach(() => {
  vi.restoreAllMocks();
  readFileMock.mockReset();
});

describe("GET /api/export/db", () => {
  it("returns the sqlite file with attachment headers", async () => {
    readFileMock.mockResolvedValue(Buffer.from("sqlite"));

    const { GET } = await import("@/app/api/export/db/route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/x-sqlite3");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
  });

  it("returns 404 when the sqlite file cannot be read", async () => {
    readFileMock.mockRejectedValue(new Error("missing db"));

    const { GET } = await import("@/app/api/export/db/route");
    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "missing db" });
  });
});
