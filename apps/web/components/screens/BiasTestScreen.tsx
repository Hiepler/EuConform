"use client";

import { Info, Scale } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { BackgroundElements } from "../shared";

/**
 * Props for the BiasTestScreen component
 */
export interface BiasTestScreenProps {
  /** Skip the optional bias evidence step and continue to results */
  onSkip: () => void;
}

/**
 * BiasTestScreen is the optional evidence step between the questionnaire and the
 * results. Bias measurement runs in the CLI (it needs a local model and a real
 * sentence log-probability engine); the web app imports the resulting artifact
 * and validates it locally. This screen therefore points at the evidence viewer
 * instead of pretending to measure in the browser.
 */
export function BiasTestScreen({ onSkip }: BiasTestScreenProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <BackgroundElements variant="minimal" />

      <div className="w-full max-w-xl relative z-10">
        <div className="border border-border dark:border-border-dark rounded-2xl bg-white/70 dark:bg-slate-medium/60 backdrop-blur-xl shadow-[0_20px_70px_-35px_rgba(0,0,0,0.1)] p-10 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-gold/20 bg-gold/5 mb-6">
              <Scale className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-serif text-3xl font-bold text-slate-deep dark:text-paper mb-4">
              {t("bias_test_title")}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
              {t("bias_test_description")}
            </p>
          </div>

          <div className="space-y-4 max-w-xs mx-auto">
            <Link
              href="/bias"
              className="group w-full relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-slate-deep dark:bg-paper text-paper dark:text-slate-deep font-bold hover:shadow-lg hover:shadow-slate-900/20 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Scale className="w-5 h-5" />
              {t("bias_evidence_cta")}
            </Link>
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {t("skip")}
            </button>
          </div>

          <p className="mt-6 flex items-start gap-2 text-left text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            {t("bias_web_notice")}
          </p>
        </div>
      </div>
    </main>
  );
}
