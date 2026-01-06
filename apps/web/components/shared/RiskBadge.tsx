"use client";

import type { RiskAssessment } from "@euconform/core";
import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { useLanguage } from "../../lib/i18n/LanguageContext";

/**
 * Props for the RiskBadge component
 */
export interface RiskBadgeProps {
  /** The risk level to display */
  level: RiskAssessment["level"];
}

/**
 * RiskBadge displays a colored badge indicating the EU AI Act risk classification level.
 * Supports i18n through the useLanguage hook.
 */
export function RiskBadge({ level }: RiskBadgeProps) {
  const { t } = useLanguage();

  const config = {
    unacceptable: {
      bg: "bg-gradient-to-r from-red-600 to-rose-600",
      textKey: "risk_prohibited" as const,
      icon: AlertTriangle,
    },
    high: {
      bg: "bg-gradient-to-r from-orange-500 to-amber-500",
      textKey: "risk_high" as const,
      icon: AlertTriangle,
    },
    limited: {
      bg: "bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900",
      textKey: "risk_limited" as const,
      icon: Scale,
    },
    minimal: {
      bg: "bg-gradient-to-r from-green-500 to-emerald-500",
      textKey: "risk_minimal" as const,
      icon: CheckCircle2,
    },
  };

  const { bg, textKey, icon: Icon } = config[level];

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg ${bg}`}
    >
      <Icon className="w-4 h-4" />
      {t(textKey)}
    </span>
  );
}
