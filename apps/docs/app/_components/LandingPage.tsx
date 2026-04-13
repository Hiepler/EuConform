import Link from "next/link";
import type { Messages } from "../lib/i18n";
import { localePath } from "../lib/i18n";
import { type Locale, legalNoticePath, privacyPath, siteConfig } from "../lib/siteConfig";
import { ButtonLink } from "./ButtonLink";
import { EvidenceAssembly } from "./EvidenceAssembly";
import { LocaleSwitcher } from "./LocaleSwitcher";
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
      ? "font-editorial max-w-4xl text-5xl leading-[0.98] text-slate-950 md:text-6xl xl:text-[5.4rem]"
      : "font-editorial max-w-3xl text-6xl leading-[0.94] text-slate-950 md:text-7xl xl:text-[6.4rem]";

  return (
    <main className="relative overflow-hidden bg-[#f7f4ed] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[#d9d3f3]/36 blur-3xl" />
        <div className="absolute right-[-10rem] top-[12rem] h-[26rem] w-[26rem] rounded-full bg-[#d9e8f5]/42 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[18%] h-[22rem] w-[22rem] rounded-full bg-[#eadcc8]/42 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-6 md:px-10 md:pb-24">
        <header className="sticky top-4 z-50 mx-auto mb-10 flex max-w-6xl items-center justify-between gap-4 rounded-full border border-slate-300/70 bg-[rgba(253,251,246,0.92)] px-5 py-3 shadow-[0_10px_32px_-12px_rgba(20,29,44,0.18)] backdrop-blur-xl">
          <Link href={localeHome} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold tracking-[0.2em] text-slate-900">
              EC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">EuConform</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
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
          <div className="flex items-center gap-3">
            <LocaleSwitcher
              currentLocale={locale}
              labels={{ en: messages.localeSwitcher.en, de: messages.localeSwitcher.de }}
            />
            <ButtonLink href={ecefHref} secondary>
              {messages.header.readSpec}
            </ButtonLink>
            <ButtonLink href={siteConfig.githubUrl} external>
              {messages.header.viewGithub}
            </ButtonLink>
          </div>
        </header>

        <section className="grid gap-10 pb-24 pt-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="space-y-8">
            <p className="eyebrow">{messages.hero.eyebrow}</p>
            <div className="space-y-6">
              <h1 className={heroHeadlineClass}>{messages.hero.headline}</h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">{messages.hero.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={ecefHref}>{messages.hero.primaryCta}</ButtonLink>
              <ButtonLink href="#golden-path" secondary>
                {messages.hero.secondaryCta}
              </ButtonLink>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {messages.pillars.map((pillar) => (
                <div
                  key={pillar}
                  className="surface-panel px-4 py-4 text-sm leading-6 text-slate-700"
                >
                  {pillar}
                </div>
              ))}
            </div>
          </div>
          <EvidenceAssembly messages={messages.assembly} />
        </section>

        <section className="grid gap-8 border-y border-slate-300/70 py-10 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="eyebrow">{messages.whyExists.eyebrow}</p>
          </div>
          <div className="space-y-6">
            <p className="font-editorial text-3xl leading-tight text-slate-950 md:text-4xl">
              {messages.whyExists.headline}
            </p>
            <p className="max-w-3xl text-base leading-7 text-slate-700">
              {messages.whyExists.body}
            </p>
          </div>
        </section>

        <section id="vision" className="py-24">
          <SectionIntro label={messages.vision.eyebrow} title={messages.vision.title}>
            <p>{messages.vision.body}</p>
          </SectionIntro>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {messages.vision.cards.map((card) => (
              <article key={card.title} className="surface-panel flex flex-col gap-3 p-6">
                <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                <p className="text-sm leading-7 text-slate-700">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-24">
          <SectionIntro label={messages.process.eyebrow} title={messages.process.title}>
            <p>{messages.process.body}</p>
          </SectionIntro>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {messages.process.steps.map((step) => (
              <article key={step.step} className="surface-panel flex flex-col gap-5 p-6">
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">
                  {step.step}
                </span>
                <h3 className="font-editorial text-3xl leading-none text-slate-950">
                  {step.title}
                </h3>
                <p className="text-sm leading-7 text-slate-700">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="eucef" className="py-24">
          <SectionIntro label={messages.ecef.eyebrow} title={messages.ecef.title}>
            <p>{messages.ecef.body}</p>
          </SectionIntro>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {messages.ecef.layers.map((layer) => (
              <article key={layer.title} className="surface-panel group p-6 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow !mb-3">{layer.eyebrow}</p>
                    <h3 className="font-editorial text-4xl leading-none text-slate-950">
                      {layer.title}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${layer.accent}`}
                  >
                    {layer.schema}
                  </span>
                </div>
                <p className="mt-6 max-w-xl text-sm leading-7 text-slate-700">
                  {layer.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {layer.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 text-sm text-slate-700"
                    >
                      <span>{bullet}</span>
                      <span className="font-mono text-[11px] text-slate-500">active</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="ai-act" className="py-24">
          <SectionIntro label={messages.aiAct.eyebrow} title={messages.aiAct.title}>
            <p>{messages.aiAct.body}</p>
          </SectionIntro>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {messages.aiAct.roles.map((role) => (
              <article key={role.role} className="surface-panel flex flex-col gap-4 p-6">
                <p className="eyebrow !mb-0">{role.role}</p>
                <p className="text-sm leading-7 text-slate-700">{role.description}</p>
                <div className="mt-auto border-t border-slate-200/80 pt-4 text-sm leading-7 text-slate-700">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#17345c]">
                    EuConform
                  </span>{" "}
                  — {role.ecef}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-6 text-slate-500">
            {messages.aiAct.disclaimer}
          </p>
        </section>

        <section id="principles" className="py-24">
          <SectionIntro label={messages.principles.eyebrow} title={messages.principles.title}>
            <p>{messages.principles.body}</p>
          </SectionIntro>
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-panel p-8">
              <p className="font-editorial max-w-3xl text-4xl leading-tight text-slate-950 md:text-5xl">
                {messages.principles.pullQuote}
              </p>
            </div>
            <div className="grid gap-6">
              {messages.principles.items.map((principle) => (
                <article key={principle.title} className="surface-panel p-6">
                  <h3 className="text-lg font-semibold text-slate-950">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{principle.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="golden-path" className="py-24">
          <SectionIntro label={messages.goldenPath.eyebrow} title={messages.goldenPath.title}>
            <p>{messages.goldenPath.body}</p>
          </SectionIntro>
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-slate-300/80 bg-[linear-gradient(180deg,#fbfaf7_0%,#f0ece3_100%)] p-6 text-slate-900 shadow-[0_24px_70px_rgba(20,29,44,0.08)]">
              <div className="flex items-center gap-2 pb-5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d48b7e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#d9b861]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#80ad7c]" />
              </div>
              <pre className="overflow-x-auto font-mono text-sm leading-7 text-slate-900">
                {GOLDEN_PATH}
              </pre>
            </div>
            <div className="grid gap-6">
              <article className="surface-panel p-6">
                <p className="eyebrow">{messages.goldenPath.whatLabel}</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                  {messages.goldenPath.what.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="surface-panel p-6">
                <p className="eyebrow">{messages.goldenPath.nextLabel}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ButtonLink href={ecefHref}>{messages.goldenPath.readSpec}</ButtonLink>
                  <ButtonLink href={`${siteConfig.githubUrl}#cli-scanner`} secondary external>
                    {messages.goldenPath.cliDocs}
                  </ButtonLink>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="reference-projects" className="py-24">
          <SectionIntro
            label={messages.referenceProjects.eyebrow}
            title={messages.referenceProjects.title}
          >
            <p>{messages.referenceProjects.body}</p>
          </SectionIntro>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {messages.referenceProjects.projects.map((project) => (
              <article key={project.title} className="surface-panel p-7">
                <p className="eyebrow">{messages.referenceProjects.exampleLabel}</p>
                <h3 className="font-editorial text-4xl leading-none text-slate-950">
                  {project.title}
                </h3>
                <p className="mt-5 text-sm leading-7 text-slate-700">{project.description}</p>
                <div className="mt-8 flex flex-wrap gap-3">
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

        <footer className="border-t border-slate-300/70 py-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">{messages.footer.eyebrow}</p>
              <p className="font-editorial text-3xl leading-none text-slate-950">
                {messages.footer.tagline}
              </p>
              <p className="max-w-xl text-sm leading-7 text-slate-700">{messages.footer.body}</p>
              <div className="inline-flex items-center rounded-full border border-slate-300/80 bg-white/82 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-600">
                {messages.footer.trustNote}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm text-slate-700">
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
