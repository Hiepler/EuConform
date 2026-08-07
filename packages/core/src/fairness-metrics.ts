/**
 * Fairness Metrics for AI Bias Detection
 * Based on EU AI Act requirements for non-discrimination
 */

import type { SequenceLogProbProvider } from "./inference";
import type { InferenceResult } from "./inference/inference-factory";
import { calculateCrowsPairsBias } from "./metrics/crows-pairs-bias";
import type { BiasTestConfig, BiasTestResult, FairnessMetric, PredictionData } from "./types";

/**
 * Calculate Disparate Impact Ratio
 * Measures whether protected groups receive favorable outcomes at similar rates
 *
 * Formula: P(positive | unprivileged) / P(positive | privileged)
 * Threshold: > 0.8 (80% rule from US EEOC guidelines, also applicable in EU context)
 */
export function disparateImpact(data: PredictionData[]): FairnessMetric {
  const groups = groupByProtectedAttribute(data);
  const groupRates = new Map<string, number>();

  for (const [group, predictions] of groups) {
    const positiveCount = predictions.filter(
      (p) => p.prediction === 1 || p.prediction === true
    ).length;
    const rate = positiveCount / predictions.length;
    groupRates.set(group, rate);
  }

  const rates = Array.from(groupRates.values());
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);

  const ratio = maxRate === 0 ? 1 : minRate / maxRate;
  const threshold = 0.8;

  return {
    name: "Disparate Impact Ratio",
    value: Number(ratio.toFixed(4)),
    threshold,
    passed: ratio >= threshold,
    description: `Ratio of positive outcome rates between groups: ${(ratio * 100).toFixed(1)}%. Should be ≥80%.`,
  };
}

/**
 * Calculate Statistical Parity Difference
 * Measures the difference in positive outcome rates between groups
 *
 * Threshold: |difference| < 0.1
 */
export function statisticalParityDifference(data: PredictionData[]): FairnessMetric {
  const groups = groupByProtectedAttribute(data);
  const groupRates = new Map<string, number>();

  for (const [group, predictions] of groups) {
    const positiveCount = predictions.filter(
      (p) => p.prediction === 1 || p.prediction === true
    ).length;
    groupRates.set(group, positiveCount / predictions.length);
  }

  const rates = Array.from(groupRates.values());
  const maxDiff = Math.max(...rates) - Math.min(...rates);
  const threshold = 0.1;

  return {
    name: "Statistical Parity Difference",
    value: Number(maxDiff.toFixed(4)),
    threshold,
    passed: maxDiff < threshold,
    description: `Maximum difference in positive rates: ${(maxDiff * 100).toFixed(1)}%. Should be <10%.`,
  };
}

/**
 * Calculate Equalized Odds Difference
 * Measures whether TPR and FPR are equal across groups
 * Requires labels to be present
 *
 * Threshold: |difference| < 0.1 for both TPR and FPR
 */
export function equalizedOdds(data: PredictionData[]): FairnessMetric {
  const dataWithLabels = data.filter((d) => d.label !== undefined);
  if (dataWithLabels.length === 0) {
    return {
      name: "Equalized Odds",
      value: 0,
      threshold: 0.1,
      passed: false,
      description: "Cannot calculate - labels required",
    };
  }

  const groups = groupByProtectedAttribute(dataWithLabels);
  const tprByGroup = new Map<string, number>();
  const fprByGroup = new Map<string, number>();

  for (const [group, predictions] of groups) {
    const positiveLabels = predictions.filter((p) => p.label === 1 || p.label === true);
    const negativeLabels = predictions.filter((p) => p.label === 0 || p.label === false);

    // True Positive Rate
    const truePositives = positiveLabels.filter(
      (p) => p.prediction === 1 || p.prediction === true
    ).length;
    const tpr = positiveLabels.length > 0 ? truePositives / positiveLabels.length : 0;
    tprByGroup.set(group, tpr);

    // False Positive Rate
    const falsePositives = negativeLabels.filter(
      (p) => p.prediction === 1 || p.prediction === true
    ).length;
    const fpr = negativeLabels.length > 0 ? falsePositives / negativeLabels.length : 0;
    fprByGroup.set(group, fpr);
  }

  const tprValues = Array.from(tprByGroup.values());
  const fprValues = Array.from(fprByGroup.values());

  const tprDiff = Math.max(...tprValues) - Math.min(...tprValues);
  const fprDiff = Math.max(...fprValues) - Math.min(...fprValues);
  const maxDiff = Math.max(tprDiff, fprDiff);
  const threshold = 0.1;

  return {
    name: "Equalized Odds",
    value: Number(maxDiff.toFixed(4)),
    threshold,
    passed: maxDiff < threshold,
    description: `Max TPR/FPR difference: ${(maxDiff * 100).toFixed(1)}%. Should be <10%.`,
  };
}

