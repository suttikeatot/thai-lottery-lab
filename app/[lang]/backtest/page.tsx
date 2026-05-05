import { notFound } from "next/navigation";
import { isLocale, getDictionary, t } from "@/lib/i18n";
import { BacktestLab } from "@/components/BacktestLab";

export default async function BacktestPage({ params }: PageProps<"/[lang]/backtest">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const strings = {
    title: t(dict, "backtest.title"),
    description: t(dict, "backtest.description"),
    disclaimer: t(dict, "backtest.disclaimer"),
    strategy: t(dict, "backtest.strategy"),
    randomBaseline: t(dict, "backtest.randomBaseline"),
    hotN: t(dict, "backtest.hotN"),
    coldN: t(dict, "backtest.coldN"),
    gapWeighted: t(dict, "backtest.gapWeighted"),
    k: t(dict, "backtest.k"),
    seed: t(dict, "backtest.seed"),
    lookback: t(dict, "backtest.lookback"),
    lastTargets: t(dict, "backtest.lastTargets"),
    minHistory: t(dict, "backtest.minHistory"),
    dateFrom: t(dict, "backtest.dateFrom"),
    dateTo: t(dict, "backtest.dateTo"),
    optional: t(dict, "backtest.optional"),
    run: t(dict, "backtest.run"),
    running: t(dict, "backtest.running"),
    reset: t(dict, "backtest.reset"),
    errorTitle: t(dict, "backtest.errorTitle"),
    results: t(dict, "backtest.results"),
    runId: t(dict, "backtest.runId"),
    targetRange: t(dict, "backtest.targetRange"),
    noRange: t(dict, "backtest.noRange"),
    nTargets: t(dict, "backtest.nTargets"),
    hitUpper: t(dict, "backtest.hitUpper"),
    hitLower: t(dict, "backtest.hitLower"),
    hitAny: t(dict, "backtest.hitAny"),
    expectedRandomUpper: t(dict, "backtest.expectedRandomUpper"),
    expectedRandomAny: t(dict, "backtest.expectedRandomAny"),
    liftTitle: t(dict, "backtest.liftTitle"),
    actual: t(dict, "backtest.actual"),
    expected: t(dict, "backtest.expected"),
    predictions: t(dict, "backtest.predictions"),
    colDate: t(dict, "backtest.colDate"),
    colPredicted: t(dict, "backtest.colPredicted"),
    colActualUpper: t(dict, "backtest.colActualUpper"),
    colActualLower: t(dict, "backtest.colActualLower"),
    colHitUpper: t(dict, "backtest.colHitUpper"),
    colHitLower: t(dict, "backtest.colHitLower"),
    yes: t(dict, "backtest.yes"),
    no: t(dict, "backtest.no"),
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        {strings.title}
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-zinc-500">{strings.description}</p>
      <BacktestLab strings={strings} />
    </main>
  );
}
