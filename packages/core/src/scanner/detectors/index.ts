/**
 * Signal detector registry.
 *
 * Runs all registered detectors against a file and returns combined signals.
 */

import type { DetectedSignal, DetectorContext, SignalDetector } from "../../evidence/types";
import { detectAiFrameworkSignals } from "./ai-framework-detector";
import { detectAiProviderSignals } from "./ai-provider-detector";
import { detectCompliance } from "./compliance-detector";
import { detectConfig } from "./config-detector";
import { detectFrameworks } from "./framework-detector";
import { detectLocalInferenceSignals } from "./local-inference-detector";
import { detectMarkdown } from "./markdown-detector";
import { detectPackageJsonSignals } from "./package-json-detector";
import { detectRagSignals } from "./rag-detector";

const ALL_DETECTORS: SignalDetector[] = [
  detectPackageJsonSignals,
  detectAiProviderSignals,
  detectAiFrameworkSignals,
  detectLocalInferenceSignals,
  detectRagSignals,
  detectFrameworks,
  detectCompliance,
  detectConfig,
  detectMarkdown,
];

export function runAllDetectors(ctx: DetectorContext): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  for (const detector of ALL_DETECTORS) {
    try {
      signals.push(...detector(ctx));
    } catch {
      // Individual detector failure should not break the scan
    }
  }
  return signals;
}
