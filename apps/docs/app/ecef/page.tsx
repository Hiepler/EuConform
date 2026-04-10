import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EuConform Evidence Format (ECEF) — Open Specification",
  description:
    "ECEF is an open specification for structured, offline AI Act compliance evidence. Stage 1 defines report, AI BOM, and CI document types.",
};

const SCHEMA_BASE = "/schemas/ecef";
const EXAMPLES_BASE = `${SCHEMA_BASE}/examples`;
const GITHUB_BASE = "https://github.com/Hiepler/EuConform";

const LINK_CLASS = "underline text-blue-600 dark:text-blue-400";

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Document types" },
  { id: "ai-act-mapping", label: "AI Act mapping" },
  { id: "report-v1", label: "Report v1" },
  { id: "aibom-v1", label: "AI BOM v1" },
  { id: "ci-v1", label: "CI v1" },
  { id: "schemas", label: "Schemas" },
  { id: "examples", label: "Examples" },
  { id: "validation", label: "Validation" },
  { id: "generate", label: "Generate with CLI" },
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

const EXAMPLE_SCENARIOS = [
  {
    name: "Web App",
    dir: "web-app",
    desc: "Next.js with cloud OpenAI — typical SaaS AI integration",
  },
  {
    name: "Local Ollama",
    dir: "local-ollama",
    desc: "Local inference with Ollama/llama.cpp — no cloud dependency",
  },
  {
    name: "RAG Service",
    dir: "rag",
    desc: "Retrieval-Augmented Generation with LangChain and ChromaDB",
  },
  {
    name: "Non-AI",
    dir: "non-ai",
    desc: "Static site with no AI components — demonstrates clean zero-AI evidence",
  },
] as const;

// ---------------------------------------------------------------------------
// Shared components
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
    <section id={id} className="scroll-mt-8">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="p-4 bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-lg text-sm overflow-x-auto font-mono leading-relaxed">
      {children}
    </pre>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className={LINK_CLASS} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

