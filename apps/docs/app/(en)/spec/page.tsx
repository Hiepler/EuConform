import type { Metadata } from "next";
import Link from "next/link";
import { legalNoticePath, privacyPath, siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "EuConform Evidence Format — Open Specification",
  description:
    "The EuConform Evidence Format is an open specification for structured, offline AI Act compliance evidence. Stage 1 defines report, AI BOM, and CI. Stage 2 adds bundle manifests for transport and integrity verification.",
  alternates: {
    canonical: "/spec",
    languages: {
      en: "/spec",
      "x-default": "/spec",
    },
  },
  openGraph: {
    type: "article",
    url: "/spec",
    title: "EuConform Evidence Format — Open Specification",
    description:
      "Open specification for structured, offline AI Act compliance evidence. Schemas, examples, CLI usage, and validation.",
    locale: "en_US",
  },
};

const SCHEMA_BASE = "/schemas/spec";
const EXAMPLES_BASE = `${SCHEMA_BASE}/examples`;
const GITHUB_BASE = "https://github.com/Hiepler/EuConform";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Document types" },
  { id: "ai-act-mapping", label: "AI Act mapping" },
  { id: "report-v1", label: "Report v1" },
  { id: "aibom-v1", label: "AI BOM v1" },
  { id: "ci-v1", label: "CI v1" },
  { id: "bundle-v1", label: "Bundle v1" },
  { id: "schemas", label: "Schemas" },
  { id: "examples", label: "Examples" },
  { id: "validation", label: "Validation" },
  { id: "generate", label: "Generate with CLI" },
  { id: "verify", label: "Verify bundles" },
  { id: "viewer", label: "View in Web App" },
  { id: "versioning", label: "Versioning" },
  { id: "scope", label: "Scope and limitations" },
] as const;

const AI_ACT_MAPPINGS = [
  ["AI disclosure", "Art. 50 — Transparency obligations", "disclosure"],
  ["Bias testing", "Art. 10 — Data and data governance", "biasTesting"],
  ["Reporting and exports", "Art. 12 — Record-keeping", "reportingExports"],
  ["Logging and monitoring", "Art. 12 — Record-keeping", "loggingMonitoring"],
  ["Human oversight", "Art. 14 — Human oversight", "humanOversight"],
  ["Data governance", "Art. 10 — Data and data governance", "dataGovernance"],
  ["Incident reporting", "Art. 62 — Reporting of serious incidents", "incidentReporting"],
] as const;

const REPORT_FIELDS = [
  ["schemaVersion", '"euconform.report.v1"'],
  ["generatedAt", "ISO 8601 timestamp"],
  ["tool", "Scanner name and version"],
  ["target", "Project path, name, type, detected stack"],
  ["aiFootprint", "AI usage, inference modes, providers, RAG hints"],
  ["complianceSignals", "7 compliance area groups (status, confidence, evidence)"],
  ["assessmentHints", "Risk indicators, GPAI indicators, open questions"],
  ["gaps", "Scanner-derived compliance gaps with priority and status"],
  ["recommendationSummary", "Prioritized action items"],
] as const;

const AIBOM_FIELDS = [
  ["schemaVersion", '"euconform.aibom.v1"'],
  ["generatedAt", "ISO 8601 timestamp"],
  ["project", "Project name and root path"],
  ["components", "Array of AI components (kind, name, source) — empty for non-AI projects"],
  [
    "complianceCapabilities",
    "Boolean flags: biasEvaluation, jsonExport, pdfExport, logging, humanReview, incidents",
  ],
] as const;

const CI_FIELDS = [
  ["schemaVersion", '"euconform.ci.v1"'],
  ["generatedAt", "ISO 8601 timestamp"],
  ["target", "Project name and root path"],
  [
    "status",
    "failOn level, failing flag, gapCounts (critical/high/medium/low), openQuestions count",
  ],
  ["aiDetected", "Whether AI components were found"],
  ["scanScope", '"production" or "all"'],
  ["artifacts", "List of artifacts written during the scan"],
  ["complianceOverview", "Summary of all 7 compliance areas"],
  ["topGaps", "First 5 gaps (id, title, priority, status)"],
] as const;

const BUNDLE_FIELDS = [
  ["schemaVersion", '"euconform.bundle.v1"'],
  ["generatedAt", "ISO 8601 timestamp"],
  ["tool", "Tool name and version used to generate the bundle"],
  ["target", "Project name and root path shared by the artifact set"],
  ["artifacts", "Manifest entries containing role, filename, SHA-256, and optional schemaVersion"],
] as const;