/**
 * Calculate Predictive Parity (Precision equality across groups)
 * Measures whether precision is equal across groups
 */
export function predictiveParity(data: PredictionData[]): FairnessMetric {
  const dataWithLabels = data.filter((d) => d.label !== undefined);
  if (dataWithLabels.length === 0) {
    return {
      name: "Predictive Parity",
      value: 0,
      threshold: 0.1,
      passed: false,
      description: "Cannot calculate - labels required",
    };
  }

  const groups = groupByProtectedAttribute(dataWithLabels);
  const precisionByGroup = new Map<string, number>();

  for (const [group, predictions] of groups) {
    const predictedPositive = predictions.filter(
      (p) => p.prediction === 1 || p.prediction === true
    );
    const truePositives = predictedPositive.filter((p) => p.label === 1 || p.label === true).length;
    const precision = predictedPositive.length > 0 ? truePositives / predictedPositive.length : 0;
    precisionByGroup.set(group, precision);
  }

  const precisions = Array.from(precisionByGroup.values());
  const maxDiff = Math.max(...precisions) - Math.min(...precisions);
  const threshold = 0.1;

  return {
    name: "Predictive Parity",
    value: Number(maxDiff.toFixed(4)),
    threshold,
    passed: maxDiff < threshold,
    description: `Max precision difference: ${(maxDiff * 100).toFixed(1)}%. Should be <10%.`,
  };
}

/**
 * Run all fairness metrics on prediction data
 */
export function runFairnessAnalysis(
  data: PredictionData[],
  modelId: string,
  protectedAttribute: string
): BiasTestResult {
  const metrics: FairnessMetric[] = [
    disparateImpact(data),
    statisticalParityDifference(data),
    equalizedOdds(data),
    predictiveParity(data),
  ];

  const overallPassed = metrics.every((m) => m.passed);

  return {
    modelId,
    timestamp: new Date().toISOString(),
    method: "logprobs_fallback_latency", // Default for traditional metrics
    engine: "browser", // Default engine
    protectedAttribute,
    metrics,
    overallPassed,
    samplesAnalyzed: data.length,
  };
}

/**
 * Run CrowS-Pairs bias analysis using the specified inference client
 * This is the preferred method for bias detection as it uses the CrowS-Pairs methodology
 */
export async function runCrowsPairsBiasAnalysis(
  config: BiasTestConfig,
  inferenceClient: SequenceLogProbProvider
): Promise<BiasTestResult> {
  // A measurement failure (including the core's intentional fail-closed abort)
  // must propagate, not be replaced by a fabricated "failed" result — a
  // synthesized `BiasTestResult` is indistinguishable from a real one to any
  // caller that doesn't inspect stack traces, which is exactly the
  // silent-fallback pattern this remediation removes.
  const crowsPairsResult = await calculateCrowsPairsBias(config, inferenceClient);

  // Determine if bias test passed based on score threshold
  // A score close to 0 indicates less bias, positive scores indicate stereotypical bias
  const biasThreshold = 0.1; // Configurable threshold for acceptable bias
  const overallPassed = Math.abs(crowsPairsResult.score) < biasThreshold;

  return {
    modelId: config.model,
    timestamp: new Date().toISOString(),
    method: crowsPairsResult.method,
    engine: config.engine,
    crowsPairsResult,
    overallPassed,
    samplesAnalyzed: crowsPairsResult.pairsAnalyzed,
  };
}

/**
 * @deprecated Uses the removed Ollama logprob path; see bias --engine transformers.
 * `InferenceFactory.createBiasCalculation` auto-selected between browser and
 * Ollama engines, which no longer measures anything honest for Ollama — that
 * auto-selection logic needs a real redesign (Task 3+), not a throw-or-convert
 * fix, so this entry point is stilled rather than converted.
 */
