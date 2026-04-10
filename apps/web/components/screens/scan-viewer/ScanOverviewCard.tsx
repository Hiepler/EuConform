"use client";

import type { CiReport, ScanReport } from "@euconform/core/evidence";
import { Activity, Box, CheckCircle2, Clock, Cpu, XCircle } from "lucide-react";
import { useLanguage } from "../../../lib/i18n/LanguageContext";
import { PRIORITY_STYLES } from "../../shared/priority-styles";

interface ScanOverviewCardProps {
  report: ScanReport;
  ciReport: CiReport | null;
}

function GapCountBadge({
  label,
  count,
  priority,
}: { label: string; count: number; priority: keyof typeof PRIORITY_STYLES }) {
  if (count === 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${PRIORITY_STYLES[priority].badge}`}
    >
      {count} {label}
    </span>
  );
}

export function ScanOverviewCard({ report, ciReport }: ScanOverviewCardProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white/50 dark:bg-slate-medium/50 p-6 space-y-5">
      {/* Project header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {report.target.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {report.target.repoType} &middot; {report.target.detectedStack.join(", ") || "—"}
          </p>
        </div>
        <div className="text-right text-xs text-slate-400 dark:text-slate-500 space-y-0.5">
          <div className="flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />
            {new Date(report.generatedAt).toLocaleString()}
          </div>
          <div>
            {report.tool.name} v{report.tool.version}
          </div>
        </div>
      </div>

      {/* AI Footprint */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
            report.aiFootprint.usesAI
              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          {report.aiFootprint.usesAI ? t("scan_viewer_ai_detected") : t("scan_viewer_no_ai")}
        </div>
        {report.aiFootprint.inferenceModes.map((mode) => (
          <span
            key={mode}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
          >
            <Activity className="w-3 h-3" />
            {mode}
          </span>
        ))}
        {report.aiFootprint.providerHints.map((hint) => (
          <span
            key={hint}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
          >
            <Box className="w-3 h-3" />
            {hint}
          </span>
        ))}
      </div>

      {/* CI Status */}
      {ciReport && (
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border dark:border-border-dark">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              ciReport.status.failing
                ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20"
                : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200/50 dark:border-green-500/20"
            }`}
          >
            {ciReport.status.failing ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {ciReport.status.failing ? t("scan_viewer_ci_failing") : t("scan_viewer_ci_passing")}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Threshold: {ciReport.status.failOn}
          </span>
          <div className="flex gap-1.5">
            <GapCountBadge
              label="Critical"
              count={ciReport.status.gapCounts.critical}
              priority="critical"
            />
            <GapCountBadge label="High" count={ciReport.status.gapCounts.high} priority="high" />
            <GapCountBadge
              label="Medium"
              count={ciReport.status.gapCounts.medium}
              priority="medium"
            />
            <GapCountBadge label="Low" count={ciReport.status.gapCounts.low} priority="low" />
          </div>
        </div>
      )}
    </div>
  );
}
