import { notFound } from "next/navigation";
import { isLocale, getDictionary, t } from "@/lib/i18n";

export default async function BacktestPage({ params }: PageProps<"/[lang]/backtest">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        {t(dict, "nav.backtest")}
      </h1>
      <p className="text-sm text-zinc-500">Coming in M5–M6.</p>
    </main>
  );
}
