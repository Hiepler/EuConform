"use client";

import type { ModelCapability } from "@euconform/core";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import type { InferenceEngine } from "../../lib/types/wizard";
import { ModelSelector } from "../ModelSelector";

/**
 * Props for the ModelSelectScreen component
 */
export interface ModelSelectScreenProps {
  /** Currently selected model identifier */
  selectedModel: string;
  /** Full capability information for the selected model */
  selectedCapability: ModelCapability | null;
  /** Currently selected inference engine */
  selectedEngine: InferenceEngine;
  /** Error message if any */
  error: string | null;
  /** Handler for model selection */
  onModelSelect: (capability: ModelCapability) => void;
  /** Handler for navigating back */
  onBack: () => void;
  /** Handler for continuing to quiz */
  onContinue: () => void;
}

/**
 * ModelSelectScreen displays the model selection interface with the ModelSelector
 * component, error display, and navigation controls.
 */
export function ModelSelectScreen({
  selectedModel,
  selectedCapability,
  selectedEngine,
  error,
  onModelSelect,
  onBack,
  onContinue,
}: ModelSelectScreenProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          ← {t("back")}
        </button>

        <div className="border border-border dark:border-border-dark rounded-lg bg-white dark:bg-slate-medium p-8">
          {/* Enhanced Model Selector */}
          <ModelSelector
            selectedModel={selectedModel}
            onModelSelect={onModelSelect}
            showExplanations={false}
            className="mb-6"
            loadingMessage={t("detecting_capabilities")}
            engineFilter={selectedEngine === "demo" ? "browser" : selectedEngine}
          />

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    {t("error")}
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            type="button"
            onClick={onContinue}
            disabled={!selectedCapability || selectedCapability.status !== "available"}
            className="w-full mt-6 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border-2 border-slate-deep dark:border-paper text-slate-deep dark:text-paper font-medium hover:bg-slate-deep hover:text-paper dark:hover:bg-paper dark:hover:text-slate-deep transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current"
          >
            {t("continue_to_risk_assessment")}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </main>
  );
}
