"use client";

import { ArrowRight, Bot, FileText, Github, Scale, Shield } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import type { WizardStep } from "../../lib/types/wizard";
import { BackgroundElements, PageHeader } from "../shared";

/**
 * Props for the IntroScreen component
 */
export interface IntroScreenProps {
  /** Handler for navigating to a wizard step (scan viewer) */
  setStep: (step: WizardStep) => void;
  /** Start the classification questionnaire */
  onStart: () => void;
  /** Start the GPAI provider questionnaire */
  onSelectGpaiRole: () => void;
  /** Optional system/model identifier for the Annex IV report */
  selectedModel: string;
  /** Update the system/model identifier */
  onModelChange: (value: string) => void;
}

/**
 * IntroScreen displays the landing page with hero section, engine selection,
 * and CTA to start the EU AI Act compliance assessment.
 */
export function IntroScreen({
  setStep,
  onStart,
  onSelectGpaiRole,
  selectedModel,
  onModelChange,
}: IntroScreenProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen flex items-center justify-center relative">
      {/* Subtle EU Stars Background */}
      <BackgroundElements variant="intro" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <PageHeader />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        {/* Institutional Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 border border-border dark:border-border-dark rounded-full text-xs font-medium tracking-wide text-slate-600 dark:text-slate-400">
          <Shield className="w-3 h-3" />
          {t("eu_ai_act_compliance")}
        </div>

        {/* Serif Headline */}
        <h1 className="font-serif text-5xl sm:text-7xl font-bold text-slate-deep dark:text-paper mb-6 tracking-tight">
          {t("title")}
        </h1>

        <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-4 font-light">
          {t("subtitle")}
        </p>

        <p className="text-base text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          {t("intro_desc")}
        </p>

        {/* System identifier (metadata for the Annex IV report) */}
        <div className="mb-8 max-w-md mx-auto text-left">
          <label
            htmlFor="system-name"
            className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2"
          >
            {t("system_name_label")}
          </label>
          <input
            id="system-name"
            type="text"
            value={selectedModel}
            onChange={(event) => onModelChange(event.target.value)}
            placeholder={t("system_name_placeholder")}
            className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-white/70 dark:bg-slate-medium/50 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            {t("system_name_hint")}
          </p>
        </div>

        {/* Single CTA */}
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-deep dark:border-paper text-slate-deep dark:text-paper font-medium rounded-lg hover:bg-slate-deep hover:text-paper dark:hover:bg-paper dark:hover:text-slate-deep transition-all duration-300"
        >
          {t("intro_start")}
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* GPAI Provider Card */}
        <div className="mt-8 pt-6 border-t border-border dark:border-border-dark">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t("gpai_intro_question")}
          </p>
          <button
            type="button"
            onClick={onSelectGpaiRole}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border dark:border-border-dark text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-all"
          >
            <Bot className="w-4 h-4" />
            {t("gpai_intro_cta")}
          </button>
        </div>

        {/* Scan Viewer + Bias Evidence CTAs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setStep("scan-viewer")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border dark:border-border-dark text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-all"
          >
            <FileText className="w-4 h-4" />
            {t("scan_viewer_cta")}
          </button>
          <Link
            href="/bias"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border dark:border-border-dark text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-all"
          >
            <Scale className="w-4 h-4" />
            {t("bias_evidence_cta")}
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-8 border-t border-border dark:border-border-dark">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/Hiepler/EuConform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <Github className="w-4 h-4" />
                {t("github_link")}
              </a>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {t("privacy_first_note")}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
