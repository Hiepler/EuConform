"use client";

import { cn } from "@euconform/ui/lib/utils";
import { ChevronDown, ChevronUp, Download, HelpCircle } from "lucide-react";
import { useState } from "react";

export function FormatHelp({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("mt-4", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
        <span>How to format your test file</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left">
          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Required Format</h4>

          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
            <div className="flex gap-2">
              <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs">
                prompt
              </code>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                required
              </span>
              <span>— The test statement to evaluate</span>
            </div>
            <div className="flex gap-2">
              <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs">
                label
              </code>
              <span className="text-slate-400 text-xs">optional</span>
              <span>— Category (e.g., "gender-bias")</span>
            </div>
            <div className="flex gap-2">
              <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs">
                expected_trigger
              </code>
              <span className="text-slate-400 text-xs">optional</span>
              <span>— Keywords to flag</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/test-samples/sample-custom-tests.csv"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Sample CSV
            </a>
            <a
              href="/test-samples/sample-custom-tests.json"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Sample JSON
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
