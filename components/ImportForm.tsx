"use client";

import { useRef, useState } from "react";

type RowError = { row: number; reason: string };
type BatchResult = {
  filename: string;
  rowCount: number;
  okCount: number;
  errorCount: number;
  insertedCount: number;
};

type Strings = {
  chooseFile: string;
  upload: string;
  uploading: string;
  successTitle: string;
  insertedRows: string;
  skippedRows: string;
  errorTitle: string;
  errorRow: string;
  noFile: string;
  uploadError: string;
};

export function ImportForm({ strings }: { strings: Strings }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setFormError(strings.noFile);
      return;
    }
    setBusy(true);
    setFormError(null);
    setBatch(null);
    setErrors([]);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/imports", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setFormError(strings.uploadError.replace("{message}", json.error ?? res.statusText));
      } else {
        setBatch(json.batch);
        setErrors(json.errors ?? []);
      }
    } catch (err) {
      setFormError(strings.uploadError.replace("{message}", (err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const skippedCount = batch ? batch.okCount - batch.insertedCount : 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          className="text-sm text-zinc-700 dark:text-zinc-300"
          aria-label={strings.chooseFile}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {busy ? strings.uploading : strings.upload}
        </button>
      </div>

      {formError && (
        <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
      )}

      {batch && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-300">
            {strings.successTitle}
          </p>
          <p className="text-sm text-green-700 dark:text-green-400">
            {strings.insertedRows.replace("{count}", String(batch.insertedCount))}
          </p>
          {skippedCount > 0 && (
            <p className="text-sm text-green-600 dark:text-green-500">
              {strings.skippedRows.replace("{count}", String(skippedCount))}
            </p>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
          <p className="mb-2 font-medium text-red-800 dark:text-red-300">
            {strings.errorTitle} ({errors.length})
          </p>
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
            {errors.map((e) => (
              <li key={e.row}>
                <span className="font-mono font-medium">
                  {strings.errorRow.replace("{row}", String(e.row))}:
                </span>{" "}
                {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