const EXAMPLE_SCENARIOS = [
  {
    name: "Web App",
    dir: "web-app",
    desc: "Next.js with cloud OpenAI — typical SaaS AI integration",
    sourceHref: null,
  },
  {
    name: "Local Ollama",
    dir: "local-ollama",
    desc: "Local inference with Ollama/llama.cpp — no cloud dependency",
    sourceHref: `${GITHUB_BASE}/tree/main/examples/ollama-chatbot`,
  },
  {
    name: "RAG Service",
    dir: "rag",
    desc: "Retrieval-Augmented Generation with LangChain and ChromaDB",
    sourceHref: `${GITHUB_BASE}/tree/main/examples/rag-assistant`,
  },
  {
    name: "Non-AI",
    dir: "non-ai",
    desc: "Static site with no AI components — demonstrates clean zero-AI evidence",
    sourceHref: null,
  },
] as const;

const DOC_TYPES = [
  {
    name: "euconform.report.v1",
    purpose: "Compliance signals, gaps, open questions, and recommendations",
    anchor: "#report-v1",
    accent: "bg-[#ece2d3] text-[#593827]",
    label: "Evidence",
  },
  {
    name: "euconform.aibom.v1",
    purpose: "AI component inventory with compliance capabilities",
    anchor: "#aibom-v1",
    accent: "bg-[#d7e0f0] text-[#17345c]",
    label: "Inventory",
  },
  {
    name: "euconform.ci.v1",
    purpose: "CI gate status, gap counts, and top findings",
    anchor: "#ci-v1",
    accent: "bg-[#dfe8db] text-[#23442a]",
    label: "Gate",
  },
  {
    name: "euconform.bundle.v1",
    purpose: "Integrity and transport manifest for artifact sets",
    anchor: "#bundle-v1",
    accent: "bg-[#e3dff2] text-[#39275f]",
    label: "Transport",
  },
] as const;

// ---------------------------------------------------------------------------
// Shared components — restyled to match landing page design system
// ---------------------------------------------------------------------------

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-editorial text-2xl leading-tight text-slate-950 sm:text-3xl md:text-4xl mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline-block rounded-md border border-slate-200/80 bg-white/60 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-slate-300/80 bg-[linear-gradient(180deg,#fbfaf7_0%,#f0ece3_100%)] p-4 shadow-[0_24px_70px_rgba(20,29,44,0.08)] sm:rounded-[2rem] sm:p-6">
      <div className="flex items-center gap-2 pb-3 sm:pb-4">
        <span className="h-2 w-2 rounded-full bg-[#d48b7e] sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-[#d9b861] sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-[#80ad7c] sm:h-2.5 sm:w-2.5" />
      </div>
      <pre className="mobile-code-block overflow-x-auto font-mono text-xs leading-6 text-slate-900 sm:text-sm sm:leading-7">
        {children}
      </pre>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="font-medium text-[#17345c] underline decoration-[#17345c]/30 underline-offset-[3px] transition hover:decoration-[#17345c]/60"
      target="_blank"
      rel="noreferrer noopener"
    >
      {children}
    </a>
  );
}

