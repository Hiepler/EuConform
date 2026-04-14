import Link from "next/link";
import type { ReactNode } from "react";
import { localePath } from "../lib/i18n";
import { type Locale, legalNoticePath, privacyPath, siteConfig } from "../lib/siteConfig";

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-editorial text-3xl leading-none text-slate-950">{title}</h2>
      <div className="space-y-4 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

export function LegalPage({
  locale,
  title,
  intro,
  type,
  children,
}: {
  locale: Locale;
  title: string;
  intro: string;
  type: "imprint" | "privacy";
  children: ReactNode;
}) {
  const homeHref = localePath(locale);
  const alternateLocale = locale === "de" ? "en" : "de";
  const alternateLabel = locale === "de" ? "EN" : "DE";
  const alternateHref =
    type === "imprint" ? legalNoticePath(alternateLocale) : privacyPath(alternateLocale);
  const legalHref = legalNoticePath(locale);
  const privacyHref = privacyPath(locale);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f4ed] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[#d9d3f3]/28 blur-3xl" />
        <div className="absolute right-[-10rem] top-[12rem] h-[26rem] w-[26rem] rounded-full bg-[#d9e8f5]/34 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-6 md:px-10">
        <header className="sticky top-4 z-40 mx-auto mb-12 flex max-w-5xl items-center justify-between gap-4 rounded-full border border-slate-300/70 bg-[rgba(253,251,246,0.92)] px-5 py-3 shadow-[0_10px_32px_-12px_rgba(20,29,44,0.18)] backdrop-blur-xl">
          <Link href={homeHref} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold tracking-[0.2em] text-slate-900">
              EC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">EuConform</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Evidence infrastructure
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-sm text-slate-700">
            <Link href={homeHref} className="transition hover:text-slate-950">
              {locale === "de" ? "Startseite" : "Home"}
            </Link>
            <Link
              href={alternateHref}
              className="rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 transition hover:border-slate-500 hover:bg-white"
            >
              {alternateLabel}
            </Link>
          </div>
        </header>

        <div className="space-y-10">
          <div className="space-y-4">
            <p className="eyebrow">{locale === "de" ? "Rechtliches" : "Legal"}</p>
            <h1 className="font-editorial text-5xl leading-[0.96] text-slate-950 md:text-6xl">
              {title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">{intro}</p>
          </div>

          <div className="surface-panel space-y-10 p-8 md:p-10">{children}</div>

          <footer className="flex flex-wrap items-center gap-5 border-t border-slate-300/70 pt-8 text-sm text-slate-700">
            <Link href={homeHref} className="transition hover:text-slate-950">
              {locale === "de" ? "Startseite" : "Home"}
            </Link>
            <Link href={legalHref} className="transition hover:text-slate-950">
              {locale === "de" ? "Impressum" : "Legal Notice"}
            </Link>
            <Link href={privacyHref} className="transition hover:text-slate-950">
              {locale === "de" ? "Datenschutz" : "Privacy"}
            </Link>
            <a
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="transition hover:text-slate-950"
            >
              GitHub
            </a>
          </footer>
        </div>
      </div>
    </main>
  );
}

export { LegalSection };
