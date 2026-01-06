/**
 * @euconform/core - EU AI Act Compliance Core Library
 *
 * Risk classification engine and fairness metrics for AI systems
 */

// Types
export type {
  AnnexIVReport,
  BiasTestResult,
  CrowsPairsEntry,
  FairnessMetric,
  HighRiskCategory,
  PredictionData,
  QuizAnswer,
  QuizOption,
  QuizQuestion,
  RiskAssessment,
  RiskFlag,
  RiskLevel,
  BiasCalculationMethod,
  BiasTestConfig,
  CrowsPairsBiasResult,
  ModelCapabilityCache,
} from "./types";

// Legal checks (EU AI Act mappings, non-legal-advice)
export {
  ANNEX_III_QUESTIONS,
  PROHIBITED_AI_SCREENING_QUESTIONS,
  classifyAnnexIIIRisk,
  getAnnexIIIQuestions,
  getProhibitedAIScreeningQuestions,
  AI_ACT_SOURCES,
  METRIC_SOURCES,
  createPerspectiveApiToxicityScorer,
  createTransformersRegardScorer,
  createTransformersToxicityScorer,
  runDataGovernanceChecklist,
  defaultTextPerturbations,
  runTextPerturbationRobustnessTest,
  getHumanOversightAndLoggingTemplate,
  buildAnnexIVReportV1,
  counterfactualFairness,
  demographicParityDifference,
  equalizedOddsDifference,
  runArticle10NumericBiasSuite,
  runCrowsPairsLogProbTest,
  runRegardTest,
  runToxicityTest,
} from "./legal-checks";
export type {
  AnnexIIIAnswer,
  AnnexIIIRiskResult,
  Citation,
  CounterfactualPair,
  CrowsPairsLogProbOptions,
  CrowsPairsLogProbResult,
  ChecklistStatus,
  DataGovernanceChecklistResult,
  RobustnessResult,
  RobustnessTestCase,
  Perturbation,
  PredictTextFn,
  HumanOversightRecommendation,
  LoggingTemplate,
  AnnexIVStructuredReportV1,
  GroupTextSample,
  RegardResult,
  RegardScorer,
  SensitiveAttribute,
  ToxicityResult,
  ToxicityScorer,
} from "./legal-checks";

// Risk Engine
export {
  classifyRisk,
  getComplianceGuidance,
  getQuizQuestions,
  RISK_QUIZ_QUESTIONS,
} from "./risk-engine";

// Fairness Metrics
export {
  disparateImpact,
  equalizedOdds,
  generateLoanDataset,
  predictiveParity,
  runFairnessAnalysis,
  statisticalParityDifference,
  runCrowsPairsBiasAnalysis,
  runComprehensiveBiasAnalysis,
  runCrowsPairsBiasAnalysisWithFactory,
  runComprehensiveBiasAnalysisWithFactory,
} from "./fairness-metrics";

// Inference Layer
export {
  detectOllama,
  listOllamaModels,
  OllamaClient,
  BrowserInference,
  checkWebGPU,
  BROWSER_MODELS,
  detectCapabilities,
  createInferenceClient,
  createAutoInferenceClient,
  createCapabilityDetectionService,
  DefaultCapabilityDetectionService,
  EnhancedCapabilityDetectionService,
  type OllamaModel,
  type BrowserModel,
  type InferenceEngine,
  type InferenceCapabilities,
  type InferenceClient,
  type CapabilityDetectionService,
  type ModelCapability,
  type ModelSelectionState,
  type CapabilityCacheEntry,
  type DetectionProgress,
  type UserPreferences,
  type EnhancedModelSelectionState,
  type CapabilityDetectionStatus,
} from "./inference";

// Inference Factory
export {
  InferenceFactory,
  createInferenceFactory,
  detectBestMethodForConfig,
  type InferenceResult,
} from "./inference/inference-factory";

// Stereotype Bias Metrics
export {
  testPair,
  aggregateByCategory,
  runStereotypeBiasTest,
  quickBiasCheck,
  type StereotypePair,
  type BiasType,
  type PairTestResult,
  type CategoryResult,
  type StereotypeBiasResult,
  calculateCrowsPairsBias,
  calculateLogProbBias,
  calculateLatencyBias,
  validateCrowsPairsDataset,
} from "./metrics";
