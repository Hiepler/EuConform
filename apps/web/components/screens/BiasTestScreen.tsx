"use client";

import { AlertTriangle, Loader2, Scale } from "lucide-react";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import type { ModelLoadingStatus } from "../../lib/types/wizard";
import { BackgroundElements } from "../shared";

/**
 * Props for the BiasTestScreen component
 */
export interface BiasTestScreenProps {
  /** Whether bias test is currently running */
  isRunning: boolean;
  /** Bias test progress percentage (0-100) */
  progress: number;
  /** Current step description during bias test */
  currentStep: string;
  /** Model loading status */
  modelLoadingStatus: ModelLoadingStatus;
  /** Error message if any */
  error: string | null;
  /** Selected model identifier */
  selectedModel: string;
  /** Handler for running the bias test */
  onRunTest: () => void;
  /** Handler for skipping the bias test */
  onSkip: () => void;
}

/**
 * BiasTestScreen displays the bias test interface with progress visualization,
 * error handling, and skip option.
 */
export function BiasTestScreen({
  isRunning,
  progress,
  currentStep,
  modelLoadingStatus,
  error,
  selectedModel,
  onRunTest,
  onSkip,
}: BiasTestScreenProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
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

          {error && (
            <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-left flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">
                  {t("bias_error_title")}
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
                {error.includes("not found") && (
                  <div className="mt-3">
                    <p className="text-xs font-mono bg-white/50 dark:bg-black/20 p-2 rounded border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300">
                      ollama pull {selectedModel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isRunning ? (
            <div className="py-4">
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-gold border-t-transparent animate-spin" />
                </div>
                <div className="flex flex-col items-center justify-center h-24">
                  <span className="text-2xl font-bold text-slate-700 dark:text-slate-200 font-mono">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              <div className="text-center mb-8 space-y-2">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white animate-pulse">
                  {currentStep || t("bias_analyzing")}
                </h3>
                {progress > 0 && progress < 100 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                    {t("bias_progress_detail", {
                      current: Math.round((progress / 100) * 20),
                      total: 20,
                    })}
                  </p>
                )}
              </div>

              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
                <div
                  className="h-full bg-gradient-to-r from-gold/80 to-gold transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : modelLoadingStatus === "loading" ? (
            <div className="py-8">
              <div className="mb-6">
                <Loader2 className="w-12 h-12 mx-auto text-gold animate-spin" />
              </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200 animate-pulse">
                {t("model_loading")}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-xs mx-auto">
              <button
                type="button"
                onClick={onRunTest}
                className="group w-full relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-slate-deep dark:bg-paper text-paper dark:text-slate-deep font-bold hover:shadow-lg hover:shadow-slate-900/20 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Scale className="w-5 h-5" />
                {t("bias_start_test")}
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                {t("skip")}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