function FieldTable({ fields }: { fields: readonly (readonly [string, string])[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm mb-4">
        <tbody>
          {fields.map(([field, desc]) => (
            <tr key={field} className="border-b border-slate-200/60">
              <td className="py-2.5 pr-4 font-mono text-xs text-slate-800">{field}</td>
              <td className="py-2.5 text-slate-600">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchemaFooter({ schemaFile, examplePath }: { schemaFile: string; examplePath: string }) {
  return (
    <p className="text-sm text-slate-500">
      <ExtLink href={`${SCHEMA_BASE}/${schemaFile}`}>View full schema</ExtLink>
      <span className="mx-2 text-slate-300">·</span>
      <ExtLink href={examplePath}>Example artifact</ExtLink>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EcefPage() {
  const imprintHref = legalNoticePath("en");
  const privacyHref = privacyPath("en");

  return (
    <main className="relative overflow-x-clip bg-[#f7f4ed] text-slate-950">
      {/* Background orbs — same as landing page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[#d9d3f3]/36 blur-3xl" />
        <div className="absolute right-[-10rem] top-[12rem] h-[26rem] w-[26rem] rounded-full bg-[#d9e8f5]/42 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[18%] h-[22rem] w-[22rem] rounded-full bg-[#eadcc8]/42 blur-3xl" />
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
            <a href="#overview" className="transition hover:text-slate-950">
              Overview
            </a>
            <a href="#documents" className="transition hover:text-slate-950">
              Documents
            </a>
            <a href="#schemas" className="transition hover:text-slate-950">
              Schemas
            </a>
            <a href="#examples" className="transition hover:text-slate-950">
              Examples
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center rounded-full border border-slate-300/80 bg-white/82 px-4 py-2.5 text-[13px] font-medium text-slate-900 transition hover:border-slate-500 hover:bg-white sm:inline-flex sm:px-5 sm:py-3 sm:text-sm"
            >
              ← Back to docs
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
        <div className="mx-auto max-w-4xl">
          <header className="pb-12 pt-4 sm:pb-16 md:pb-20 md:pt-8">
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm">
              <Link href="/" className="text-slate-500 transition hover:text-slate-700">
                EuConform
              </Link>
              <span className="text-slate-400">/</span>
              <span className="font-medium text-slate-900">Specification</span>
            </nav>

            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="font-editorial text-3xl leading-tight text-slate-950 sm:text-4xl md:text-5xl lg:text-[3.6rem]">
                  EuConform Evidence Format
                </h1>
              </div>
              <p className="max-w-3xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
                The EuConform Evidence Format is an open specification for structured, offline AI
                Act compliance evidence. It defines machine-readable document types that capture
                what a scanner found — not legal verdicts, but{" "}
                <strong className="text-slate-950">verifiable evidence for human review</strong>.
              </p>
              <p className="text-[13px] text-slate-500 sm:text-sm">
                Stage 1 schemas are frozen. Breaking changes require a new major version.
              </p>
            </div>
          </header>

          {/* ─── Table of contents ─── */}
          <nav
            aria-label="Table of contents"
            className="surface-panel mb-12 p-5 sm:mb-16 sm:p-6 md:mb-20"
          >
            <p className="eyebrow mb-4">Contents</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] sm:text-sm">
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-slate-600 transition hover:text-slate-950"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* ─── Sections ─── */}
          <div className="space-y-16 sm:space-y-20 md:space-y-24">
            <Section id="overview" title="Overview">
              <p className="mb-5 text-[15px] leading-7 text-slate-700 sm:text-base">
                The EuConform Evidence Format defines three stable Stage 1 document types and one
                Stage 2 transport document for EU AI Act evidence:
              </p>
              <ul className="space-y-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong className="text-slate-950">AI BOM</strong> (AI Bill of Materials) is the{" "}
                    <em>inventory layer</em> — which AI components are present
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong className="text-slate-950">Report</strong> is the{" "}
                    <em>compliance evidence layer</em> — what signals, gaps, and recommendations the
                    scanner found
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong className="text-slate-950">CI</strong> is the <em>enforcement layer</em>{" "}
                    — pass/fail gate status for CI pipelines
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong className="text-slate-950">Bundle</strong> is the{" "}
                    <em>transport and integrity layer</em> — which files belong together and whether
                    they still match their recorded hashes
                  </span>
                </li>
              </ul>
              <p className="mt-5 text-[13px] text-slate-500 sm:text-sm">
                &ldquo;AI BOM&rdquo; is one document type within the EuConform Evidence Format, not
                the name of the overall specification.
              </p>
            </Section>

            <Section id="documents" title="Document types">
              <div className="grid gap-4 sm:grid-cols-2">
                {DOC_TYPES.map((doc) => (
                  <a
                    key={doc.name}
                    href={doc.anchor}
                    className="surface-panel group flex flex-col gap-3 p-5 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] sm:text-[11px] ${doc.accent}`}
                        >
                          {doc.label}
                        </span>
                      </div>
                    </div>
                    <p className="font-mono text-[13px] font-medium text-slate-900 sm:text-sm">
                      {doc.name}
                    </p>
                    <p className="text-[13px] leading-6 text-slate-600 sm:text-sm">{doc.purpose}</p>
                  </a>
                ))}
              </div>
            </Section>

            <Section id="ai-act-mapping" title="AI Act mapping">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The EuConform Evidence Format compliance signals map to specific areas of the EU AI
                Act. The scanner detects evidence for these areas — classification and legal
                interpretation remain with the human reviewer.
              </p>
              <div className="surface-panel overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/80">
                        <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">
                          Compliance area
                        </th>
                        <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">
                          AI Act reference
                        </th>
                        <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:px-6">
                          Format field
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {AI_ACT_MAPPINGS.map(([area, article, field]) => (
                        <tr key={field} className="border-b border-slate-200/60 last:border-0">
                          <td className="whitespace-nowrap px-5 py-3 text-[13px] font-medium text-slate-800 sm:px-6 sm:text-sm">
                            {area}
                          </td>
                          <td className="px-5 py-3 text-[13px] text-slate-600 sm:px-6 sm:text-sm">
                            {article}
                          </td>
                          <td className="px-5 py-3 sm:px-6">
                            <Code>{`complianceSignals.${field}`}</Code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>

            <Section id="report-v1" title="Report v1">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The report is the primary compliance evidence document. It captures what the scanner
                found across seven compliance areas, including assessment hints, gaps, and
                recommendations.
              </p>
              <div className="surface-panel overflow-hidden p-0 mb-4">
                <div className="border-b border-slate-200/60 px-5 py-3 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Required fields
                  </p>
                </div>
                <div className="px-5 py-2 sm:px-6">
                  <FieldTable fields={REPORT_FIELDS} />
                </div>
              </div>
              <SchemaFooter
                schemaFile="report-v1.schema.json"
                examplePath={`${EXAMPLES_BASE}/web-app/euconform.report.json`}
              />
            </Section>

            <Section id="aibom-v1" title="AI BOM v1">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The AI Bill of Materials is the inventory layer — a structured list of AI-relevant
                components in the scanned project, plus detected compliance capabilities.
              </p>
              <div className="surface-panel overflow-hidden p-0 mb-4">
                <div className="border-b border-slate-200/60 px-5 py-3 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Required fields
                  </p>
                </div>
                <div className="px-5 py-2 sm:px-6">
                  <FieldTable fields={AIBOM_FIELDS} />
                </div>
              </div>
              <p className="text-[13px] text-slate-500 mb-3 sm:text-sm">
                Component IDs follow the pattern <Code>kind:kebab-name</Code>, e.g.{" "}
                <Code>inference-provider:openai</Code>, <Code>runtime:node-js</Code>.
              </p>
              <SchemaFooter
                schemaFile="aibom-v1.schema.json"
                examplePath={`${EXAMPLES_BASE}/rag/euconform.aibom.json`}
              />
            </Section>

            <Section id="ci-v1" title="CI v1">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The CI document is the enforcement layer — a compact summary for pipeline gates and
                dashboards. It captures pass/fail status, gap counts, and the top findings.
              </p>
              <div className="surface-panel overflow-hidden p-0 mb-4">
                <div className="border-b border-slate-200/60 px-5 py-3 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Required fields
                  </p>
                </div>
                <div className="px-5 py-2 sm:px-6">
                  <FieldTable fields={CI_FIELDS} />
                </div>
              </div>
              <SchemaFooter
                schemaFile="ci-v1.schema.json"
                examplePath={`${EXAMPLES_BASE}/web-app/euconform.ci.json`}
              />
            </Section>

            <Section id="bundle-v1" title="Bundle v1">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The bundle is the Stage 2 transport and integrity layer. It binds artifacts from a
                single scan run into a verifiable unit and optionally packages them as a flat ZIP
                archive.
              </p>
              <div className="surface-panel overflow-hidden p-0 mb-4">
                <div className="border-b border-slate-200/60 px-5 py-3 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Required fields
                  </p>
                </div>
                <div className="px-5 py-2 sm:px-6">
                  <FieldTable fields={BUNDLE_FIELDS} />
                </div>
              </div>
              <p className="text-[13px] text-slate-500 mb-3 sm:text-sm">
                Each artifact entry records <Code>role</Code>, <Code>fileName</Code>,{" "}
                <Code>sha256</Code>, <Code>required</Code>, and optional <Code>schemaVersion</Code>{" "}
                or <Code>mimeType</Code>.
              </p>
              <SchemaFooter
                schemaFile="bundle-v1.schema.json"
                examplePath={`${EXAMPLES_BASE}/web-app/euconform.bundle.json`}
              />
            </Section>

            <Section id="schemas" title="Schemas">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                All EuConform Evidence Format schemas use JSON Schema Draft 2020-12 with{" "}
                <Code>additionalProperties: false</Code> for strict validation.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { file: "report-v1.schema.json", label: "Report v1", accent: "bg-[#ece2d3]" },
                  { file: "aibom-v1.schema.json", label: "AI BOM v1", accent: "bg-[#d7e0f0]" },
                  { file: "ci-v1.schema.json", label: "CI v1", accent: "bg-[#dfe8db]" },
                  { file: "bundle-v1.schema.json", label: "Bundle v1", accent: "bg-[#e3dff2]" },
                ].map((schema) => (
                  <a
                    key={schema.file}
                    href={`${SCHEMA_BASE}/${schema.file}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="surface-panel flex items-center gap-3 p-4 sm:p-5"
                  >
                    <span className={`h-2 w-2 rounded-full ${schema.accent}`} />
                    <span className="font-mono text-[13px] text-slate-800 sm:text-sm">
                      {schema.file}
                    </span>
                  </a>
                ))}
              </div>
              <p className="mt-5 text-[13px] text-slate-500 sm:text-sm">
                Canonical URLs:{" "}
                <Code>https://euconform.eu/schemas/spec/&#123;type&#125;-v1.schema.json</Code>
              </p>
            </Section>

            <Section id="examples" title="Examples">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                Four example scenarios demonstrate the EuConform Evidence Format across different
                project types. The local Ollama and RAG scenarios also have builder-facing source
                projects in the repository.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {EXAMPLE_SCENARIOS.map((ex) => (
                  <div key={ex.dir} className="surface-panel p-5 sm:p-6">
                    <p className="text-base font-semibold text-slate-950 sm:text-lg">{ex.name}</p>
                    <p className="mt-2 text-[13px] leading-6 text-slate-600 sm:text-sm">
                      {ex.desc}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[13px] sm:text-sm">
                      <ExtLink href={`${EXAMPLES_BASE}/${ex.dir}/euconform.report.json`}>
                        report
                      </ExtLink>
                      <ExtLink href={`${EXAMPLES_BASE}/${ex.dir}/euconform.aibom.json`}>
                        aibom
                      </ExtLink>
                      <ExtLink href={`${EXAMPLES_BASE}/${ex.dir}/euconform.ci.json`}>ci</ExtLink>
                      <ExtLink href={`${EXAMPLES_BASE}/${ex.dir}/euconform.bundle.json`}>
                        bundle
                      </ExtLink>
                      {ex.sourceHref ? <ExtLink href={ex.sourceHref}>source</ExtLink> : null}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="validation" title="Validation">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                Validate any EuConform Evidence Format document against the published schemas using{" "}
                <ExtLink href="https://ajv.js.org">ajv</ExtLink>:
              </p>
              <Pre>{`npm install ajv ajv-formats

# validate.mjs
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const schema = JSON.parse(
  readFileSync("report-v1.schema.json", "utf8")      // or fetch from:
  // https://euconform.eu/schemas/spec/report-v1.schema.json
);

const report = JSON.parse(
  readFileSync(".euconform/euconform.report.json", "utf8")
);

const valid = ajv.validate(schema, report);
if (!valid) console.error(ajv.errors);
else console.log("Valid EuConform report.");`}</Pre>
              <p className="mt-5 text-[13px] text-slate-500 sm:text-sm">
                For full artifact-set verification, prefer the built-in CLI verify command instead
                of validating the manifest alone.
              </p>
            </Section>

            <Section id="generate" title="Generate with CLI">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The EuConform CLI scans a codebase and writes the EuConform Evidence Format
                artifacts to <Code>.euconform/</Code>:
              </p>
              <Pre>{`pnpm --filter @euconform/cli build

node packages/cli/dist/index.js scan .

# Output:
#   .euconform/euconform.report.json
#   .euconform/euconform.aibom.json
#   .euconform/euconform.summary.md

# With CI gate:
node packages/cli/dist/index.js scan . --ci github --fail-on high

# Additional output:
#   .euconform/euconform.ci.json
#   .euconform/euconform.ci-summary.md
#   .euconform/euconform.bundle.json

# Create a transport archive:
node packages/cli/dist/index.js scan . --zip true

# Additional output:
#   .euconform/euconform.bundle.zip`}</Pre>
              <p className="mt-5 text-[13px] text-slate-500 sm:text-sm">
                For a fast adoption path, try <Code>examples/ollama-chatbot</Code> or{" "}
                <Code>examples/rag-assistant</Code> from the repo root before scanning your own
                project.
              </p>
            </Section>

            <Section id="verify" title="Verify bundles">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The CLI is the first Stage 2 bundle consumer. It verifies bundle manifests,
                extracted bundle directories, and ZIP archives without modifying your project.
              </p>
              <Pre>{`# Verify a manifest file
node packages/cli/dist/index.js verify .euconform/euconform.bundle.json

# Verify an extracted bundle directory
node packages/cli/dist/index.js verify .euconform/euconform.bundle

# Verify a ZIP archive
node packages/cli/dist/index.js verify .euconform/euconform.bundle.zip

# Escalate warnings to errors for CI
node packages/cli/dist/index.js verify .euconform/euconform.bundle.json --strict --fail-on warnings`}</Pre>
              <p className="mt-5 text-[13px] text-slate-500 sm:text-sm">
                Hash and metadata mismatches are warnings by default. Missing required artifacts or
                an invalid bundle manifest are always errors.
              </p>
            </Section>

            <Section id="viewer" title="View in Web App">
              <p className="mb-6 text-[15px] leading-7 text-slate-700 sm:text-base">
                The EuConform web app includes a Scan Viewer that imports the EuConform Evidence
                Format artifacts directly in the browser — no upload, no server, fully client-side.
              </p>
              <div className="surface-panel p-5 sm:p-6">
                <ol className="space-y-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                      1
                    </span>
                    Open the web app and select{" "}
                    <strong className="text-slate-950">Import Scan</strong>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                      2
                    </span>
                    <span>
                      Drop your <Code>.euconform/</Code> files (report is required, aibom/ci/summary
                      are optional)
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                      3
                    </span>
                    The viewer displays compliance signals, gaps, AI BOM, and CI status
                  </li>
                </ol>
              </div>
            </Section>

            <Section id="versioning" title="Versioning and compatibility">
              <ul className="space-y-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <Code>schemaVersion</Code> is the compatibility boundary for every document
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    Schemas enforce <Code>additionalProperties: false</Code> — all fields must be
                    explicitly defined
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>Patch releases do not change document shape</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    Adding optional fields requires a new schema revision (e.g.{" "}
                    <Code>report-v1.1.schema.json</Code>)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    Breaking changes use a new <Code>schemaVersion</Code> (e.g.{" "}
                    <Code>euconform.report.v2</Code>)
                  </span>
                </li>
              </ul>
            </Section>

            <Section id="scope" title="Scope and limitations">
              <p className="mb-5 text-[15px] leading-7 text-slate-700 sm:text-base">
                The EuConform Evidence Format currently covers Stage 1 evidence documents and the
                Stage 2 bundle manifest. The following are{" "}
                <strong className="text-slate-950">not</strong> part of the current specification:
              </p>
              <ul className="space-y-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <Code>euconform.eval.v1</Code> — evaluation results and benchmarks (reserved,
                    not yet specified)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>Automatic ZIP import in the web viewer</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>Full prompt histories or training data disclosure</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>Legally binding classification or certification</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>A separate npm consumer package (use the schemas directly)</span>
                </li>
              </ul>
              <div className="surface-panel mt-6 p-5 sm:p-6">
                <p className="font-editorial text-lg leading-relaxed text-slate-950 sm:text-xl">
                  The EuConform Evidence Format produces <strong>evidence for human review</strong>,
                  not automated legal verdicts. Compliance classification requires human judgment
                  informed by organizational context.
                </p>
              </div>
            </Section>
          </div>
        </div>

        {/* ─── Footer — matches landing page ─── */}
        <footer className="mx-auto mt-16 max-w-4xl border-t border-slate-300/70 py-8 sm:mt-20 sm:py-10 md:mt-24">
          <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">EuConform</p>
              <p className="font-editorial text-2xl leading-none text-slate-950 sm:text-3xl">
                Open infrastructure for AI Act evidence.
              </p>
              <p className="max-w-xl text-[13px] leading-7 text-slate-700 sm:text-sm">
                EuConform is dual-licensed under{" "}
                <ExtLink href={`${GITHUB_BASE}/blob/main/LICENSE`}>MIT</ExtLink> and{" "}
                <ExtLink href={`${GITHUB_BASE}/blob/main/LICENSE-EUPL`}>EUPL-1.2</ExtLink>.
              </p>
              <div className="inline-flex items-center rounded-full border border-slate-300/80 bg-white/82 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-600 sm:px-4 sm:py-2 sm:text-[11px]">
                No cookies. No analytics. No tracking.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-700 sm:gap-5 sm:text-sm">
              <Link href="/" className="transition hover:text-slate-950">
                Home
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
