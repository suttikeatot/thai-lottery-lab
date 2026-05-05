import { notFound } from "next/navigation";
import { isLocale, getDictionary, t } from "@/lib/i18n";
import { StatsView } from "@/components/StatsView";
import { NumberAnalysis } from "@/components/NumberAnalysis";

export default async function StatsPage({ params }: PageProps<"/[lang]/stats">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const strings = {
    window: t(dict, "stats.window"),
    w5y: t(dict, "stats.w5y"),
    w10y: t(dict, "stats.w10y"),
    w15y: t(dict, "stats.w15y"),
    w20y: t(dict, "stats.w20y"),
    wlastN: t(dict, "stats.wlastN"),
    nDraws: t(dict, "stats.nDraws"),
    drawCount: t(dict, "stats.drawCount"),
    totalObs: t(dict, "stats.totalObs"),
    chiSquare: t(dict, "stats.chiSquare"),
    pValue: t(dict, "stats.pValue"),
    df: t(dict, "stats.df"),
    chiNote: t(dict, "stats.chiNote"),
    noData: t(dict, "stats.noData"),
    freqTable: t(dict, "stats.freqTable"),
    colNumber: t(dict, "stats.colNumber"),
    colCount: t(dict, "stats.colCount"),
    colPct: t(dict, "stats.colPct"),
    colExpected: t(dict, "stats.colExpected"),
    colDev: t(dict, "stats.colDev"),
    colZ: t(dict, "stats.colZ"),
    hot10: t(dict, "stats.hot10"),
    cold10: t(dict, "stats.cold10"),
    heatmap: t(dict, "stats.heatmap"),
    devChart: t(dict, "stats.devChart"),
  };

  const analysisStrings = {
    rollingTitle: t(dict, "stats.rollingTitle"),
    rollingWindowSize: t(dict, "stats.rollingWindowSize"),
    gapTitle: t(dict, "stats.gapTitle"),
    gapCurrent: t(dict, "stats.gapCurrent"),
    gapLastSeen: t(dict, "stats.gapLastSeen"),
    gapMean: t(dict, "stats.gapMean"),
    gapMedian: t(dict, "stats.gapMedian"),
    gapMax: t(dict, "stats.gapMax"),
    gapDist: t(dict, "stats.gapDist"),
    gapColGap: t(dict, "stats.gapColGap"),
    gapColCount: t(dict, "stats.gapColCount"),
    selectNumber: t(dict, "stats.selectNumber"),
    never: t(dict, "stats.never"),
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {t(dict, "stats.title")}
      </h1>
      <StatsView strings={strings} />
      <hr className="my-8 border-zinc-200 dark:border-zinc-800" />
      <NumberAnalysis strings={analysisStrings} />
    </main>
  );
}
