import Link from "next/link";

const CARD_CLASS =
  "flex flex-col gap-2 p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-colors";

const GITHUB_BASE = "https://github.com/Hiepler/EuConform";

const ENTRIES = [
  {
    title: "Web App",
    description: "Guided compliance wizard with risk classification and gap analysis",
    href: `${GITHUB_BASE}#-quick-start`,
    external: true,
  },
  {
    title: "CLI / CI",
    description: "Scan any codebase from the terminal or integrate into GitHub Actions",
    href: `${GITHUB_BASE}#cli-scanner`,
    external: true,
  },
  {
    title: "ECEF Specification",
    description: "Open specification for offline AI Act evidence exchange",
    href: "/ecef",
    external: false,
  },
] as const;

const REFERENCE_PROJECTS = [
  {
    title: "Ollama Chatbot",
    description: "Local inference, AI disclosure, audit logging, and report export.",
    sourceHref: `${GITHUB_BASE}/tree/main/examples/ollama-chatbot`,
    artifactHref: "/schemas/ecef/examples/local-ollama/euconform.bundle.json",
  },
  {
    title: "RAG Assistant",
    description:
      "LangChain-style retrieval, ChromaDB, local Ollama inference, and verify-ready bundles.",
    sourceHref: `${GITHUB_BASE}/tree/main/examples/rag-assistant`,
    artifactHref: "/schemas/ecef/examples/rag/euconform.bundle.json",
  },
] as const;

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
      {children}
    </code>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen p-8 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto w-full space-y-12">
        <header className="text-center space-y-4 pt-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">EuConform</h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Offline-first AI Act evidence engine
          </p>
          <p className="text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Open-source scanner, CLI, and web viewer that produces structured, versionable
            compliance evidence for the EU AI Act. ECEF is the open specification behind those
            artifacts.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {ENTRIES.map((entry) =>
            entry.external ? (
              <a
                key={entry.title}
                href={entry.href}
                target="_blank"
                rel="noreferrer noopener"
                className={CARD_CLASS}
              >
                <span className="font-semibold text-slate-900 dark:text-white">{entry.title}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {entry.description}
                </span>
              </a>
            ) : (
              <Link key={entry.title} href={entry.href} className={CARD_CLASS}>
                <span className="font-semibold text-slate-900 dark:text-white">{entry.title}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {entry.description}
                </span>
              </Link>
            )
          )}
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Try ECEF in 10 minutes
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The fastest builder path today is: clone the repo, build the CLI, scan a reference
              project, verify the bundle, then import the artifacts in the web viewer.
            </p>
            <pre className="p-4 bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-lg text-sm overflow-x-auto font-mono leading-relaxed">{`pnpm install
pnpm --filter @euconform/cli build

node packages/cli/dist/index.js scan examples/ollama-chatbot \\
  --scope production \\
  --output /tmp/ecef-ollama

node packages/cli/dist/index.js verify \\
  /tmp/ecef-ollama/euconform.bundle.json

# Then start the web app and import the generated files
pnpm dev`}</pre>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The same flow works with <Code>examples/rag-assistant</Code>.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Why builders use it
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Scan real codebases instead of filling only questionnaires.</li>
              <li>Produce machine-readable evidence that can be versioned and reviewed.</li>
              <li>Verify bundles before handing them to CI, auditors, or collaborators.</li>
              <li>Inspect the same artifacts visually in the browser without any upload.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Reference projects
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              These two repos are the fastest way to evaluate the current ECEF workflow end to end.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {REFERENCE_PROJECTS.map((project) => (
              <div
                key={project.title}
                className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white">{project.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a
                    href={project.sourceHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline text-blue-600 dark:text-blue-400"
                  >
                    View source project
                  </a>
                  <a
                    href={project.artifactHref}
                    className="underline text-blue-600 dark:text-blue-400"
                  >
                    View canonical bundle
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            What ECEF includes today
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stable Stage 1 documents plus the Stage 2 bundle manifest:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <Code>euconform.report.v1</Code> for compliance evidence, gaps, and open questions
            </li>
            <li>
              <Code>euconform.aibom.v1</Code> for the AI inventory layer
            </li>
            <li>
              <Code>euconform.ci.v1</Code> for CI gates and top findings
            </li>
            <li>
              <Code>euconform.bundle.v1</Code> for integrity-aware transport and verification
            </li>
          </ul>
        </section>

        <footer className="text-center text-sm text-slate-500 dark:text-slate-500">
          <p>
            Dual-licensed under{" "}
            <a
              href={`${GITHUB_BASE}/blob/main/LICENSE`}
              className="underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              MIT
            </a>{" "}
            and{" "}
            <a
              href={`${GITHUB_BASE}/blob/main/LICENSE-EUPL`}
              className="underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              EUPL-1.2
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
