import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, getDictionary, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  const [totalDraws, earliest, latest, recentDraws] = await Promise.all([
    prisma.draw.count(),
    prisma.draw.findFirst({ orderBy: { drawDate: "asc" }, select: { drawDate: true } }),
    prisma.draw.findFirst({ orderBy: { drawDate: "desc" }, select: { drawDate: true } }),
    prisma.draw.findMany({
      orderBy: { drawDate: "desc" },
      take: 20,
      select: { drawDate: true, firstPrize: true, twoUpper: true, twoLower: true },
    }),
  ]);

  const fmt = (d: Date) =>
    d.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {t(dict, "dashboard.title")}
      </h1>

      {totalDraws === 0 ? (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 px-6 py-10 text-center text-sm text-zinc-500">
          {t(dict, "dashboard.noData")}{" "}
          <Link href={`/${lang}/import`} className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
            {t(dict, "nav.import")}
          </Link>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 px-5 py-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t(dict, "dashboard.totalDraws")}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{totalDraws.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 px-5 py-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t(dict, "dashboard.dateRange")}</p>
              <p className="mt-1 text-sm font-medium">
                {earliest && latest
                  ? `${fmt(earliest.drawDate)} – ${fmt(latest.drawDate)}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 px-5 py-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t(dict, "dashboard.lastDraw")}</p>
              <p className="mt-1 text-sm font-medium">
                {latest ? fmt(latest.drawDate) : "—"}
              </p>
            </div>
          </div>

          {/* Recent draws table */}
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t(dict, "dashboard.recentDraws")}
          </h2>
          <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  {(["colDate", "colFirstPrize", "col2Upper", "col2Lower"] as const).map((k) => (
                    <th
                      key={k}
                      className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                    >
                      {t(dict, `dashboard.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentDraws.map((row) => (
                  <tr
                    key={row.drawDate.toISOString()}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-2 tabular-nums">{fmt(row.drawDate)}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{row.firstPrize}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{row.twoUpper}</td>
                    <td className="px-4 py-2 font-mono tabular-nums">{row.twoLower}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
