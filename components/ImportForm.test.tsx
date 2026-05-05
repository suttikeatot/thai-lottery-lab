import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportForm } from "@/components/ImportForm";

const strings = {
  chooseFile: "Choose file",
  upload: "Upload",
  uploading: "Uploading...",
  successTitle: "Import complete",
  insertedRows: "{count} new row(s) inserted",
  skippedRows: "{count} row(s) skipped (already exist)",
  errorTitle: "Row errors",
  errorRow: "Row {row}",
  noFile: "Please select a file first.",
  uploadError: "Upload failed: {message}",
  exportTitle: "Export local database",
  exportDescription: "Download the current SQLite file as a local backup or for manual inspection.",
  exportButton: "Download app.db",
  exportNote: "The export is a raw SQLite snapshot from this machine.",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ImportForm", () => {
  it("shows a validation error when submitting without a file", async () => {
    render(<ImportForm strings={strings} />);

    fireEvent.submit(screen.getByRole("button", { name: strings.upload }));

    expect(await screen.findByText(strings.noFile)).toBeInTheDocument();
  });

  it("uploads a selected file and renders the success summary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          batch: {
            filename: "sample.csv",
            rowCount: 2,
            okCount: 2,
            errorCount: 0,
            insertedCount: 2,
          },
          errors: [],
        }),
      })
    );

    render(<ImportForm strings={strings} />);

    const input = screen.getByLabelText(strings.chooseFile) as HTMLInputElement;
    const file = new File(["draw_date,first_prize,two_lower"], "sample.csv", {
      type: "text/csv",
    });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.submit(screen.getByRole("button", { name: strings.upload }));

    expect(await screen.findByText(strings.successTitle)).toBeInTheDocument();
    expect(screen.getByText("2 new row(s) inserted")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/imports",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("renders the database export link", () => {
    render(<ImportForm strings={strings} />);

    const link = screen.getByRole("link", { name: strings.exportButton });
    expect(link).toHaveAttribute("href", "/api/export/db");
    expect(screen.getByText(strings.exportDescription)).toBeInTheDocument();
  });
});
