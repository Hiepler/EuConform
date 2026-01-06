import type * as React from "react";
import type { BiasCalculationMethod, InferenceEngine } from "./method-status-indicator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

export interface MethodologyTooltipProps {
  method: BiasCalculationMethod;
  engine: InferenceEngine;
  children: React.ReactNode;
}

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
      paperLink: true,
    };
  }
  return {
    title: "Latency-Fallback Methode",
    description: `${baseExplanation} Da Log-Probabilities nicht verfügbar sind, wird die Inferenz-Latenz als Proxy verwendet.`,
    recommendation:
      "Für bessere Genauigkeit empfehlen wir ein Ollama-Update oder die Verwendung eines Modells mit Log-Probability-Unterstützung.",
    paperLink: true,
  };
};

function MethodologyTooltip({ method, engine, children }: MethodologyTooltipProps) {
  const explanation = getMethodologyExplanation(method, engine);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="max-w-sm p-4 text-left space-y-2">
          <div className="font-semibold text-sm">{explanation.title}</div>
          <div className="text-xs leading-relaxed">{explanation.description}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 italic">
            {explanation.recommendation}
          </div>
          {explanation.paperLink && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <a
                href="https://aclanthology.org/2020.emnlp-main.154"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                📄 CrowS-Pairs Paper (Nangia et al., 2020)
              </a>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { MethodologyTooltip };
