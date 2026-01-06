"use client";

import * as React from "react";

// Types for bias calculation method and engine
export type BiasCalculationMethod = "logprobs_exact" | "logprobs_fallback_latency";
export type InferenceEngine = "browser" | "ollama";

// Status message templates for each method/engine combination
const STATUS_MESSAGES = {
  browser_exact: "Berechnet mit exakten Log-Probabilities (wissenschaftlicher Gold-Standard)",
  ollama_exact: "Berechnet mit echten Log-Probabilities (via Ollama)",
  fallback_latency:
    "Geschätzt mittels Inference-Latency (Fallback – Modell oder Ollama-Version unterstützt keine LogProbs)",
} as const;

export interface MethodStatusIndicatorProps {
  method: BiasCalculationMethod;
  engine: InferenceEngine;
  model: string;
  className?: string;
}

const getStatusIcon = (method: BiasCalculationMethod): string => {
  switch (method) {
    case "logprobs_exact":
      return "✅";
    case "logprobs_fallback_latency":
      return "⚡";
    default:
      return "ℹ️";
  }
};

const getStatusMessage = (method: BiasCalculationMethod, engine: InferenceEngine): string => {
  if (method === "logprobs_exact") {
    return engine === "browser" ? STATUS_MESSAGES.browser_exact : STATUS_MESSAGES.ollama_exact;
  }
  return STATUS_MESSAGES.fallback_latency;
};

const getMethodologyExplanation = (method: BiasCalculationMethod, engine: InferenceEngine) => {
  const baseExplanation =
    "Diese Bias-Bewertung basiert auf der CrowS-Pairs Methodologie (Nangia et al., 2020), die stereotype vs. anti-stereotype Satzpaare vergleicht.";

  if (method === "logprobs_exact") {
    const engineSpecific =
      engine === "browser"
        ? "Verwendet echte Log-Probabilities direkt vom Sprachmodell für höchste wissenschaftliche Genauigkeit."
        : "Verwendet Log-Probabilities von Ollama für präzise Bias-Messung.";

    return {
      title: "Exakte Log-Probability Methode",
      description: `${baseExplanation} ${engineSpecific}`,
      recommendation: "Dies ist die wissenschaftlich präziseste Methode zur Bias-Messung.",
    };
  }
  return {
    title: "Latency-Fallback Methode",
    description: `${baseExplanation} Da Log-Probabilities nicht verfügbar sind, wird die Inferenz-Latenz als Proxy verwendet.`,
    recommendation:
      "Für bessere Genauigkeit empfehlen wir ein Ollama-Update oder die Verwendung eines Modells mit Log-Probability-Unterstützung.",
  };
};

function MethodStatusIndicator({
  method,
  engine,
  model,
  className = "",
}: MethodStatusIndicatorProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const icon = getStatusIcon(method);
  const message = getStatusMessage(method, engine);
  const explanation = getMethodologyExplanation(method, engine);

  const baseClasses =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-help relative";
  const methodClasses =
    method === "logprobs_exact"
      ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      : "bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";

  return (
    <div className="relative">
      <button
        type="button"
        className={`${baseClasses} ${methodClasses} ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowTooltip(!showTooltip);
          }
          if (e.key === "Escape") {
            setShowTooltip(false);
          }
        }}
        aria-label={`Bias calculation method: ${message}. Model: ${model}. Press Enter for more information.`}
        aria-describedby={showTooltip ? "methodology-tooltip" : undefined}
        aria-expanded={showTooltip}
      >
        <span className="text-base leading-none" aria-hidden="true">
          {icon}
        </span>
        <span className="font-medium">{message}</span>
      </button>

      {showTooltip && (
        <div
          id="methodology-tooltip"
          className="absolute z-50 w-80 p-4 mt-2 bg-slate-900 text-slate-50 rounded-md shadow-lg dark:bg-slate-50 dark:text-slate-900 text-left space-y-2 border border-slate-700 dark:border-slate-300"
          role="tooltip"
          aria-live="polite"
        >
          <div className="font-semibold text-sm">{explanation.title}</div>
          <div className="text-xs leading-relaxed">{explanation.description}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 italic">
            {explanation.recommendation}
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <a
              href="https://aclanthology.org/2020.emnlp-main.154"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 dark:text-blue-600 dark:hover:text-blue-700 underline"
            >
              📄 CrowS-Pairs Paper (Nangia et al., 2020)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export { MethodStatusIndicator };
