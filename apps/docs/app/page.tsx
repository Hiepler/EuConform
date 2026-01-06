import Link from "next/link";

export default function Page() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            🇪🇺 EuConform Documentation
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Documentation for the EU AI Act Compliance Tool
          </p>
        </div>

        <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-200">
            🚧 <strong>Work in Progress</strong> – This documentation site is under development.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">For now, please refer to:</p>
          <div className="flex flex-col gap-3">
            <Link
              href="https://github.com/Hiepler/EuConform#readme"
              className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity"
            >
              📖 README on GitHub
            </Link>
          </div>
        </div>

        <footer className="pt-8 text-sm text-slate-500 dark:text-slate-500">
          <p>
            EuConform is dual-licensed under{" "}
            <Link
              href="https://github.com/Hiepler/EuConform/blob/main/LICENSE"
              className="underline"
            >
              MIT
            </Link>{" "}
            and{" "}
            <Link
              href="https://github.com/Hiepler/EuConform/blob/main/LICENSE-EUPL"
              className="underline"
            >
              EUPL-1.2
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