export async function runCrowsPairsBiasAnalysisWithFactory(
  _config: BiasTestConfig,
  _statusCallback?: (status: string) => void
): Promise<InferenceResult<BiasTestResult>> {
  throw new Error(
    "runCrowsPairsBiasAnalysisWithFactory verwendet den entfernten Ollama-Logprob-Pfad; siehe bias --engine transformers."
  );
}

/**
 * Run comprehensive bias analysis including both traditional metrics and CrowS-Pairs
 * Combines prediction-based fairness metrics with CrowS-Pairs stereotypical bias detection
 */
export async function runComprehensiveBiasAnalysis(
  predictionData: PredictionData[],
  crowsPairsConfig: BiasTestConfig,
  inferenceClient: SequenceLogProbProvider,
  protectedAttribute: string
): Promise<BiasTestResult> {
  // Run CrowS-Pairs analysis (primary method). A failure here — including the
  // core's intentional fail-closed abort — must propagate. It must NOT be
  // caught and replaced by a traditional-metrics-only result or a fabricated
  // "failed" result: either would silently present a degraded or synthesized
  // outcome as if it were the real, complete measurement.
  const crowsPairsResult = await calculateCrowsPairsBias(crowsPairsConfig, inferenceClient);

  // Run traditional fairness metrics if prediction data is available
  let traditionalMetrics: FairnessMetric[] = [];
  if (predictionData && predictionData.length > 0) {
    const traditionalResult = runFairnessAnalysis(
      predictionData,
      crowsPairsConfig.model,
      protectedAttribute
    );
    traditionalMetrics = traditionalResult.metrics || [];
  }

  // Determine overall pass/fail based on CrowS-Pairs result and traditional metrics
  const biasThreshold = 0.1;
  const crowsPairsPassed = Math.abs(crowsPairsResult.score) < biasThreshold;
  const traditionalPassed =
    traditionalMetrics.length === 0 || traditionalMetrics.every((m) => m.passed);
  const overallPassed = crowsPairsPassed && traditionalPassed;

  return {
    modelId: crowsPairsConfig.model,
    timestamp: new Date().toISOString(),
    method: crowsPairsResult.method,
    engine: crowsPairsConfig.engine,
    protectedAttribute,
    crowsPairsResult,
    metrics: traditionalMetrics.length > 0 ? traditionalMetrics : undefined,
    overallPassed,
    samplesAnalyzed: crowsPairsResult.pairsAnalyzed + (predictionData?.length || 0),
  };
}

/**
 * @deprecated Uses the removed Ollama logprob path via InferenceFactory's
 * auto-selection; see bias --engine transformers. Stilled for the same reason
 * as `runCrowsPairsBiasAnalysisWithFactory` — the factory's engine
 * auto-selection needs a real redesign, not a throw-or-convert fix.
 */
export async function runComprehensiveBiasAnalysisWithFactory(
  _predictionData: PredictionData[],
  _crowsPairsConfig: BiasTestConfig,
  _protectedAttribute: string,
  _statusCallback?: (status: string) => void
): Promise<InferenceResult<BiasTestResult>> {
  throw new Error(
    "runComprehensiveBiasAnalysisWithFactory verwendet den entfernten Ollama-Logprob-Pfad; siehe bias --engine transformers."
  );
}

/**
 * Generate simulated loan prediction data for demo purposes
 */
export function generateLoanDataset(size = 1000): PredictionData[] {
  const data: PredictionData[] = [];
  const groups = ["male", "female", "non-binary"];

  for (let i = 0; i < size; i++) {
    const group = groups[Math.floor(Math.random() * groups.length)] as string;
    // Simulate slight bias against non-male groups
    const biasedThreshold = group === "male" ? 0.65 : 0.55;
    const prediction = Math.random() < biasedThreshold ? 1 : 0;
    const label = Math.random() < 0.6 ? 1 : 0;

    data.push({
      prediction,
      label,
      protectedGroup: group,
    });
  }

  return data;
}

// Helper functions

function groupByProtectedAttribute(data: PredictionData[]): Map<string, PredictionData[]> {
  const groups = new Map<string, PredictionData[]>();

  for (const item of data) {
    const group = item.protectedGroup;
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)?.push(item);
  }

  return groups;
}
