"use client";

import type { GapAction, GapAnalysisResult, GapPriority } from "@euconform/core";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../lib/i18n/LanguageContext";

export interface GapAnalysisSectionProps {
  result: GapAnalysisResult;
}

/** Priority color configuration */
const PRIORITY_STYLES: Record<GapPriority, { badge: string; border: string; dot: string }> = {
  critical: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  high: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  medium: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-400",
  },
};

/**
 * GapAnalysisSection displays a prioritized compliance action plan derived
 * from the Annex III or GPAI compliance assessment result.
 */
export function GapAnalysisSection({ result }: GapAnalysisSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <div>
          <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper">
            {t("gap_analysis_title")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("gap_analysis_subtitle")}
          </p>
        </div>

        {result.totalGaps > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {(
              [
                ["critical", result.criticalCount, t("gap_priority_critical")],
                ["high", result.highCount, t("gap_priority_high")],
                ["medium", result.mediumCount, t("gap_priority_medium")],
              ] as const
            ).map(
              ([priority, count, label]) =>
                count > 0 && (
                  <span
                    key={priority}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_STYLES[priority].badge}`}
                  >
                    {count} {label}
                  </span>
                )
            )}
          </div>
        )}
      </div>

      {result.totalGaps === 0 ? (
        <p className="text-sm text-green-700 dark:text-green-400">{t("gap_no_gaps")}</p>
      ) : (
        <ul className="space-y-3">
          {result.actions.map((action) => (
            <GapActionItem key={action.id} action={action} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Single collapsible gap action card */
function GapActionItem({ action }: { action: GapAction }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const styles = PRIORITY_STYLES[action.priority];

  const priorityLabel =
    action.priority === "critical"
      ? t("gap_priority_critical")
      : action.priority === "high"
        ? t("gap_priority_high")
        : t("gap_priority_medium");

  const statusLabel =
    action.status === "missing" ? t("gap_status_missing") : t("gap_status_partial");

  return (
    <li className={`rounded-lg border ${styles.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {action.title}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.badge}`}>
              {priorityLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {action.articleRef}
            </span>
            <span className="px-2 py-0.5 rounded text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {action.description}
          </p>
        </div>
        <span className="mt-1 text-slate-400 dark:text-slate-500 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
            {t("gap_steps_label")}
          </p>
          <ol className="space-y-1.5">
            {action.steps.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
              >
                <span className="text-gold font-bold shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {action.penaltyRef && (
            <p className="mt-3 text-xs text-red-500 dark:text-red-400">
              Penalty reference: {action.penaltyRef} – up to €15M or 3% of global annual turnover
            </p>
          )}
        </div>
      )}
    </li>
  );
}
