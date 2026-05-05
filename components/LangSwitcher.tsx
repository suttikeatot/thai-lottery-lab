import Link from "next/link";
import type { Locale } from "@/lib/i18n";

const LABEL: Record<Locale, string> = {
  en: "EN",
  th: "ไทย",
};

export function LangSwitcher({ current }: { current: Locale }) {
  const target: Locale = current === "en" ? "th" : "en";
  return (
    <Link
      href={`/${target}`}
      className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
      aria-label={`Switch to ${LABEL[target]}`}
    >
      {LABEL[target]}
    </Link>
  );
}