function FieldTable({ fields }: { fields: readonly (readonly [string, string])[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm mb-4">
        <tbody className="text-slate-600 dark:text-slate-300">
          {fields.map(([field, desc]) => (
            <tr key={field} className="border-b border-slate-100 dark:border-slate-800">
              <td className="py-1.5 pr-4 font-mono text-xs">{field}</td>
              <td className="py-1.5 text-slate-500 dark:text-slate-400">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchemaFooter({ schemaFile, examplePath }: { schemaFile: string; examplePath: string }) {
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      <ExtLink href={`${SCHEMA_BASE}/${schemaFile}`}>View full schema</ExtLink>
      {" · "}
      <ExtLink href={examplePath}>Example artifact</ExtLink>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EcefPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href="/" className="text-slate-500 dark:text-slate-400 hover:underline">
            EuConform
          </Link>
          <span className="text-slate-400 dark:text-slate-600 mx-2">/</span>
          <span className="text-slate-900 dark:text-white font-medium">ECEF</span>
        </nav>

        <header className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              EuConform Evidence Format
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full">
              Stage 1 — Stable
            </span>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
            ECEF is an open specification for structured, offline AI Act compliance evidence. It
            defines machine-readable document types that capture what a scanner found — not legal
            verdicts, but{" "}
            <strong className="text-slate-900 dark:text-white">
              verifiable evidence for human review
            </strong>
            .
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stage 1 schemas are frozen. Breaking changes require a new major version.
          </p>
        </header>

        <nav aria-label="Table of contents" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Section id="overview" title="Overview">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            ECEF defines three document types that together form a complete evidence package for EU
            AI Act compliance assessment:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-slate-600 dark:text-slate-300">
            <li>
              <strong>AI BOM</strong> (AI Bill of Materials) is the <em>inventory layer</em> — which
              AI components are present
            </li>
            <li>
              <strong>Report</strong> is the <em>compliance evidence layer</em> — what signals,
              gaps, and recommendations the scanner found
            </li>
            <li>
              <strong>CI</strong> is the <em>enforcement layer</em> — pass/fail gate status for CI
              pipelines
            </li>
          </ul>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-4">
            &ldquo;AI BOM&rdquo; is one document type within ECEF, not the name of the overall
            specification.
          </p>
        </Section>

        <Section id="documents" title="Document types">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                name: "euconform.report.v1",
                purpose: "Compliance signals, gaps, open questions, and recommendations",
                anchor: "#report-v1",
              },
              {
                name: "euconform.aibom.v1",
                purpose: "AI component inventory with compliance capabilities",
                anchor: "#aibom-v1",
              },
              {
                name: "euconform.ci.v1",
                purpose: "CI gate status, gap counts, and top findings",
                anchor: "#ci-v1",
              },
            ].map((doc) => (
              <a
                key={doc.name}
                href={doc.anchor}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
              >
                <p className="font-mono text-sm font-medium text-slate-900 dark:text-white mb-1">
                  {doc.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{doc.purpose}</p>
              </a>
            ))}
          </div>
        </Section>

        <Section id="ai-act-mapping" title="AI Act mapping">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            ECEF compliance signals map to specific areas of the EU AI Act. The scanner detects
            evidence for these areas — classification and legal interpretation remain with the human
            reviewer.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                  <th className="py-2 pr-4 font-medium text-slate-900 dark:text-white">
                    Compliance area
                  </th>
                  <th className="py-2 pr-4 font-medium text-slate-900 dark:text-white">
                    AI Act reference
                  </th>
                  <th className="py-2 font-medium text-slate-900 dark:text-white">ECEF field</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 dark:text-slate-300">
                {AI_ACT_MAPPINGS.map(([area, article, field]) => (
                  <tr key={field} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-4">{area}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{article}</td>
                    <td className="py-2">
                      <Code>{`complianceSignals.${field}`}</Code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="report-v1" title="Report v1">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            The report is the primary compliance evidence document. It captures what the scanner
            found across seven compliance areas, including assessment hints, gaps, and
            recommendations.
          </p>
          <h3 className="font-medium text-slate-900 dark:text-white mb-2">Required fields</h3>
          <FieldTable fields={REPORT_FIELDS} />
          <SchemaFooter
            schemaFile="report-v1.schema.json"
            examplePath={`${EXAMPLES_BASE}/web-app/euconform.report.json`}
          />
        </Section>

        <Section id="aibom-v1" title="AI BOM v1">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            The AI Bill of Materials is the inventory layer — a structured list of AI-relevant
            components in the scanned project, plus detected compliance capabilities.
          </p>
          <h3 className="font-medium text-slate-900 dark:text-white mb-2">Required fields</h3>
          <FieldTable fields={AIBOM_FIELDS} />
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            Component IDs follow the pattern <Code>kind:kebab-name</Code>, e.g.{" "}
            <Code>inference-provider:openai</Code>, <Code>runtime:node-js</Code>.
          </p>
          <SchemaFooter
            schemaFile="aibom-v1.schema.json"
            examplePath={`${EXAMPLES_BASE}/rag/euconform.aibom.json`}
          />
        </Section>

        <Section id="ci-v1" title="CI v1">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            The CI document is the enforcement layer — a compact summary for pipeline gates and
            dashboards. It captures pass/fail status, gap counts, and the top findings.
          </p>
          <h3 className="font-medium text-slate-900 dark:text-white mb-2">Required fields</h3>
          <FieldTable fields={CI_FIELDS} />
          <SchemaFooter
            schemaFile="ci-v1.schema.json"
            examplePath={`${EXAMPLES_BASE}/web-app/euconform.ci.json`}
          />
        </Section>

        <Section id="schemas" title="Schemas">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            All Stage 1 schemas use JSON Schema Draft 2020-12 with{" "}
            <Code>additionalProperties: false</Code> for strict validation.
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <ExtLink href={`${SCHEMA_BASE}/report-v1.schema.json`}>report-v1.schema.json</ExtLink>
            </li>
            <li>
              <ExtLink href={`${SCHEMA_BASE}/aibom-v1.schema.json`}>aibom-v1.schema.json</ExtLink>
            </li>
            <li>
              <ExtLink href={`${SCHEMA_BASE}/ci-v1.schema.json`}>ci-v1.schema.json</ExtLink>
            </li>
          </ul>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
            Canonical URLs:{" "}
            <Code>https://euconform.dev/schemas/ecef/&#123;type&#125;-v1.schema.json</Code>
          </p>
        </Section>

        <Section id="examples" title="Examples">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Four example scenarios demonstrate ECEF across different project types:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXAMPLE_SCENARIOS.map((ex) => (
              <div
                key={ex.dir}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">{ex.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{ex.desc}</p>
                <p className="text-xs space-x-2">
                  <ExtLink href={`${EXAMPLES_BASE}/${ex.dir}/euconform.report.json`}>
                    report
                  </ExtLink>
                  <ExtLink href={`${EXAMPLES_BASE}/${ex.dir}/euconform.aibom.json`}>aibom</ExtLink>
                  <ExtLink href={`${EXAMPLES_BASE}/${ex.dir}/euconform.ci.json`}>ci</ExtLink>
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="validation" title="Validation">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Validate any ECEF document against the published schemas using{" "}
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
  // https://euconform.dev/schemas/ecef/report-v1.schema.json
);

const report = JSON.parse(
  readFileSync(".euconform/euconform.report.json", "utf8")
);

const valid = ajv.validate(schema, report);
if (!valid) console.error(ajv.errors);
else console.log("Valid ECEF report.");`}</Pre>
        </Section>

        <Section id="generate" title="Generate with CLI">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            The EuConform CLI scans a codebase and writes ECEF artifacts to <Code>.euconform/</Code>
            :
          </p>
          <Pre>{`npx euconform scan .

# Output:
#   .euconform/euconform.report.json
#   .euconform/euconform.aibom.json
#   .euconform/euconform.summary.md

# With CI gate:
npx euconform scan . --ci github --fail-on high

# Additional output:
#   .euconform/euconform.ci.json
#   .euconform/euconform.ci-summary.md`}</Pre>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
            See the full{" "}
            <ExtLink href={`${GITHUB_BASE}#cli--ci-integration`}>CLI documentation</ExtLink> for all
            options.
          </p>
        </Section>

        <Section id="viewer" title="View in Web App">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            The EuConform web app includes a Scan Viewer that imports ECEF artifacts directly in the
            browser — no upload, no server, fully client-side.
          </p>
          <ol className="list-decimal pl-6 space-y-1 text-slate-600 dark:text-slate-300 text-sm">
            <li>
              Open the web app and select <strong>Import Scan</strong>
            </li>
            <li>
              Drop your <Code>.euconform/</Code> files (report is required, aibom/ci/summary are
              optional)
            </li>
            <li>The viewer displays compliance signals, gaps, AI BOM, and CI status</li>
          </ol>
        </Section>

        <Section id="versioning" title="Versioning and compatibility">
          <ul className="list-disc pl-6 space-y-1 text-slate-600 dark:text-slate-300 text-sm">
            <li>
              <Code>schemaVersion</Code> is the compatibility boundary for every document
            </li>
            <li>
              Schemas enforce <Code>additionalProperties: false</Code> — all fields must be
              explicitly defined
            </li>
            <li>Patch releases do not change document shape</li>
            <li>
              Adding optional fields requires a new schema revision (e.g.{" "}
              <Code>report-v1.1.schema.json</Code>)
            </li>
            <li>
              Breaking changes use a new <Code>schemaVersion</Code> (e.g.{" "}
              <Code>euconform.report.v2</Code>)
            </li>
          </ul>
        </Section>

        <Section id="scope" title="Scope and limitations">
          <p className="text-slate-600 dark:text-slate-300 mb-3">
            ECEF Stage 1 is intentionally focused. The following are <strong>not</strong> part of
            the current specification:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-slate-600 dark:text-slate-300 text-sm">
            <li>
              <Code>euconform.bundle.v1</Code> — manifest document for artifact sets (planned for
              Stage 2)
            </li>
            <li>
              <Code>euconform.eval.v1</Code> — evaluation results and benchmarks (reserved, not yet
              specified)
            </li>
            <li>Full prompt histories or training data disclosure</li>
            <li>Legally binding classification or certification</li>
            <li>A separate npm consumer package (use the schemas directly)</li>
          </ul>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            ECEF produces <strong>evidence for human review</strong>, not automated legal verdicts.
            Compliance classification requires human judgment informed by organizational context.
          </p>
        </Section>

        <footer className="pt-8 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 space-y-2">
          <p>
            <ExtLink href={GITHUB_BASE}>GitHub</ExtLink>
            {" · "}
            <ExtLink href={`${GITHUB_BASE}/tree/main/docs/ecef`}>Source of truth</ExtLink>
            {" · "}
            <Link href="/" className="underline">
              EuConform docs
            </Link>
          </p>
          <p>
            EuConform is dual-licensed under{" "}
            <ExtLink href={`${GITHUB_BASE}/blob/main/LICENSE`}>MIT</ExtLink> and{" "}
            <ExtLink href={`${GITHUB_BASE}/blob/main/LICENSE-EUPL`}>EUPL-1.2</ExtLink>
          </p>
        </footer>
      </div>
    </main>
  );
}
