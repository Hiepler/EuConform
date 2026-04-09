"use client";

import type { GapAction, GapAnalysisResult, GapPriority } from "@euconform/core";
import { AlertCircle, ChevronDown, ChevronUp, FileWarning } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../lib/i18n/LanguageContext";

export interface GapAnalysisSectionProps {
  result: GapAnalysisResult;
}

/** Priority color configuration */
const PRIORITY_STYLES: Record<
  GapPriority,
  { badge: string; border: string; dot: string; iconBase: string }
> = {
  critical: {
    badge:
      "bg-red-50/50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200/50 dark:border-red-500/20",
    border:
      "border-red-100 dark:border-red-900/40 hover:border-red-200 dark:hover:border-red-600/50",
    dot: "bg-red-500 border-red-200 dark:border-red-600",
    iconBase: "text-red-500 dark:text-red-400",
  },
  high: {
    badge:
      "bg-amber-50/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20",
    border:
      "border-amber-100 dark:border-amber-900/40 hover:border-amber-200 dark:hover:border-amber-600/50",
    dot: "bg-amber-500 border-amber-200 dark:border-amber-600",
    iconBase: "text-amber-500 dark:text-amber-400",
  },
  medium: {
    badge:
      "bg-blue-50/50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20",
    border:
      "border-blue-100 dark:border-blue-900/40 hover:border-blue-200 dark:hover:border-blue-600/50",
    dot: "bg-blue-500 border-blue-200 dark:border-blue-600",
    iconBase: "text-blue-500 dark:text-blue-400",
  },
};

/**
 * GapAnalysisSection displays a prioritized compliance action plan derived
 * from the Annex III or GPAI compliance assessment result.
 */
export function GapAnalysisSection({ result }: GapAnalysisSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1C1F26] border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-8 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <FileWarning className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">
              {t("gap_analysis_title")}
            </h2>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
            {t("gap_analysis_subtitle")}
          </p>
        </div>

        {result.totalGaps > 0 && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase border ${PRIORITY_STYLES[priority].badge}`}
                  >
                    {count} {label}
                  </span>
                )
            )}
          </div>
        )}
      </div>

      {result.totalGaps === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 text-center">
          <p className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
            {t("gap_no_gaps")}
          </p>
        </div>
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
    <li
      className={`rounded-xl border bg-white dark:bg-slate-900/50 shadow-sm transition-all duration-200 ${expanded ? "border-slate-300 dark:border-slate-700" : styles.border}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
      >
        <div className="flex items-center justify-center pt-1 sm:pt-0">
          <div className={`w-2.5 h-2.5 rounded-full border-[2.5px] ${styles.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5">
            <span className="text-[14px] sm:text-[15px] font-semibold text-slate-900 dark:text-white">
              {action.title}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wider ${styles.badge}`}
              >
                {priorityLabel}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {action.articleRef}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                {statusLabel}
              </span>
            </div>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2 sm:line-clamp-1">
            {action.description}
          </p>
        </div>
        <div className="shrink-0 pt-1 sm:pt-0 ml-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 group">
            {expanded ? (
              <ChevronUp className="w-4 h-4 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
            ) : (
              <ChevronDown className="w-4 h-4 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
            )}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
            {t("gap_steps_label")}
          </p>
          <div className="space-y-2">
            {action.steps.map((step, i) => (
              <div
                key={step}
                className="flex items-start gap-3 text-[13px] text-slate-600 dark:text-slate-300 p-3 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white dark:bg-slate-700 text-[10px] font-semibold text-slate-500 border border-slate-200 dark:border-slate-600 shrink-0 shadow-sm mt-[1px]">
                  {i + 1}
                </div>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
          {action.penaltyRef && (
            <div className="mt-4 flex items-start gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-600/90 dark:text-red-400/90">
                <span className="font-semibold">Penalty reference ({action.penaltyRef}):</span> up
                to €15M or 3% of global annual turnover
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
