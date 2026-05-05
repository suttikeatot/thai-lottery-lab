import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../globals.css";
import { LOCALES, isLocale, getDictionary, t } from "@/lib/i18n";
import { LangSwitcher } from "@/components/LangSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thai Lottery Lab",
  description:
    "Statistical analysis & honest backtesting for the Thai Government Lottery.",
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-6">
            <div className="font-semibold tracking-tight">{t(dict, "appName")}</div>
            <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href={`/${lang}`} className="hover:text-zinc-900 dark:hover:text-zinc-100">{t(dict, "nav.dashboard")}</Link>
              <Link href={`/${lang}/stats`} className="hover:text-zinc-900 dark:hover:text-zinc-100">{t(dict, "nav.stats")}</Link>
              <Link href={`/${lang}/backtest`} className="hover:text-zinc-900 dark:hover:text-zinc-100">{t(dict, "nav.backtest")}</Link>
              <Link href={`/${lang}/import`} className="hover:text-zinc-900 dark:hover:text-zinc-100">{t(dict, "nav.import")}</Link>
            </nav>
          </div>
          <LangSwitcher current={lang} />
        </header>
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="px-6 py-4 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
          {t(dict, "disclaimer")}
        </footer>
      </body>
    </html>
  );
}
