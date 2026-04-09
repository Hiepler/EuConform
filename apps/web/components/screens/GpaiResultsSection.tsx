"use client";

import type { GPAIComplianceFlag, GPAIComplianceResult, GPAIObligationType } from "@euconform/core";
import { AlertTriangle, CheckCircle2, Circle, XCircle } from "lucide-react";
import { useMemo } from "react";
import { useLanguage } from "../../lib/i18n/LanguageContext";

/**
 * Props for the GpaiResultsSection component
 */
export interface GpaiResultsSectionProps {
  gpaiAssessment: GPAIComplianceResult;
  selectedModel: string;
}

/** Label and article reference for each GPAI obligation */
const OBLIGATION_META = {
  "technical-docs": { label: "Technical Documentation", articleRef: "Art. 53(1)(a)" },
  "downstream-info": { label: "Downstream Provider Information", articleRef: "Art. 53(1)(b)" },
  "copyright-policy": {
    label: "Copyright Policy + Training Data Summary",
    articleRef: "Art. 53(1)(c–d)",
  },
  "eu-database": { label: "EU AI Database Registration", articleRef: "Art. 71" },
  "open-source": { label: "Open-Source Release", articleRef: "Art. 53(2)" },
  "systemic-risk": { label: "Systemic Risk Threshold", articleRef: "Art. 51 + Annex XIII" },
  "red-teaming": { label: "Adversarial Testing / Red-Teaming", articleRef: "Art. 55(1)(a)" },
  "incident-reporting": { label: "Serious Incident Reporting", articleRef: "Art. 55(1)(b)" },
  cybersecurity: { label: "Cybersecurity Measures", articleRef: "Art. 55(1)(c)" },
} satisfies Record<GPAIObligationType, { label: string; articleRef: string }>;

const ART53_OBLIGATIONS: GPAIObligationType[] = [
  "technical-docs",
  "downstream-info",
  "copyright-policy",
  "eu-database",
];

const ART55_OBLIGATIONS: GPAIObligationType[] = [
  "red-teaming",
  "incident-reporting",
  "cybersecurity",
];

/**
 * GpaiResultsSection renders the GPAI compliance checklist for the results screen.
 * Shows: compliance level badge, obligation checklist (Art. 53 + Art. 55), systemic risk callout.
 */
export function GpaiResultsSection({ gpaiAssessment, selectedModel }: GpaiResultsSectionProps) {
  const { t } = useLanguage();

  const flagMap = useMemo(
    () =>
      new Map<GPAIObligationType, GPAIComplianceFlag>(
        gpaiAssessment.flags.map((f) => [f.obligation, f])
      ),
    [gpaiAssessment.flags]
  );

  return (
    <div className="space-y-6">
      {/* Compliance Level Badge */}
      <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper">
            {t("gpai_results_title")}
          </h2>
          <ComplianceBadge level={gpaiAssessment.level} t={t} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{selectedModel}</p>

        {gpaiAssessment.isSystemicRisk && (
          <div className="mt-6 p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  {t("gpai_systemic_risk_title")}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t("gpai_systemic_risk_desc")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Art. 53 Checklist */}
      <ObligationSection
        title={t("gpai_art53_section")}
        obligations={ART53_OBLIGATIONS}
        flagMap={flagMap}
        t={t}
      />

      {/* Art. 55 Checklist (only shown if systemic risk) */}
      {gpaiAssessment.isSystemicRisk && (
        <ObligationSection
          title={t("gpai_art55_section")}
          obligations={ART55_OBLIGATIONS}
          flagMap={flagMap}
          t={t}
        />
      )}

      {/* Notes */}
      {gpaiAssessment.notes.length > 0 && (
        <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-6">
          <ul className="space-y-2">
            {gpaiAssessment.notes.map((note) => (
              <li key={note} className="text-xs text-slate-500 dark:text-slate-400 flex gap-2">
                <span className="text-gold mt-0.5">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Compliance level badge */
function ComplianceBadge({
  level,
  t,
}: {
  level: GPAIComplianceResult["level"];
  t: ReturnType<typeof useLanguage>["t"];
}) {
  if (level === "compliant") {
    return (
      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        ✓ {t("gpai_compliant")}
      </span>
    );
  }
  if (level === "partial") {
    return (
      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        ~ {t("gpai_partial")}
      </span>
    );
  }
  return (
    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
      ✗ {t("gpai_non_compliant")}
    </span>
  );
}

/** A section of obligations with checklist items */
function ObligationSection({
  title,
  obligations,
  flagMap,
  t,
}: {
  title: string;
  obligations: GPAIObligationType[];
  flagMap: Map<GPAIObligationType, GPAIComplianceFlag>;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  return (
    <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-6">
      <h3 className="font-serif text-lg font-bold text-slate-deep dark:text-paper mb-4">{title}</h3>
      <ul className="space-y-3">
        {obligations.map((obl) => {
          const flag = flagMap.get(obl);
          const meta = OBLIGATION_META[obl];
          return (
            <ObligationItem
              key={obl}
              label={meta.label}
              articleRef={meta.articleRef}
              flag={flag}
              t={t}
            />
          );
        })}
      </ul>
    </div>
  );
}

const OBLIGATION_STATUS_CONFIG = {
  done: {
    Icon: CheckCircle2,
    iconCls: "text-green-500 dark:text-green-400",
    labelCls: "text-green-600 dark:text-green-400",
    textCls: "text-sm text-slate-700 dark:text-slate-300",
    labelKey: "gpai_obligation_done" as const,
  },
  partial: {
    Icon: Circle,
    iconCls: "text-amber-500 dark:text-amber-400",
    labelCls: "text-amber-600 dark:text-amber-400",
    textCls: "text-sm text-slate-700 dark:text-slate-300",
    labelKey: "gpai_obligation_partial" as const,
  },
  missing: {
    Icon: XCircle,
    iconCls: "text-red-500 dark:text-red-400",
    labelCls: "text-red-600 dark:text-red-400",
    textCls: "text-sm font-medium text-red-700 dark:text-red-300",
    labelKey: "gpai_obligation_missing" as const,
  },
};

/** Single obligation checklist item */
function ObligationItem({
  label,
  articleRef,
  flag,
  t,
}: {
  label: string;
  articleRef: string;
  flag: GPAIComplianceFlag | undefined;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const key = !flag ? "done" : flag.status === "partial" ? "partial" : "missing";
  const { Icon, iconCls, labelCls, textCls, labelKey } = OBLIGATION_STATUS_CONFIG[key];

  return (
    <li className="flex items-start gap-3">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} />
      <div className="flex-1 min-w-0">
        <span className={textCls}>{label}</span>
        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{articleRef}</span>
      </div>
      <span className={`text-xs shrink-0 ${labelCls}`}>{t(labelKey)}</span>
    </li>
  );
}
