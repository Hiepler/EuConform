/**
 * EU AI Act Type Definitions
 * Based on Regulation (EU) 2024/1689
 */

/** Risk classification levels according to EU AI Act Article 6 + Annex III */
export type RiskLevel = "unacceptable" | "high" | "limited" | "minimal";

/** Categories of high-risk AI systems from Annex III */
export type HighRiskCategory =
  | "biometric-identification"
  | "critical-infrastructure"
  | "education-training"
  | "employment-workers"
  | "essential-services"
  | "law-enforcement"
  | "migration-asylum"
  | "justice-democracy";

/** Quiz question for risk assessment */
export interface QuizQuestion {
  id: string;
  question: string;
  description?: string;
  options: QuizOption[];
}

export interface QuizOption {
  value: string;
  label: string;
  riskIndicator?: RiskLevel;
}

/** User's answer to a quiz question */
export interface QuizAnswer {
  questionId: string;
  value: string;
}

/** Result of risk classification */
export interface RiskAssessment {
  level: RiskLevel;
  category?: HighRiskCategory;
  score: number;
  flags: RiskFlag[];
  recommendations: string[];
  legalBasis: string[];
}

export interface RiskFlag {
  type: "warning" | "critical" | "info";
  message: string;
  articleReference?: string;
}

/** Fairness metrics types */
export interface FairnessMetric {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
  description: string;
}

export interface BiasTestResult {
  modelId: string;
  timestamp: string;
  method: BiasCalculationMethod | SequenceLogProbMethod;
  engine: "browser" | "ollama";
  protectedAttribute?: string;
  crowsPairsResult?: CrowsPairsBiasResult;
  metrics?: FairnessMetric[];
  overallPassed: boolean;
  samplesAnalyzed: number;
}

/** Prediction data for fairness analysis */
export interface PredictionData {
  prediction: number | boolean;
  label?: number | boolean;
  protectedGroup: string;
}

/** CrowS-Pairs dataset entry */
export interface CrowsPairsEntry {
  id: number;
  sent_more: string;
  sent_less: string;
  bias_type: string;
}

/** Bias calculation method types */
export type BiasCalculationMethod = "logprobs_exact" | "logprobs_fallback_latency";

/**
 * How a sentence's log-probability was accumulated for the autoregressive
 * CrowS-Pairs adaptation (Messmotor-Sanierung Task 3). "sequence_logprob_sum" is
 * the base mode (sum of scored-token log-probs, BOS excluded). Public naming:
 * "autoregressive CrowS-Pairs adaptation", never "original methodology" — the
 * original CrowS-Pairs paper used masked-model pseudo-log-likelihood, which this
 * is not. "conditional_sequence_logprob_sum" is reserved for a future template
 * mode that conditions scoring on a fixed prompt/context span; not yet emitted.
 */
export type SequenceLogProbMethod = "sequence_logprob_sum" | "conditional_sequence_logprob_sum";

/** Model capability cache for log-probability support */
export interface ModelCapabilityCache {
  model: string;
  supportsLogProbs: boolean;
  testedAt: string;
  ollamaVersion?: string;
}

/** Result for a single CrowS-Pairs sentence pair. */
export interface CrowsPairsPairResult {
  pairId: number | null;
  stereotype: string;
  antiStereotype: string;
  biasType: string | null;
  stereotypeLogProb: number;
  antiStereotypeLogProb: number;
  biasScore: number;
  biasDirection: "stereotype" | "anti-stereotype" | "neutral";
  method: SequenceLogProbMethod;
  /** Number of scored tokens (BOS excluded) in the stereotype sentence. */
  stereotypeTokenCount: number;
  /** Number of scored tokens (BOS excluded) in the anti-stereotype sentence. */
  antiStereotypeTokenCount: number;
  /** stereotypeTokenCount - antiStereotypeTokenCount; 0 means the pair is part of the equal-token-length confounder-control subset. */
  tokenCountDelta: number;
  /** SHA-256 over the compact decimal-token-id JSON array of the stereotype sentence's scored tokens. */
  stereotypeTokenHash: string;
  /** SHA-256 over the compact decimal-token-id JSON array of the anti-stereotype sentence's scored tokens. */
  antiStereotypeTokenHash: string;
}

/** Aggregate over all pairs sharing one bias type. */
export interface CrowsPairsBiasTypeSummary {
  biasType: string;
  pairsCount: number;
  stereotypePreferenceCount: number;
  stereotypePreferencePercent: number;
  averageBiasScore: number;
}

/** A pair that was selected for measurement but whose scoring failed (allowPartial runs only). */
export interface CrowsPairsFailedPair {
  pairId: number | null;
  reason: string;
}

/** CrowS-Pairs bias calculation result */
export interface CrowsPairsBiasResult {
  score: number;
  method: SequenceLogProbMethod;
  pairsAnalyzed: number;
  stereotypicalPreference: number; // percentage
  /** One entry per analysed pair. Empty only if nothing could be analysed. */
  pairResults: CrowsPairsPairResult[];
  /** Per-category aggregates. The whole point: the overall score hides these. */
  byBiasType: CrowsPairsBiasTypeSummary[];
  /**
   * "complete": every selected pair was analysed. "partial": at least one pair
   * failed and `allowPartial` was set — this run is a diagnostic, not a full
   * measurement. Fail-closed by default: without `allowPartial`, any failure
   * aborts the whole run rather than producing a "partial" result.
   */
  runStatus: "complete" | "partial";
  /** Pairs selected for measurement after dataset-extraction filtering. */
  selectedCount: number;
  /** Pairs successfully measured; the statistical denominator for score/preference. */
  analyzedCount: number;
  /** Pairs selected but that failed measurement (only possible with allowPartial). */
  failedCount: number;
  /** One entry per failed pair. Invariant: selectedCount === analyzedCount + failedCount. */
  failedPairs: CrowsPairsFailedPair[];
  metadata: {
    engine: "browser" | "ollama";
    model: string;
    timestamp: string;
  };
}

/** Configuration for bias test execution */
export interface BiasTestConfig {
  dataset: CrowsPairsEntry[];
  model: string;
  engine: "browser" | "ollama";
  /**
   * Diagnostic mode: a pair that fails measurement is recorded in `failedPairs`
   * instead of aborting the whole run. NOT suitable as a complete measurement —
   * see `runStatus: "partial"`. Default: false (fail-closed).
   */
  allowPartial?: boolean;
}

/** Annex IV Technical Documentation Report */
export interface AnnexIVReport {
  version: string;
  generatedAt: string;
  provider: {
    name: string;
    address?: string;
    contact?: string;
  };
  system: {
    name: string;
    intendedPurpose: string;
    riskLevel: RiskLevel;
    category?: HighRiskCategory;
  };
  technicalSpecs: {
    architecture?: string;
    trainingData?: string;
    inputFormat?: string;
    outputFormat?: string;
  };
  riskAssessment: RiskAssessment;
  biasTests?: BiasTestResult[];
  biasMethodology?: {
    method: BiasCalculationMethod;
    engine: "browser" | "ollama";
    dataset: string;
    citation: string;
    description: string;
  };
  complianceStatus: "compliant" | "non-compliant" | "pending";
}
