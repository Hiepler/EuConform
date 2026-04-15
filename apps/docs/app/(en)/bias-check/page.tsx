import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "../../_components/ButtonLink";
import { SectionIntro } from "../../_components/SectionIntro";
import { legalNoticePath, privacyPath, siteConfig } from "../../lib/siteConfig";
import { en } from "../../messages/en";

const m = en.biasCheckPage;
const imprintHref = legalNoticePath("en");
const privacyHref = privacyPath("en");
const GITHUB_BASE = "https://github.com/Hiepler/EuConform";

export const metadata: Metadata = {
  title: m.meta.title,
  description: m.meta.description,
  alternates: {
    canonical: "/bias-check",
    languages: {
      en: "/bias-check",
      "x-default": "/bias-check",
    },
  },
  openGraph: {
    type: "article",
    url: "/bias-check",
    title: m.meta.title,
    description: m.meta.description,
    locale: "en_US",
  },
};

export default function BiasCheckPage() {
  return (
    <main className="relative overflow-x-clip bg-[#f7f4ed] text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[#d9d3f3]/36 blur-3xl" />
        <div className="absolute right-[-10rem] top-[12rem] h-[26rem] w-[26rem] rounded-full bg-[#d9e8f5]/42 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 md:px-10 md:pb-24 md:pt-6">
        {/* ─── Header ─── */}
        <header className="sticky top-3 z-50 mx-auto mb-8 flex max-w-6xl items-center justify-between gap-3 rounded-full border border-slate-300/60 bg-[rgba(253,251,246,0.78)] px-4 py-2.5 shadow-[0_12px_40px_-14px_rgba(20,29,44,0.22)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[rgba(253,251,246,0.62)] sm:px-5 sm:py-3 md:mb-10">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold tracking-[0.2em] text-slate-900 sm:h-10 sm:w-10 sm:text-xs">
              EC
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-950 sm:text-sm">EuConform</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">
                Evidence infrastructure
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
            <Link href="/" className="transition hover:text-slate-950">
              Home
            </Link>
            <a href="#methodology" className="transition hover:text-slate-950">
              Methodology
            </a>
            <a href="#integration" className="transition hover:text-slate-950">
              Integration
            </a>
            <a href="#try-it" className="transition hover:text-slate-950">
              Try it
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center rounded-full border border-slate-300/80 bg-white/82 px-4 py-2.5 text-[13px] font-medium text-slate-900 transition hover:border-slate-500 hover:bg-white sm:inline-flex sm:px-5 sm:py-3 sm:text-sm"
            >
              &larr; Back to docs
            </Link>
            <a
              href={siteConfig.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center rounded-full bg-[#17345c] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#21457c] sm:px-5 sm:py-3 sm:text-sm"
            >
              GitHub
            </a>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="pb-16 pt-4 sm:pb-20 md:pb-24 md:pt-8">
          <p className="eyebrow">{m.hero.eyebrow}</p>
          <h1 className="font-editorial mt-3 max-w-4xl text-3xl leading-tight text-slate-950 sm:text-4xl md:text-5xl lg:text-6xl">
            {m.hero.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
            {m.hero.body}
          </p>
        </section>

        {/* ─── German Adaptation (USP first) ─── */}
        <section className="border-t border-slate-300/70 py-16 sm:py-20 md:py-24">
          <SectionIntro label={m.germanAdaptation.eyebrow} title={m.germanAdaptation.headline}>
            <p>{m.germanAdaptation.body}</p>
          </SectionIntro>
          <div className="mt-8 sm:mt-10 md:mt-12">
            <div className="surface-panel border-l-4 border-l-[#17345c] p-6 sm:p-8">
              <p className="font-editorial text-lg leading-snug text-slate-950 sm:text-xl md:text-2xl">
                {m.germanAdaptation.highlight}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Methodology ─── */}
        <section
          id="methodology"
          className="grid gap-6 border-t border-slate-300/70 py-16 sm:py-20 md:grid-cols-[0.7fr_1.3fr] md:py-24"
        >
          <div>
            <p className="eyebrow">{m.methodology.eyebrow}</p>
          </div>
          <div className="space-y-6">
            <h2 className="font-editorial text-2xl leading-tight text-slate-950 sm:text-3xl md:text-4xl">
              {m.methodology.headline}
            </h2>
            <p className="max-w-3xl text-[15px] leading-7 text-slate-700 sm:text-base">
              {m.methodology.body}
            </p>
            <div className="surface-panel inline-block px-5 py-3">
              <code className="font-mono text-sm text-slate-900">{m.methodology.metric}</code>
            </div>

            {/* Thresholds */}
            <div className="grid gap-3 sm:grid-cols-2">
              {m.methodology.thresholds.map((t) => (
                <div key={t.label} className="surface-panel flex items-center gap-4 px-5 py-4">
                  <span className="font-mono text-lg font-semibold text-slate-950">{t.label}</span>
                  <span className="text-sm text-slate-700">{t.description}</span>
                </div>
              ))}
            </div>

            {/* Calculation methods */}
            <div className="grid gap-3 sm:grid-cols-2">
              {m.methodology.methods.map((method) => (
                <div key={method.method} className="surface-panel p-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{method.method}</h3>
                    <span className="rounded-full bg-[#dfe8db] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#23442a]">
                      {method.indicator}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-7 text-slate-700 sm:text-sm">
                    {method.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Integration ─── */}
        <section id="integration" className="border-t border-slate-300/70 py-16 sm:py-20 md:py-24">
          <SectionIntro label={m.integration.eyebrow} title={m.integration.headline}>
            <p>{m.integration.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 md:grid-cols-3">
            {m.integration.items.map((item) => (
              <article key={item.title} className="surface-panel flex flex-col gap-3 p-5 sm:p-6">
                <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{item.title}</h3>
                <p className="text-[13px] leading-7 text-slate-700 sm:text-sm">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-6 surface-panel border-l-4 border-l-[#593827] p-5 sm:mt-8 sm:p-6">
            <p className="text-[13px] leading-7 text-slate-700 sm:text-sm">
              {m.integration.aiActNote}
            </p>
          </div>
        </section>

        {/* ─── Example Output ─── */}
        <section className="border-t border-slate-300/70 py-16 sm:py-20 md:py-24">
          <SectionIntro label={m.exampleOutput.eyebrow} title={m.exampleOutput.headline}>
            <p>{m.exampleOutput.body}</p>
          </SectionIntro>
          <div className="mt-8 sm:mt-10 md:mt-12">
            <div className="rounded-2xl border border-slate-300/80 bg-[linear-gradient(180deg,#fbfaf7_0%,#f0ece3_100%)] p-4 shadow-[0_24px_70px_rgba(20,29,44,0.08)] sm:rounded-[2rem] sm:p-6">
              <div className="flex items-center gap-2 pb-4 sm:pb-5">
                <span className="h-2 w-2 rounded-full bg-[#d48b7e] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#d9b861] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#80ad7c] sm:h-2.5 sm:w-2.5" />
              </div>
              <pre className="overflow-x-auto font-mono text-xs leading-6 text-slate-900 sm:text-sm sm:leading-7">
                {m.exampleOutput.json}
              </pre>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section id="try-it" className="border-t border-slate-300/70 py-16 sm:py-20 md:py-24">
          <SectionIntro label={m.cta.eyebrow} title={m.cta.headline}>
            <p>{m.cta.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 md:grid-cols-2">
            {m.cta.engines.map((engine) => (
              <article key={engine.title} className="surface-panel flex flex-col gap-3 p-5 sm:p-6">
                <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
                  {engine.title}
                </h3>
                <p className="text-[13px] leading-7 text-slate-700 sm:text-sm">
                  {engine.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-8 sm:mt-10 md:mt-12">
            <div className="rounded-2xl border border-slate-300/80 bg-[linear-gradient(180deg,#fbfaf7_0%,#f0ece3_100%)] p-4 shadow-[0_24px_70px_rgba(20,29,44,0.08)] sm:rounded-[2rem] sm:p-6">
              <div className="flex items-center gap-2 pb-4 sm:pb-5">
                <span className="h-2 w-2 rounded-full bg-[#d48b7e] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#d9b861] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#80ad7c] sm:h-2.5 sm:w-2.5" />
              </div>
              <pre className="overflow-x-auto font-mono text-xs leading-6 text-slate-900 sm:text-sm sm:leading-7">
                {m.cta.cliCommand}
              </pre>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <ButtonLink href={siteConfig.githubUrl} external>
              {m.cta.links.webapp}
            </ButtonLink>
            <ButtonLink href="/spec" secondary>
              {m.cta.links.spec}
            </ButtonLink>
            <ButtonLink href={siteConfig.githubUrl} secondary external>
              {m.cta.links.github}
            </ButtonLink>
          </div>
        </section>

        {/* ─── Ethics ─── */}
        <section className="border-t border-slate-300/70 py-16 sm:py-20 md:py-24">
          <div className="max-w-3xl space-y-4">
            <p className="eyebrow">{m.ethics.eyebrow}</p>
            <p className="text-[15px] leading-7 text-slate-700 sm:text-base">{m.ethics.body}</p>
            <p className="text-xs leading-6 text-slate-500">{m.ethics.citation}</p>
            <p className="text-xs leading-6 text-slate-500">{m.ethics.license}</p>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-slate-300/70 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">EuConform</p>
              <p className="font-editorial text-2xl leading-none text-slate-950 sm:text-3xl">
                Open infrastructure for AI Act evidence.
              </p>
              <p className="max-w-xl text-[13px] leading-7 text-slate-700 sm:text-sm">
                EuConform is dual-licensed under{" "}
                <a
                  href={`${GITHUB_BASE}/blob/main/LICENSE`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline transition hover:text-slate-950"
                >
                  MIT
                </a>{" "}
                and{" "}
                <a
                  href={`${GITHUB_BASE}/blob/main/LICENSE-EUPL`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline transition hover:text-slate-950"
                >
                  EUPL-1.2
                </a>
                .
              </p>
              <div className="inline-flex items-center rounded-full border border-slate-300/80 bg-white/82 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-600 sm:px-4 sm:py-2 sm:text-[11px]">
                No cookies. No analytics. No tracking.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-700 sm:gap-5 sm:text-sm">
              <Link href="/" className="transition hover:text-slate-950">
                Home
              </Link>
              <Link href="/spec" className="transition hover:text-slate-950">
                Spec
              </Link>
              <a
                href={`${GITHUB_BASE}/tree/main/examples`}
                target="_blank"
                rel="noreferrer noopener"
                className="transition hover:text-slate-950"
              >
                Examples
              </a>
              <a
                href={siteConfig.githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="transition hover:text-slate-950"
              >
                GitHub
              </a>
              <Link href={imprintHref} className="transition hover:text-slate-950">
                Legal Notice
              </Link>
              <Link href={privacyHref} className="transition hover:text-slate-950">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
