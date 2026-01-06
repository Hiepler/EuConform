"use client";

import type { ModelCapability } from "@euconform/core";
import { CheckCircle2, Star } from "lucide-react";
import { useLanguage } from "../lib/i18n/LanguageContext";

/**
 * Model Recommendation Engine
 *
 * Provides intelligent model recommendations based on capability analysis,
 * user preferences, and scientific accuracy requirements.
 */
function shouldRecommend(capability: ModelCapability, allCapabilities: ModelCapability[]): boolean {
  // Only recommend available models
  if (capability.status !== "available") {
    return false;
  }

  // Always recommend browser inference if available (highest accuracy + privacy)
  if (capability.engine === "browser") {
    return true;
  }

  // For Ollama models, recommend the best exact log-probability model
  const exactOllamaModels = allCapabilities.filter(
    (c) => c.engine === "ollama" && c.method === "logprobs_exact" && c.status === "available"
  );

  if (exactOllamaModels.length > 0) {
    // Recommend the first exact model (they're sorted by name)
    return capability === exactOllamaModels[0];
  }

  // If no exact models available, recommend the first available fallback model
  const fallbackModels = allCapabilities.filter(
    (c) => c.engine === "ollama" && c.status === "available"
  );

  return capability === fallbackModels[0];
}

function getRecommendationScore(capability: ModelCapability): number {
  if (capability.status !== "available") return 0;

  let score = 0;

  // Browser inference gets highest score (accuracy + privacy)
  if (capability.engine === "browser") score += 100;

  // Exact methods get significant bonus
  if (capability.method === "logprobs_exact") score += 50;

  // Recommended models get bonus
  if (capability.recommended) score += 25;

  // Available models get base score
  score += 10;

  return score;
}

export const ModelRecommendationEngine = {
  /**
   * Apply recommendations to a list of model capabilities
   */
  getRecommendations: (capabilities: ModelCapability[]): ModelCapability[] => {
    return capabilities
      .map((capability) => ({
        ...capability,
        recommended: shouldRecommend(capability, capabilities),
      }))
      .sort((a, b) => getRecommendationScore(b) - getRecommendationScore(a));
  },

  /**
   * Get recommendation explanation for a model
   */
  getRecommendationExplanation: (
    capability: ModelCapability
  ): {
    titleKey: string;
    descKey: string;
    accuracy: "highest" | "high" | "medium" | "low";
    privacy: "maximum" | "high" | "medium" | "low";
    icon: "star" | "check" | "info" | "warning";
  } => {
    if (capability.engine === "browser") {
      return {
        titleKey: "rec_browser_title",
        descKey: "rec_browser_desc",
        accuracy: "highest",
        privacy: "maximum",
        icon: "star",
      };
    }

    if (capability.method === "logprobs_exact") {
      return {
        titleKey: "rec_exact_title",
        descKey: "rec_exact_desc",
        accuracy: "high",
        privacy: "high",
        icon: "check",
      };
    }

    if (capability.method === "logprobs_fallback_latency") {
      return {
        titleKey: "rec_fallback_title",
        descKey: "rec_fallback_desc",
        accuracy: "medium",
        privacy: "high",
        icon: "info",
      };
    }

    return {
      titleKey: "rec_available_title",
      descKey: "rec_available_desc",
      accuracy: "medium",
      privacy: "medium",
      icon: "info",
    };
  },
} as const;

export interface RecommendationBannerProps {
  model: ModelCapability;
  selectedModel?: string;
  onModelSelect?: (capability: ModelCapability) => void;
  className?: string;
}

/**
 * Recommendation Banner Component
 *
 * Displays the specific recommended model (usually Browser Inference) with a premium
 * "Institutional Elegance" design.
 */
export function RecommendationBanner({
  model,
  selectedModel,
  onModelSelect,
  className = "",
}: RecommendationBannerProps) {
  const { t } = useLanguage();

  const explanation = ModelRecommendationEngine.getRecommendationExplanation(model);
  const isSelected = selectedModel === model.modelId;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-blue-100 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all hover:shadow-md dark:border-blue-900/30 dark:bg-slate-800/80 ${className}`}
    >
      {/* Decorative background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-transparent dark:from-blue-900/10" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800">
            <Star className="h-6 w-6 fill-current text-[#A67C00]" />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="font-serif text-xl font-medium text-[#0A1A2F] dark:text-white">
                {t(explanation.titleKey)}
              </h3>
              <span className="inline-flex items-center rounded-full bg-[#A67C00]/10 px-2.5 py-0.5 text-xs font-medium text-[#A67C00] ring-1 ring-inset ring-[#A67C00]/20">
                {t("recommended")}
              </span>
            </div>

            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              {t(explanation.descKey)}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Modell: {model.modelId}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                {model.engine === "browser" ? t("local_browser_inference") : t("ollama_server")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 sm:flex-col sm:items-end md:flex-row md:items-center">
          {!isSelected && onModelSelect && (
            <button
              type="button"
              onClick={() => onModelSelect(model)}
              className="inline-flex items-center justify-center rounded-lg bg-[#0A1A2F] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0A1A2F] focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {t("select")}
            </button>
          )}

          {isSelected && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-500/30">
              <CheckCircle2 className="h-4 w-4" />
              {t("selected")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModelRecommendationEngine;
