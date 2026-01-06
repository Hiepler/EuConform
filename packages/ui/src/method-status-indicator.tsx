import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "./lib/utils";
import { MethodologyTooltip } from "./methodology-tooltip";

// Types for bias calculation method and engine
export type BiasCalculationMethod = "logprobs_exact" | "logprobs_fallback_latency";
export type InferenceEngine = "browser" | "ollama";

const methodStatusVariants = cva(
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      method: {
        logprobs_exact:
          "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
        logprobs_fallback_latency:
          "bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
      },
    },
    defaultVariants: {
      method: "logprobs_exact",
    },
  }
);

export interface MethodStatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof methodStatusVariants> {
  method: BiasCalculationMethod;
  engine: InferenceEngine;
  model: string;
  showTooltip?: boolean;
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

// Status message templates for each method/engine combination
const STATUS_MESSAGES = {
  browser_exact: "Berechnet mit exakten Log-Probabilities (wissenschaftlicher Gold-Standard)",
  ollama_exact: "Berechnet mit echten Log-Probabilities (via Ollama)",
  fallback_latency:
    "Geschätzt mittels Inference-Latency (Fallback – Modell oder Ollama-Version unterstützt keine LogProbs)",
} as const;

const getStatusMessage = (method: BiasCalculationMethod, engine: InferenceEngine): string => {
  if (method === "logprobs_exact") {
    return engine === "browser" ? STATUS_MESSAGES.browser_exact : STATUS_MESSAGES.ollama_exact;
  }
  return STATUS_MESSAGES.fallback_latency;
};

function MethodStatusIndicator({
  className,
  method,
  engine,
  model,
  showTooltip = true,
  ...props
}: MethodStatusIndicatorProps) {
  const icon = getStatusIcon(method);
  const message = getStatusMessage(method, engine);

  const indicator = (
    <div
      className={cn(methodStatusVariants({ method }), "cursor-help", className)}
      title={showTooltip ? undefined : `${message} (Model: ${model})`}
      {...props}
    >
      <span className="text-base leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className="font-medium">{message}</span>
    </div>
  );

  if (showTooltip) {
    return (
      <MethodologyTooltip method={method} engine={engine}>
        {indicator}
      </MethodologyTooltip>
    );
  }

  return indicator;
}

export { MethodStatusIndicator, methodStatusVariants };
