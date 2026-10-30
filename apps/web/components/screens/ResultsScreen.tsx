"use client";

import {
  AI_ACT_SOURCES,
  type GPAIComplianceResult,
  type RiskAssessment,
  generateAnnexIIIGapAnalysis,
  generateGPAIGapAnalysis,
  getComplianceGuidance,
} from "@euconform/core";
import { AlertTriangle, CheckCircle2, Download, FileCheck } from "lucide-react";
import { useMemo } from "react";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import type { UserRole } from "../../lib/types/wizard";
import { DeadlineTimeline, RiskBadge } from "../shared";
import { GapAnalysisSection } from "./GapAnalysisSection";
import { GpaiResultsSection } from "./GpaiResultsSection";

/**
 * Props for the ResultsScreen component
 */
export interface ResultsScreenProps {
  /** Risk assessment result (Annex III path) */
  assessment: RiskAssessment | null;
  /** GPAI compliance result (GPAI provider path) */
  gpaiAssessment?: GPAIComplianceResult | null;
  /** User role to determine which results to show */
  userRole?: UserRole;
  /** Selected model identifier */
  selectedModel: string;
  /** Whether PDF generation is in progress */
  isGeneratingPdf: boolean;
  /** Handler for generating PDF report */
  onGeneratePdf: () => void;
  /** Handler for downloading Annex IV JSON */
  onDownloadJson: () => void;
  /** Handler for resetting the wizard */
  onReset: () => void;
}

/**
 * ResultsScreen displays the compliance assessment results including risk
 * classification, bias test results, recommendations, and export actions.
 */
export function ResultsScreen({
  assessment,
  gpaiAssessment,
  userRole,
  selectedModel,
  isGeneratingPdf,
  onGeneratePdf,
  onDownloadJson,
  onReset,
}: ResultsScreenProps) {
  const { t } = useLanguage();
  const isGpaiPath = userRole === "gpai-provider";
  const guidance = !isGpaiPath && assessment ? getComplianceGuidance(assessment) : [];
  const gapAnalysis = useMemo(
    () =>
      gpaiAssessment
        ? generateGPAIGapAnalysis(gpaiAssessment)
        : assessment
          ? generateAnnexIIIGapAnalysis(assessment)
          : null,
    [gpaiAssessment, assessment]
  );

  return (
    <main className="min-h-screen py-16 px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 border border-border dark:border-border-dark rounded-full text-xs font-medium tracking-wide text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-3 h-3 gold-accent" />
            {t("analysis_complete")}
          </div>
          <h1 className="font-serif text-4xl font-bold text-slate-deep dark:text-paper mb-3">
            {t("compliance_assessment_title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedModel || t("annex_iv_unspecified_system")}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-gold mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-deep dark:text-paper mb-1">
                {t("no_legal_advice_title")}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t("disclaimer_non_legal_advice")}
              </p>
            </div>
          </div>
        </div>

        {/* GPAI Compliance Checklist (GPAI path) */}
        {isGpaiPath && gpaiAssessment ? (
          <div className="mb-6">
            <GpaiResultsSection gpaiAssessment={gpaiAssessment} selectedModel={selectedModel} />
          </div>
        ) : (
          assessment && (
            <>
              {/* Risk Score */}
              <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-8 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper">
                    {t("risk_classification_title")}
                  </h2>
                  <RiskBadge level={assessment.level} />
                </div>
                <div className="text-center">
                  <p className="text-5xl font-serif font-bold text-slate-deep dark:text-paper mb-2">
                    {assessment.score}
                    <span className="text-2xl text-slate-400">/100</span>
                  </p>
                  <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-4">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        assessment.level === "minimal" ? "gold-bg" : "bg-slate-400"
                      }`}
                      style={{ width: `${assessment.score}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Guidance */}
              <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-8 mb-6">
                <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper mb-6">
                  {t("recommendations_title")}
                </h2>
                <ul className="space-y-3">
                  {guidance.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="text-gold">•</span>
                      <span>{item.slice(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )
        )}

        {/* Gap Analysis (both paths) */}
        {gapAnalysis && (
          <div className="mb-6">
            <GapAnalysisSection result={gapAnalysis} />
          </div>
        )}

        <DeadlineTimeline
          riskLevel={assessment?.level ?? "minimal"}
          audiences={isGpaiPath ? ["all", "gpai"] : undefined}
          showOmnibus
        />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-slate-deep dark:border-paper text-slate-deep dark:text-paper font-medium hover:bg-slate-deep hover:text-paper dark:hover:bg-paper dark:hover:text-slate-deep transition-all disabled:opacity-30"
          >
            <Download className="w-5 h-5" />
            {isGeneratingPdf ? t("generating") : t("results_download_pdf")}
          </button>
          <button
            type="button"
            onClick={onDownloadJson}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-border dark:border-border-dark text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <FileCheck className="w-5 h-5" />
            {t("results_download_json")}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-border dark:border-border-dark text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            {t("results_new_test")}
          </button>
        </div>

        <div className="mt-10 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-600 dark:text-slate-300 mb-2">
            {t("sources_title")}
          </p>
          <ul className="space-y-1">
            {AI_ACT_SOURCES.map((s) => (
              <li key={s.label}>
                <span className="font-semibold">{s.label}:</span> {s.reference}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
