"use client";

import type { QuizAnswer } from "@euconform/core";
import { Play, Shield } from "lucide-react";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { BackgroundElements, PageHeader } from "../shared";

/**
 * Props for the QuizScreen component
 */
export interface QuizScreenProps {
  /** Current question index (0-based) */
  currentQuestion: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Array of user answers */
  answers: QuizAnswer[];
  /** Selected model identifier */
  selectedModel: string;
  /** Handler for answer submission */
  onAnswer: (value: string) => void;
  /** Handler for navigating back to model selection */
  onBack: () => void;
  /** Handler for navigating to previous question */
  onNavigateBack: () => void;
}

/**
 * QuizScreen displays the Annex III risk assessment questionnaire with
 * progress indicator, question display, and Yes/No answer buttons.
 */
export function QuizScreen({
  currentQuestion,
  totalQuestions,
  answers,
  selectedModel,
  onAnswer,
  onBack,
  onNavigateBack,
}: QuizScreenProps) {
  const { t } = useLanguage();

  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const fullQuestionText = t(`quiz_q${currentQuestion + 1}`);
  const splitAt = fullQuestionText.includes("?")
    ? "?"
    : fullQuestionText.includes(".")
      ? "."
      : null;
  const titleText = splitAt
    ? `${fullQuestionText.split(splitAt)[0]}${splitAt}`.trim()
    : fullQuestionText.trim();
  const descriptionText = splitAt
    ? fullQuestionText.slice(fullQuestionText.indexOf(splitAt) + 1).trim()
    : "";

  // Find selected value for current question
  const questionId = `q${currentQuestion + 1}`;
  const selectedValue = answers.find((a) => a.questionId === questionId)?.value;

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Subtle premium background */}
      <BackgroundElements variant="quiz" />

      {/* Header (consistent with intro) */}
      <PageHeader />

      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl">
          {/* Context row */}
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border-dark bg-white/60 dark:bg-slate-medium/60 backdrop-blur-sm text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300">
                <Shield className="w-3 h-3" />
                ANNEX III • EU AI ACT
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[32ch]">
                {selectedModel || t("pdf_not_specified")}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentQuestion + 1} / {totalQuestions}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {Math.round(progress)}%
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-8 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full gold-bg transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Back button (like model select step, directly above card) */}
          <button
            type="button"
            onClick={onBack}
            className="mb-6 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            ← {t("back")}
          </button>

          {/* Glass panel */}
          <div className="border border-border dark:border-border-dark rounded-2xl bg-white/70 dark:bg-slate-medium/60 backdrop-blur-xl shadow-[0_20px_70px_-35px_rgba(0,0,0,0.35)] p-8 sm:p-10">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-deep dark:text-paper leading-snug">
                  {titleText}
                </h2>
                {descriptionText && (
                  <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 max-w-[70ch]">
                    {descriptionText}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => onAnswer("yes")}
                className={`group w-full text-left p-5 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-gold/40 ${
                  selectedValue === "yes"
                    ? "border-gold bg-gold/10 shadow-[0_12px_40px_-28px_rgba(191,155,48,0.8)]"
                    : "border-border dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-900/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                        selectedValue === "yes"
                          ? "border-gold bg-gold/15"
                          : "border-border dark:border-border-dark"
                      }`}
                    >
                      <Play
                        className={`w-4 h-4 ${selectedValue === "yes" ? "text-gold" : "text-slate-500 dark:text-slate-300"}`}
                      />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {t("quiz_yes")}
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onAnswer("no")}
                className={`group w-full text-left p-5 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-gold/30 ${
                  selectedValue === "no"
                    ? "border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-900/30"
                    : "border-border dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-900/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                        selectedValue === "no"
                          ? "border-slate-400 dark:border-slate-500 bg-white/60 dark:bg-slate-900/30"
                          : "border-border dark:border-border-dark"
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${selectedValue === "no" ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-300"}`}
                      >
                        ×
                      </span>
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {t("quiz_no")}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onNavigateBack}
                disabled={currentQuestion === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border dark:border-border-dark text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← {t("back")}
              </button>

              <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                {t("no_legal_advice_title")}: <span className="font-medium">{t("disclaimer")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
