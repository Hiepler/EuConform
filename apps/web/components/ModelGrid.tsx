"use client";

import type { ModelCapability } from "@euconform/core";
import { AlertTriangle, Check, Clock, Globe, Server, Star, Zap } from "lucide-react";
import { useLanguage } from "../lib/i18n/LanguageContext";

/**
 * Props for the ModelGrid component
 */
export interface ModelGridProps {
  models: ModelCapability[];
  selectedModel?: string;
  onModelSelect?: (capability: ModelCapability) => void;
  disabled?: boolean;
}

/**
 * Model Grid Component
 *
 * Displays a responsive grid of model cards with capability badges
 * and visual indicators for recommended models.
 */
export function ModelGrid({
  models,
  selectedModel,
  onModelSelect,
  disabled = false,
}: ModelGridProps) {
  const { t } = useLanguage();

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
        <Server className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          {t("no_models_available")}
        </h3>
        <p className="text-sm text-slate-500 max-w-sm">{t("start_ollama_instruction")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {models.map((model) => (
        <ModelCard
          key={`${model.modelId}-${model.engine}`}
          capability={model}
          isSelected={selectedModel === model.modelId}
          onSelect={() => onModelSelect?.(model)}
          disabled={disabled || model.status === "unavailable"}
        />
      ))}
    </div>
  );
}

interface ModelCardProps {
  capability: ModelCapability;
  isSelected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

function ModelCard({ capability, isSelected, onSelect, disabled }: ModelCardProps) {
  const { t } = useLanguage();
  const isRecommended = capability.recommended;

  // Determine badge styling based on methodology
  const getMethodBadge = () => {
    switch (capability.method) {
      case "logprobs_exact":
        return {
          text: t("badge_exact_logprobs"),
          icon: Check,
          colorClass:
            "text-emerald-700 bg-emerald-50 ring-emerald-600/20 dark:text-emerald-400 dark:bg-emerald-900/20 dark:ring-emerald-500/30",
        };
      case "logprobs_fallback_latency":
        return {
          text: t("badge_latency_fallback"),
          icon: Zap,
          colorClass:
            "text-amber-700 bg-amber-50 ring-amber-600/20 dark:text-amber-400 dark:bg-amber-900/20 dark:ring-amber-500/30",
        };
      default:
        return {
          text: t("badge_exact_calculation"),
          icon: Star,
          colorClass: "text-[#A67C00] bg-[#A67C00]/10 ring-[#A67C00]/20",
        };
    }
  };

  const badge = getMethodBadge();
  const BadgeIcon = badge.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        group relative flex flex-col items-start w-full text-left rounded-xl p-5 
        transition-all duration-300 border backdrop-blur-sm
        ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"}
        ${
          isSelected
            ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/20 dark:bg-blue-900/20 dark:border-blue-700"
            : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[#A67C00]/50 dark:bg-slate-900 dark:border-slate-800"
        }
      `}
      aria-pressed={isSelected}
      aria-label={`${t("select_model_aria")} ${capability.modelId}`}
    >
      {/* Header with Title and Status */}
      <div className="w-full flex justify-between items-start mb-4">
        <div className="flex-1 mr-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`
              inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset
              ${
                capability.engine === "browser"
                  ? "bg-purple-50 text-purple-700 ring-purple-700/10 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/30"
                  : "bg-slate-100 text-slate-700 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-400/20"
              }
            `}
            >
              {capability.engine === "browser" ? (
                <Globe className="w-3 h-3 mr-1" />
              ) : (
                <Server className="w-3 h-3 mr-1" />
              )}
              {capability.engine === "browser" ? t("browser_engine") : t("ollama_engine")}
            </span>

            {/* Last Tested Date */}
            {capability.lastTested && (
              <span className="flex items-center text-[10px] text-slate-400 dark:text-slate-500">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(capability.lastTested).toLocaleDateString()}
              </span>
            )}
          </div>

          <h3 className="font-sans font-bold text-lg text-[#0A1A2F] dark:text-white leading-tight break-words">
            {capability.modelId}
          </h3>
        </div>

        {/* Selection Indicator */}
        <div
          className={`
          flex-shrink-0 w-6 h-6 rounded-full border transition-all duration-200 flex items-center justify-center
          ${
            isSelected
              ? "bg-[#0A1A2F] border-[#0A1A2F] text-white dark:bg-blue-500 dark:border-blue-500"
              : "border-slate-300 bg-transparent group-hover:border-[#0A1A2F] dark:border-slate-600"
          }
        `}
        >
          {isSelected && <Check className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Methodology Badge */}
      <div
        className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset mb-4
        ${badge.colorClass}
      `}
      >
        <BadgeIcon className="w-3.5 h-3.5" />
        {badge.text}
      </div>

      {/* Footer Details */}
      <div className="w-full mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          {capability.status === "available" ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {t("rec_available_title")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              Unknown Status
            </span>
          )}
        </div>

        {isRecommended && <Star className="w-4 h-4 text-[#A67C00] fill-[#A67C00] opacity-50" />}
      </div>
    </button>
  );
}
