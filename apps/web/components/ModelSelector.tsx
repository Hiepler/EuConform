"use client";

import type {
  DetectionProgress,
  ModelCapability,
  ModelSelectionState,
  UserPreferences,
} from "@euconform/core";
import { createCapabilityDetectionService } from "@euconform/core";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ModelGrid } from "./ModelGrid";
import { ModelRecommendationEngine } from "./ModelRecommendationEngine";

import { useLanguage } from "../lib/i18n/LanguageContext";

export interface ModelSelectorProps {
  /** Currently selected model ID */
  selectedModel?: string;
  /** Callback when model selection changes */
  onModelSelect?: (capability: ModelCapability) => void;
  /** Whether to show explanations panel by default */
  showExplanations?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Loading state message */
  loadingMessage?: string;
  /** Filter models by engine type */
  engineFilter?: "browser" | "ollama";
}

/**
 * Enhanced Model Selection Interface Component
 *
 * Provides real-time capability detection, visual badges, and recommendation engine
 * for selecting AI models with transparent bias calculation method information.
 */
export function ModelSelector({
  selectedModel,
  onModelSelect,
  showExplanations = false,
  className = "",
  disabled = false,
  loadingMessage,
  engineFilter,
}: ModelSelectorProps) {
  const { t } = useLanguage();

  const [state, setState] = useState<ModelSelectionState>({
    models: [],
    selectedModel,
    isLoading: true,
    showExplanations,
  });

  const [_detectionProgress, setDetectionProgress] = useState<DetectionProgress>({
    total: 0,
    completed: 0,
    inProgress: [],
  });

  const [userPreferences] = useState<UserPreferences>({
    showExplanations,
    preferExactMethods: true,
    hideUnavailableModels: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create capability detection service instance
  const [detectionService] = useState(() => createCapabilityDetectionService());

  /**
   * Detect all model capabilities with progress tracking
   */
  const detectCapabilities = useCallback(async () => {
    try {
      setState((prev: ModelSelectionState) => ({ ...prev, isLoading: true }));
      setError(null);

      // Reset progress
      setDetectionProgress({
        total: 0,
        completed: 0,
        inProgress: [],
      });

      const capabilities = await detectionService.detectAllCapabilities();

      // Apply recommendations using the recommendation engine
      const recommendedCapabilities = ModelRecommendationEngine.getRecommendations(capabilities);

      setState((prev: ModelSelectionState) => ({
        ...prev,
        models: recommendedCapabilities,
        isLoading: false,
      }));

      setDetectionProgress({
        total: capabilities.length,
        completed: capabilities.length,
        inProgress: [],
      });
    } catch (err) {
      console.error("Failed to detect model capabilities:", err);
      setError(err instanceof Error ? err.message : "Failed to detect model capabilities");
      setState((prev: ModelSelectionState) => ({ ...prev, isLoading: false }));
    }
  }, [detectionService]);

  /**
   * Refresh capabilities by clearing cache and re-detecting
   */
  const refreshCapabilities = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const capabilities = await detectionService.refreshCapabilities();
      const recommendedCapabilities = ModelRecommendationEngine.getRecommendations(capabilities);
      setState((prev: ModelSelectionState) => ({
        ...prev,
        models: recommendedCapabilities,
        isLoading: false,
      }));
    } catch (err) {
      console.error("Failed to refresh capabilities:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh capabilities");
    } finally {
      setIsRefreshing(false);
    }
  }, [detectionService]);

  /**
   * Handle model selection with confirmation flow
   */
  const handleModelSelect = useCallback(
    (capability: ModelCapability) => {
      if (disabled || capability.status === "unavailable" || capability.status === "error") {
        return;
      }

      setState((prev: ModelSelectionState) => ({
        ...prev,
        selectedModel: capability.modelId,
      }));

      onModelSelect?.(capability);
    },
    [disabled, onModelSelect]
  );

  // Initialize capability detection on mount
  useEffect(() => {
    detectCapabilities();
  }, [detectCapabilities]);

  // Update selected model when prop changes
  useEffect(() => {
    setState((prev: ModelSelectionState) => ({
      ...prev,
      selectedModel,
    }));
  }, [selectedModel]);

  // Filter models based on user preferences and engine filter
  const validModels = state.models.filter((model: ModelCapability) => {
    if (userPreferences.hideUnavailableModels) {
      if (model.status !== "available" && model.status !== "detecting") {
        return false;
      }
    }

    if (engineFilter && model.engine !== engineFilter) {
      return false;
    }
    return true;
  });

  return (
    <div
      className={`model-selector bg-[#FAFAFA] dark:bg-slate-950 py-8 px-6 rounded-2xl border border-slate-100 dark:border-slate-800 ${className}`}
    >
      {/* Header with clear separation */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#0A1A2F] dark:text-white mb-2 tracking-tight">
            {t("select_model_title")}
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-xl leading-relaxed">
            {t("select_model_description_long")}
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCapabilities}
          disabled={isRefreshing || state.isLoading}
          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#0A1A2F] dark:text-white font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      {/* Loading State */}
      {state.isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A1A2F] mb-4" />
          <h3 className="text-lg font-serif font-medium text-[#0A1A2F] dark:text-white mb-2">
            {loadingMessage || t("analyzing_available_models")}
          </h3>
          <p className="text-sm text-slate-500">{t("please_wait")}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                {t("model_detection_error")}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={detectCapabilities}
                className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                {t("retry")}
              </button>
            </div>
          </div>
        </div>
      )}

      {!state.isLoading && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div>
            <ModelGrid
              models={validModels}
              selectedModel={state.selectedModel}
              onModelSelect={handleModelSelect}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
