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
  method: BiasCalculationMethod;
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

/** Model capability cache for log-probability support */
export interface ModelCapabilityCache {
  model: string;
  supportsLogProbs: boolean;
  testedAt: string;
  ollamaVersion?: string;
}

/** CrowS-Pairs bias calculation result */
export interface CrowsPairsBiasResult {
  score: number;
  method: BiasCalculationMethod;
  pairsAnalyzed: number;
  stereotypicalPreference: number; // percentage
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
