"use client";

import {
  AI_ACT_SOURCES,
  type CrowsPairsLogProbResult,
  type ModelCapability,
  type RiskAssessment,
  getComplianceGuidance,
} from "@euconform/core";
import { AlertTriangle, CheckCircle2, Download, FileCheck } from "lucide-react";
import {
  mapEngineToInferenceEngine,
  mapMethodologyToBiasMethod,
} from "../../lib/bias-method-utils";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { MethodStatusIndicator } from "../MethodStatusIndicator";
import { RiskBadge } from "../shared";

/**
 * Props for the ResultsScreen component
 */
export interface ResultsScreenProps {
  /** Risk assessment result */
  assessment: RiskAssessment;
  /** Bias test result (optional) */
  biasResult: CrowsPairsLogProbResult | null;
  /** Selected model identifier */
  selectedModel: string;
  /** Full capability information for the selected model */
  selectedCapability: ModelCapability | null;
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
  biasResult,
  selectedModel,
  selectedCapability,
  isGeneratingPdf,
  onGeneratePdf,
  onDownloadJson,
  onReset,
}: ResultsScreenProps) {
  const { t } = useLanguage();
  const guidance = getComplianceGuidance(assessment);

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
          <p className="text-sm text-slate-500 dark:text-slate-400">{selectedModel}</p>
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

        {/* Bias Results */}
        {biasResult && (
          <BiasResultsSection biasResult={biasResult} selectedCapability={selectedCapability} />
        )}

        {/* Guidance */}
        <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-8 mb-8">
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

/**
 * Props for the BiasResultsSection component
 */
interface BiasResultsSectionProps {
  /** Bias test result */
  biasResult: CrowsPairsLogProbResult;
  /** Full capability information for the selected model */
  selectedCapability: ModelCapability | null;
}

/**
 * BiasResultsSection displays the bias test results including methodology,
 * overall score, category breakdown, and disclaimers.
 */
function BiasResultsSection({ biasResult, selectedCapability }: BiasResultsSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-8 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper">
          {t("bias_fairness_title")}
        </h2>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              biasResult.overall.passed
                ? "gold-bg text-white"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {biasResult.overall.passed ? `✓ ${t("passed")}` : `✗ ${t("failed")}`}
          </span>
        </div>
      </div>

      {/* Calculation Method Indicator */}
      <div className="mb-6">
        <MethodStatusIndicator
          method={mapMethodologyToBiasMethod(biasResult.methodology)}
          engine={mapEngineToInferenceEngine(biasResult.engine)}
          model={biasResult.modelId}
        />

        {/* Capability Information and Consistency Check */}
        {selectedCapability && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("selected_model_capability")}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedCapability.modelId} ({selectedCapability.engine})
                  </span>
                  {selectedCapability.method && (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedCapability.method === "logprobs_exact"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                      }`}
                    >
                      {selectedCapability.method === "logprobs_exact" ? "Exact" : "Fallback"}
                    </span>
                  )}
                </div>
              </div>

              {/* Consistency Check */}
              {(() => {
                const actualMethod = mapMethodologyToBiasMethod(biasResult.methodology);
                const expectedMethod = selectedCapability.method;
                const isConsistent = actualMethod === expectedMethod;

                return (
                  <div
                    className={`flex items-center gap-2 ${
                      isConsistent
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {isConsistent ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">{t("method_consistent")}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">{t("method_fallback_used")}</span>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Overall Score */}
      <div className="text-center mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <p className="text-4xl font-serif font-bold text-slate-deep dark:text-paper">
          {biasResult.overall.stereotypePreferencePercent.toFixed(1)}%
        </p>
        <p className="text-xs text-slate-500 mt-1 mb-2">
          {t("stereotype_preference")} ({t("results_threshold")}: &lt;
          {biasResult.overall.thresholdPercent}%)
        </p>
        {biasResult.overall.severity !== "none" && (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-bold ${
              biasResult.overall.severity === "strong"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
            }`}
          >
            {biasResult.overall.severity === "strong"
              ? `⚠️ ${t("strong_bias")}`
              : `⚠️ ${t("light_bias")}`}
          </span>
        )}
      </div>

      {/* Category Breakdown Chart */}
      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
          {t("results_by_category")}
        </h3>
        {biasResult.byBiasType.map((cat) => (
          <div key={cat.biasType} className="flex items-center gap-4 text-sm">
            <div
              className="w-32 shrink-0 text-slate-600 dark:text-slate-400 capitalize truncate"
              title={cat.biasType}
            >
              {cat.biasType}
            </div>
            <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
              {/* Threshold Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-500 z-10"
                style={{ left: "55%" }}
                title="Threshold 55%"
              />

              <div
                className={`h-full transition-all duration-500 ${
                  cat.severity === "strong"
                    ? "bg-red-500"
                    : cat.severity === "light"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${cat.stereotypePreferencePercent}%` }}
              />
            </div>
            <div className="w-16 shrink-0 text-right font-mono text-xs text-slate-500">
              {cat.stereotypePreferencePercent.toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-4">
        <p>
          <strong>{t("disclaimer")}:</strong> {t("bias_disclaimer")}
        </p>
        <p className="mt-1">
          {t("bias_source")}:{" "}
          <a
            href="https://huggingface.co/datasets/crows_pairs"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 dark:hover:text-slate-300"
          >
            CrowS-Pairs (Hugging Face)
          </a>{" "}
          • {t("bias_license")}:{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 dark:hover:text-slate-300"
          >
            CC BY-SA 4.0
          </a>
        </p>
      </div>
    </div>
  );
}
