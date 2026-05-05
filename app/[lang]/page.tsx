import { notFound } from "next/navigation";
import { isLocale, getDictionary, t } from "@/lib/i18n";
import { HealthBadge } from "@/components/HealthBadge";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t(dict, "appName")}</h1>
      <p className="max-w-xl text-center text-zinc-600 dark:text-zinc-400">
        {t(dict, "tagline")}
      </p>
      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm">
        {t(dict, "home.skeletonReady")}
      </div>
      <HealthBadge label={t(dict, "home.workerHealth")} />
    </main>
  );
}
