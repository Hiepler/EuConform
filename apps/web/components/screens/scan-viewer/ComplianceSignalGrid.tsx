"use client";

import type { ComplianceSignalGroup, ScanReport } from "@euconform/core/evidence";
import { CheckCircle2, CircleDot, HelpCircle, XCircle } from "lucide-react";
import { useLanguage } from "../../../lib/i18n/LanguageContext";

interface ComplianceSignalGridProps {
  signals: ScanReport["complianceSignals"];
}

const STATUS_CONFIG: Record<
  ComplianceSignalGroup["status"],
  {
    icon: typeof CheckCircle2;
    color: string;
    bgColor: string;
  }
> = {
  present: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-500/10 border-green-200/50 dark:border-green-500/20",
  },
  partial: {
    icon: CircleDot,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20",
  },
  absent: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-slate-500 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50",
  },
};

const AREA_LABELS: Record<keyof ScanReport["complianceSignals"], string> = {
  disclosure: "AI Disclosure",
  biasTesting: "Bias Testing",
  reportingExports: "Reporting & Exports",
  loggingMonitoring: "Logging & Monitoring",
  humanOversight: "Human Oversight",
  dataGovernance: "Data Governance",
  incidentReporting: "Incident Reporting",
};

function SignalCard({ area, group }: { area: string; group: ComplianceSignalGroup }) {
  const config = STATUS_CONFIG[group.status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-3 ${config.bgColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{area}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="capitalize">{group.status}</span>
        <span>&middot;</span>
        <span>{group.confidence} confidence</span>
        {group.evidence.length > 0 && (
          <>
            <span>&middot;</span>
            <span>{group.evidence.length} evidence</span>
          </>
        )}
      </div>
    </div>
  );
}

const AREA_ENTRIES = Object.entries(AREA_LABELS) as Array<
  [keyof ScanReport["complianceSignals"], string]
>;

export function ComplianceSignalGrid({ signals }: ComplianceSignalGridProps) {
  const { t } = useLanguage();

  return (
    <div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
        {t("scan_viewer_compliance_title")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {AREA_ENTRIES.map(([key, label]) => (
          <SignalCard key={key} area={label} group={signals[key]} />
        ))}
      </div>
    </div>
  );
}
