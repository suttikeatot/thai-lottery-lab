"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "error";

export function HealthBadge({ label }: { label: string }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { status?: string }) => {
        if (cancelled) return;
        setStatus(data.status === "ok" ? "ok" : "error");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const color =
    status === "ok"
      ? "bg-emerald-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-zinc-400";

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <span className={`inline-block size-2 rounded-full ${color}`} aria-hidden />
      <span>{label}:</span>
      <span className="font-mono">{status}</span>
    </div>
  );
}
