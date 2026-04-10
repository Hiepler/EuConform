"use client";

import type { ScanGap } from "@euconform/core/evidence";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../../lib/i18n/LanguageContext";
import { PRIORITY_STYLES } from "../../shared/priority-styles";

interface ScanGapsListProps {
  gaps: ScanGap[];
}

const PRIORITY_LABELS: Record<ScanGap["priority"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const STATUS_STYLES: Record<ScanGap["status"], string> = {
  missing:
    "bg-red-50/50 text-red-600 border-red-200/50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  partial:
    "bg-amber-50/50 text-amber-600 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
};

function GapItem({ gap }: { gap: ScanGap }) {
  const [expanded, setExpanded] = useState(false);
  const styles = PRIORITY_STYLES[gap.priority];

  return (
    <div
      className={`rounded-lg border bg-white dark:bg-slate-medium/50 transition-colors ${styles.border}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div className={`w-2 h-2 rounded-full border shrink-0 ${styles.dot}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {gap.title}
          </span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border shrink-0 ${styles.badge}`}
        >
          {PRIORITY_LABELS[gap.priority]}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border shrink-0 ${STATUS_STYLES[gap.status]}`}
        >
          {gap.status === "missing" ? "Missing" : "Partial"}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border dark:border-border-dark ml-5">
          <p className="text-sm text-slate-600 dark:text-slate-400 pt-2">{gap.description}</p>
          {gap.evidence.length > 0 && (
            <div className="space-y-1">
              {gap.evidence.map((ev) => (
                <div
                  key={`${ev.file}:${ev.line ?? 0}`}
                  className="text-xs text-slate-500 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-800 rounded px-2 py-1"
                >
                  {ev.file}
                  {ev.line ? `:${ev.line}` : ""} — {ev.snippet}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ScanGapsList({ gaps }: ScanGapsListProps) {
  const { t } = useLanguage();

  if (gaps.length === 0) {
    return (
      <div className="rounded-lg border border-border dark:border-border-dark bg-white/50 dark:bg-slate-medium/50 p-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("gap_no_gaps")}</p>
      </div>
    );
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const g of gaps) counts[g.priority]++;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {t("scan_viewer_gaps_title")}
        </h3>
        <div className="flex gap-1.5 text-xs">
          {counts.critical > 0 && (
            <span className="text-red-600 dark:text-red-400">{counts.critical} critical</span>
          )}
          {counts.high > 0 && (
            <span className="text-amber-600 dark:text-amber-400">{counts.high} high</span>
          )}
          {counts.medium > 0 && (
            <span className="text-blue-600 dark:text-blue-400">{counts.medium} medium</span>
          )}
          {counts.low > 0 && (
            <span className="text-slate-500 dark:text-slate-400">{counts.low} low</span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {gaps.map((gap) => (
          <GapItem key={gap.id} gap={gap} />
        ))}
      </div>
    </div>
  );
}
