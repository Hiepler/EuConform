"use client";

import type { QuizAnswer } from "@euconform/core";
import { GPAI_QUESTIONS } from "@euconform/core";
import { Bot } from "lucide-react";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import type { Dictionary } from "../../lib/i18n/dictionaries";
import { splitQuestionText } from "../../lib/utils/question-text";
import { BackgroundElements, PageHeader } from "../shared";

const ANSWER_OPTIONS: Array<{
  value: "yes" | "unsure" | "no";
  icon: string;
  selectedBorder: string;
  hoverBorder: string;
  focusRing: string;
  selectedIconBg: string;
  defaultIconBg: string;
  labelKey: keyof Dictionary;
}> = [
  {
    value: "yes",
    icon: "✓",
    selectedBorder: "border-green-500 bg-green-50 dark:bg-green-900/20",
    hoverBorder: "hover:border-green-400 dark:hover:border-green-600",
    focusRing: "focus:ring-green-400/40",
    selectedIconBg: "bg-green-500 text-white",
    defaultIconBg: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    labelKey: "gpai_yes",
  },
  {
    value: "unsure",
    icon: "~",
    selectedBorder: "border-amber-500 bg-amber-50 dark:bg-amber-900/20",
    hoverBorder: "hover:border-amber-400 dark:hover:border-amber-600",
    focusRing: "focus:ring-amber-400/40",
    selectedIconBg: "bg-amber-500 text-white",
    defaultIconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    labelKey: "gpai_unsure",
  },
  {
    value: "no",
    icon: "✗",
    selectedBorder: "border-red-500 bg-red-50 dark:bg-red-900/20",
    hoverBorder: "hover:border-red-400 dark:hover:border-red-600",
    focusRing: "focus:ring-red-400/40",
    selectedIconBg: "bg-red-500 text-white",
    defaultIconBg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    labelKey: "gpai_no",
  },
];

/**
 * Props for the GpaiQuizScreen component
 */
export interface GpaiQuizScreenProps {
  /** Current question index (0-based) */
  currentQuestion: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Array of user answers */
  answers: QuizAnswer[];
  /** Handler for answer submission */
  onAnswer: (value: string) => void;
  /** Handler for navigating back to model-select */
  onBack: () => void;
  /** Handler for navigating to previous question */
  onNavigateBack: () => void;
}

/**
 * GpaiQuizScreen displays the Art. 53–55 GPAI compliance questionnaire.
 * Separate from QuizScreen because GPAI has different labels, badge, and back navigation.
 */
export function GpaiQuizScreen({
  currentQuestion,
  totalQuestions,
  answers,
  onAnswer,
  onBack,
  onNavigateBack,
}: GpaiQuizScreenProps) {
  const { t } = useLanguage();

  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const fullQuestionText = t(`gpai_q${currentQuestion + 1}` as Parameters<typeof t>[0]);
  const { title: titleText, description: descriptionText } = splitQuestionText(fullQuestionText);

  const questionId = GPAI_QUESTIONS[currentQuestion]?.id ?? `gpai-q${currentQuestion + 1}`;
  const selectedValue = answers.find((a) => a.questionId === questionId)?.value;

  return (
    <main className="min-h-screen relative overflow-hidden">
      <BackgroundElements variant="quiz" />
      <PageHeader />

      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl">
          {/* Context row */}
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border dark:border-border-dark bg-white/60 dark:bg-slate-medium/60 backdrop-blur-sm text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300">
                <Bot className="w-3 h-3" />
                {t("gpai_badge")}
              </div>
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

          {/* Back button */}
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

            {/* Three answer buttons: yes / unsure / no */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ANSWER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onAnswer(opt.value)}
                  className={`group w-full text-left p-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 ${opt.focusRing} ${
                    selectedValue === opt.value
                      ? opt.selectedBorder
                      : `border-border dark:border-border-dark ${opt.hoverBorder} bg-white/50 dark:bg-slate-900/20`
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold ${
                        selectedValue === opt.value ? opt.selectedIconBg : opt.defaultIconBg
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {t(opt.labelKey)}
                    </div>
                  </div>
                </button>
              ))}
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
