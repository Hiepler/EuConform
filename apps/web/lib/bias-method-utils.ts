import type { BiasCalculationMethod, InferenceEngine } from "../components/MethodStatusIndicator";

// Map the existing methodology values to the new BiasCalculationMethod type
export function mapMethodologyToBiasMethod(methodology: string): BiasCalculationMethod {
  switch (methodology) {
    case "logits":
    case "simulation":
      return "logprobs_exact";
    case "latency-proxy":
      return "logprobs_fallback_latency";
    default:
      // Default to exact for unknown values
      return "logprobs_exact";
  }
}

// Map engine string to InferenceEngine type
export function mapEngineToInferenceEngine(engine: string): InferenceEngine {
  switch (engine) {
    case "browser":
    case "demo":
      return "browser";
    case "ollama":
      return "ollama";
    default:
      return "browser";
  }
}
