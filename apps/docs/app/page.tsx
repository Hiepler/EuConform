import Link from "next/link";

const CARD_CLASS =
  "flex flex-col gap-2 p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-colors";

const ENTRIES = [
  {
    title: "Web App",
    description: "Guided compliance wizard with risk classification and gap analysis",
    href: "https://github.com/Hiepler/EuConform#web-app",
    external: true,
  },
  {
    title: "CLI / CI",
    description: "Scan any codebase from the terminal or integrate into GitHub Actions",
    href: "https://github.com/Hiepler/EuConform#cli--ci-integration",
    external: true,
  },
  {
    title: "ECEF Specification",
    description: "Open specification for offline AI Act evidence exchange",
    href: "/ecef",
    external: false,
  },
] as const;

export default function Page() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl w-full space-y-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">EuConform</h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Offline-first AI Act evidence engine
          </p>
          <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Open-source scanner, CLI, and web viewer that produces structured, versionable
            compliance evidence for the EU AI Act.
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

        <footer className="text-center text-sm text-slate-500 dark:text-slate-500">
          <p>
            Dual-licensed under{" "}
            <a
              href="https://github.com/Hiepler/EuConform/blob/main/LICENSE"
              className="underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              MIT
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/Hiepler/EuConform/blob/main/LICENSE-EUPL"
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
