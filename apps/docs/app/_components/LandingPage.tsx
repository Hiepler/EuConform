import Link from "next/link";
import type { Messages } from "../lib/i18n";
import { localePath } from "../lib/i18n";
import { type Locale, legalNoticePath, privacyPath, siteConfig } from "../lib/siteConfig";
import { ButtonLink } from "./ButtonLink";
import { EvidenceAssembly } from "./EvidenceAssembly";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";
import { SectionIntro } from "./SectionIntro";

const GOLDEN_PATH = `# Scan your project (no install needed)
npx @euconform/cli scan ./your-project \\
  --scope production \\
  --output ./.euconform \\
  --zip

# Verify the bundle integrity
npx @euconform/cli verify ./.euconform/euconform.bundle.json

# Or install globally
npm install -g @euconform/cli
euconform scan ./your-project --zip`;

export function LandingPage({ messages, locale }: { messages: Messages; locale: Locale }) {
  // The format spec is English-only — always link to /spec regardless of locale.
  const ecefHref = "/spec";
  const localeHome = localePath(locale);
  const imprintHref = legalNoticePath(locale);
  const privacyHref = privacyPath(locale);
  const heroHeadlineClass =
    locale === "de"
      ? "font-editorial max-w-4xl text-3xl leading-[0.98] text-slate-950 sm:text-4xl md:text-5xl lg:text-6xl xl:text-[5.4rem]"
      : "font-editorial max-w-3xl text-4xl leading-[0.94] text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl xl:text-[6.4rem]";

  return (
    <main className="relative overflow-x-clip bg-[#f7f4ed] text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[#d9d3f3]/36 blur-3xl" />
        <div className="absolute right-[-10rem] top-[12rem] h-[26rem] w-[26rem] rounded-full bg-[#d9e8f5]/42 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[18%] h-[22rem] w-[22rem] rounded-full bg-[#eadcc8]/42 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 md:px-10 md:pb-24 md:pt-6">
        {/* ─── Header ─── */}
        <header className="sticky top-3 z-50 mx-auto mb-8 flex max-w-6xl items-center justify-between gap-3 rounded-full border border-slate-300/60 bg-[rgba(253,251,246,0.78)] px-4 py-2.5 shadow-[0_12px_40px_-14px_rgba(20,29,44,0.22)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[rgba(253,251,246,0.62)] sm:px-5 sm:py-3 md:mb-10">
          <Link href={localeHome} className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold tracking-[0.2em] text-slate-900 sm:h-10 sm:w-10 sm:text-xs">
              EC
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-950 sm:text-sm">EuConform</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">
                {messages.header.brandTag}
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
            <a href="#eucef" className="transition hover:text-slate-950">
              {messages.header.nav.ecef}
            </a>
            <a href="#principles" className="transition hover:text-slate-950">
              {messages.header.nav.principles}
            </a>
            <a href="#reference-projects" className="transition hover:text-slate-950">
              {messages.header.nav.references}
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <LocaleSwitcher
                currentLocale={locale}
                labels={{ en: messages.localeSwitcher.en, de: messages.localeSwitcher.de }}
              />
            </div>
            <div className="hidden md:flex md:items-center md:gap-3">
              <ButtonLink href={ecefHref} secondary>
                {messages.header.readSpec}
              </ButtonLink>
              <ButtonLink href={siteConfig.githubUrl} external>
                {messages.header.viewGithub}
              </ButtonLink>
            </div>
            <MobileMenu
              messages={messages}
              locale={locale}
              ecefHref={ecefHref}
              githubUrl={siteConfig.githubUrl}
            />
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="grid gap-8 pb-16 pt-4 sm:gap-10 sm:pb-20 md:pb-24 md:pt-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10">
          <div className="space-y-6 sm:space-y-8">
            <p className="eyebrow">{messages.hero.eyebrow}</p>
            <div className="space-y-4 sm:space-y-6">
              <h1 className={heroHeadlineClass}>{messages.hero.headline}</h1>
              <p className="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
                {messages.hero.body}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href={ecefHref}>{messages.hero.primaryCta}</ButtonLink>
              <ButtonLink href="#golden-path" secondary>
                {messages.hero.secondaryCta}
              </ButtonLink>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {messages.pillars.map((pillar) => (
                <div
                  key={pillar}
                  className="surface-panel px-4 py-3.5 text-[13px] leading-6 text-slate-700 sm:py-4 sm:text-sm"
                >
                  {pillar}
                </div>
              ))}
            </div>
          </div>
          <EvidenceAssembly messages={messages.assembly} />
        </section>

        {/* ─── Why this exists ─── */}
        <section className="grid gap-6 border-y border-slate-300/70 py-8 sm:gap-8 sm:py-10 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="eyebrow">{messages.whyExists.eyebrow}</p>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <p className="font-editorial text-2xl leading-tight text-slate-950 sm:text-3xl md:text-4xl">
              {messages.whyExists.headline}
            </p>
            <p className="max-w-3xl text-[15px] leading-7 text-slate-700 sm:text-base">
              {messages.whyExists.body}
            </p>
          </div>
        </section>

        {/* ─── Vision ─── */}
        <section id="vision" className="py-16 sm:py-20 md:py-24">
          <SectionIntro label={messages.vision.eyebrow} title={messages.vision.title}>
            <p>{messages.vision.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 md:grid-cols-3">
            {messages.vision.cards.map((card) => (
              <article key={card.title} className="surface-panel flex flex-col gap-3 p-5 sm:p-6">
                <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{card.title}</h3>
                <p className="text-[13px] leading-7 text-slate-700 sm:text-sm">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Process ─── */}
        <section className="py-16 sm:py-20 md:py-24">
          <SectionIntro label={messages.process.eyebrow} title={messages.process.title}>
            <p>{messages.process.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 lg:grid-cols-3">
            {messages.process.steps.map((step) => (
              <article
                key={step.step}
                className="surface-panel flex flex-col gap-4 p-5 sm:gap-5 sm:p-6"
              >
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">
                  {step.step}
                </span>
                <h3 className="font-editorial text-2xl leading-none text-slate-950 sm:text-3xl">
                  {step.title}
                </h3>
                <p className="text-[13px] leading-7 text-slate-700 sm:text-sm">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── ECEF ─── */}
        <section id="eucef" className="py-16 sm:py-20 md:py-24">
          <SectionIntro label={messages.ecef.eyebrow} title={messages.ecef.title}>
            <p>{messages.ecef.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 lg:grid-cols-2">
            {messages.ecef.layers.map((layer) => (
              <article key={layer.title} className="surface-panel group p-5 sm:p-6 md:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <p className="eyebrow !mb-2 sm:!mb-3">{layer.eyebrow}</p>
                    <h3 className="font-editorial text-3xl leading-none text-slate-950 sm:text-4xl">
                      {layer.title}
                    </h3>
                  </div>
                  <span
                    className={`self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] sm:px-3 sm:text-[11px] ${layer.accent}`}
                  >
                    {layer.schema}
                  </span>
                </div>
                <p className="mt-4 max-w-xl text-[13px] leading-7 text-slate-700 sm:mt-6 sm:text-sm">
                  {layer.description}
                </p>
                <ul className="mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
                  {layer.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5 text-[13px] text-slate-700 sm:pb-3 sm:text-sm"
                    >
                      <span>{bullet}</span>
                      <span className="font-mono text-[10px] text-slate-500 sm:text-[11px]">
                        active
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ─── AI Act ─── */}
        <section id="ai-act" className="py-16 sm:py-20 md:py-24">
          <SectionIntro label={messages.aiAct.eyebrow} title={messages.aiAct.title}>
            <p>{messages.aiAct.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3">
            {messages.aiAct.roles.map((role) => (
              <article
                key={role.role}
                className="surface-panel flex flex-col gap-3 p-5 sm:gap-4 sm:p-6"
              >
                <p className="eyebrow !mb-0">{role.role}</p>
                <p className="text-[13px] leading-7 text-slate-700 sm:text-sm">
                  {role.description}
                </p>
                <div className="mt-auto border-t border-slate-200/80 pt-3 text-[13px] leading-7 text-slate-700 sm:pt-4 sm:text-sm">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#17345c] sm:text-[11px]">
                    EuConform
                  </span>{" "}
                  — {role.ecef}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-6 text-slate-500 sm:mt-8">
            {messages.aiAct.disclaimer}
          </p>
        </section>

        {/* ─── Principles ─── */}
        <section id="principles" className="py-16 sm:py-20 md:py-24">
          <SectionIntro label={messages.principles.eyebrow} title={messages.principles.title}>
            <p>{messages.principles.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-panel p-6 sm:p-8">
              <p className="font-editorial max-w-3xl text-2xl leading-tight text-slate-950 sm:text-3xl md:text-4xl lg:text-5xl">
                {messages.principles.pullQuote}
              </p>
            </div>
            <div className="grid gap-4 sm:gap-6">
              {messages.principles.items.map((principle) => (
                <article key={principle.title} className="surface-panel p-5 sm:p-6">
                  <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
                    {principle.title}
                  </h3>
                  <p className="mt-2.5 text-[13px] leading-7 text-slate-700 sm:mt-3 sm:text-sm">
                    {principle.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Golden Path ─── */}
        <section id="golden-path" className="py-16 sm:py-20 md:py-24">
          <SectionIntro label={messages.goldenPath.eyebrow} title={messages.goldenPath.title}>
            <p>{messages.goldenPath.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-300/80 bg-[linear-gradient(180deg,#fbfaf7_0%,#f0ece3_100%)] p-4 text-slate-900 shadow-[0_24px_70px_rgba(20,29,44,0.08)] sm:rounded-[2rem] sm:p-6">
              <div className="flex items-center gap-2 pb-4 sm:pb-5">
                <span className="h-2 w-2 rounded-full bg-[#d48b7e] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#d9b861] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#80ad7c] sm:h-2.5 sm:w-2.5" />
              </div>
              <pre className="mobile-code-block overflow-x-auto font-mono text-xs leading-6 text-slate-900 sm:text-sm sm:leading-7">
                {GOLDEN_PATH}
              </pre>
            </div>
            <div className="grid gap-4 sm:gap-6">
              <article className="surface-panel p-5 sm:p-6">
                <p className="eyebrow">{messages.goldenPath.whatLabel}</p>
                <ul className="mt-3 space-y-2.5 text-[13px] leading-7 text-slate-700 sm:mt-4 sm:space-y-3 sm:text-sm">
                  {messages.goldenPath.what.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="surface-panel p-5 sm:p-6">
                <p className="eyebrow">{messages.goldenPath.nextLabel}</p>
                <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:flex-wrap">
                  <ButtonLink href={ecefHref}>{messages.goldenPath.readSpec}</ButtonLink>
                  <ButtonLink href={`${siteConfig.githubUrl}#cli-scanner`} secondary external>
                    {messages.goldenPath.cliDocs}
                  </ButtonLink>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ─── Reference Projects ─── */}
        <section id="reference-projects" className="py-16 sm:py-20 md:py-24">
          <SectionIntro
            label={messages.referenceProjects.eyebrow}
            title={messages.referenceProjects.title}
          >
            <p>{messages.referenceProjects.body}</p>
          </SectionIntro>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:mt-12 lg:grid-cols-2">
            {messages.referenceProjects.projects.map((project) => (
              <article key={project.title} className="surface-panel p-5 sm:p-7">
                <p className="eyebrow">{messages.referenceProjects.exampleLabel}</p>
                <h3 className="font-editorial text-3xl leading-none text-slate-950 sm:text-4xl">
                  {project.title}
                </h3>
                <p className="mt-4 text-[13px] leading-7 text-slate-700 sm:mt-5 sm:text-sm">
                  {project.description}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                  <ButtonLink href={project.sourceHref} secondary external>
                    {messages.referenceProjects.sourceCta}
                  </ButtonLink>
                  <ButtonLink href={project.bundleHref} secondary external>
                    {messages.referenceProjects.bundleCta}
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-slate-300/70 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">{messages.footer.eyebrow}</p>
              <p className="font-editorial text-2xl leading-none text-slate-950 sm:text-3xl">
                {messages.footer.tagline}
              </p>
              <p className="max-w-xl text-[13px] leading-7 text-slate-700 sm:text-sm">
                {messages.footer.body}
              </p>
              <div className="inline-flex items-center rounded-full border border-slate-300/80 bg-white/82 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-600 sm:px-4 sm:py-2 sm:text-[11px]">
                {messages.footer.trustNote}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-700 sm:gap-5 sm:text-sm">
              <LocaleSwitcher
                currentLocale={locale}
                labels={{ en: messages.localeSwitcher.en, de: messages.localeSwitcher.de }}
              />
              <Link href={ecefHref} className="transition hover:text-slate-950">
                {messages.footer.links.ecef}
              </Link>
              <a
                href={`${siteConfig.githubUrl}/tree/main/examples`}
                target="_blank"
                rel="noreferrer noopener"
                className="transition hover:text-slate-950"
              >
                {messages.footer.links.examples}
              </a>
              <a
                href={siteConfig.githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="transition hover:text-slate-950"
              >
                {messages.footer.links.github}
              </a>
              <Link href={imprintHref} className="transition hover:text-slate-950">
                {messages.footer.links.legalNotice}
              </Link>
              <Link href={privacyHref} className="transition hover:text-slate-950">
                {messages.footer.links.privacy}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
