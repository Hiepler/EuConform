/**
 * Wizard Type Definitions
 * Centralized types for the EU AI Act compliance wizard flow
 */

import type {
  CrowsPairsLogProbResult,
  GPAIComplianceResult,
  InferenceClient,
  InferenceFactory,
  ModelCapability,
  QuizAnswer,
  QuizQuestion,
  RiskAssessment,
} from "@euconform/core";

/**
 * Wizard step type union representing each screen in the compliance flow
 */
export type WizardStep =
  | "intro"
  | "model-select"
  | "quiz"
  | "bias-test"
  | "results"
  | "gpai-quiz"
  | "scan-viewer";

/**
 * User role for branching between Annex III and GPAI provider paths
 */
export type UserRole = "annex-iii" | "gpai-provider" | null;

/**
 * Model loading status for inference client initialization
 */
export type ModelLoadingStatus = "idle" | "loading" | "loaded" | "error";

/**
 * Inference engine selection type
 */
export type InferenceEngine = "ollama" | "browser" | "demo";

/**
 * Complete wizard state interface containing all state properties
 */
export interface WizardState {
  /** Current step in the wizard flow */
  step: WizardStep;
  /** User role: annex-iii (default) or gpai-provider */
  userRole: UserRole;
  /** Selected inference engine (ollama, browser, or demo) */
  selectedEngine: InferenceEngine;
  /** Selected model identifier */
  selectedModel: string;
  /** Full capability information for the selected model */
  selectedCapability: ModelCapability | null;
  /** Legacy inference client for bias testing */
  inferenceClient: InferenceClient | null;
  /** Enhanced inference factory with capability tracking */
  inferenceFactory: InferenceFactory | null;
  /** Current question index in the quiz (0-based) */
  currentQuestion: number;
  /** Array of user answers to quiz questions */
  answers: QuizAnswer[];
  /** Risk assessment result after quiz completion */
  assessment: RiskAssessment | null;
  /** Current question index in the GPAI quiz (0-based) */
  gpaiCurrentQuestion: number;
  /** Array of user answers to GPAI quiz questions */
  gpaiAnswers: QuizAnswer[];
  /** GPAI compliance result after GPAI quiz completion */
  gpaiAssessment: GPAIComplianceResult | null;
  /** Whether bias test is currently running */
  isRunningBiasTest: boolean;
  /** Bias test progress percentage (0-100) */
  biasProgress: number;
  /** Current step description during bias test */
  biasCurrentStep: string;
  /** Bias test result after completion */
  biasResult: CrowsPairsLogProbResult | null;
  /** Model loading status for inference client */
  modelLoadingStatus: ModelLoadingStatus;
  /** Error message if any operation failed */
  error: string | null;
  /** Whether PDF generation is in progress */
  isGeneratingPdf: boolean;
}

/**
 * Wizard actions interface containing all handler functions
 */
export interface WizardActions {
  /** Navigate to a specific wizard step */
  setStep: (step: WizardStep) => void;
  /** Handle inference engine selection */
  handleEngineSelect: (engine: InferenceEngine) => void;
  /** Handle model selection from capability list */
  handleModelSelect: (capability: ModelCapability) => void;
  /** Start the quiz after model selection (branches on userRole) */
  handleStartQuiz: () => void;
  /** Handle quiz answer submission */
  handleAnswer: (value: string) => void;
  /** Handle GPAI quiz answer submission */
  handleGpaiAnswer: (value: string) => void;
  /** Select GPAI provider role and navigate to model-select */
  handleSelectGpaiRole: (engine: InferenceEngine) => void;
  /** Execute the bias test */
  handleRunBiasTest: () => Promise<void>;
  /** Skip bias test and proceed to results */
  handleSkipBiasTest: () => void;
  /** Generate and download PDF report */
  handleGeneratePdf: () => Promise<void>;
  /** Download Annex IV JSON report */
  handleDownloadAnnexIvJson: () => void;
  /** Reset wizard to initial state */
  resetAll: () => void;
}

/**
 * Extended wizard state with derived values
 */
export interface ExtendedWizardState extends WizardState {
  /** Detected inference capabilities */
  capabilities: import("@euconform/core").InferenceCapabilities | null;
  /** Annex III quiz questions */
  questions: QuizQuestion[];
  /** Total number of Annex III quiz questions */
  totalQuestions: number;
  /** GPAI compliance quiz questions */
  gpaiQuestions: QuizQuestion[];
  /** Total number of GPAI quiz questions */
  gpaiTotalQuestions: number;
}

/**
 * Extended wizard actions with navigation helpers
 */
export interface ExtendedWizardActions extends WizardActions {
  /** Navigate back to model selection and reset quiz state */
  navigateBackToModelSelect: () => void;
  /** Navigate to previous question in quiz */
  navigateToPreviousQuestion: () => void;
  /** Navigate back to intro and reset role selection */
  navigateBackToIntro: () => void;
  /** Navigate back from GPAI quiz to model-select */
  navigateGpaiBack: () => void;
  /** Navigate to previous question in GPAI quiz */
  navigateToPreviousGpaiQuestion: () => void;
  /** Direct setter for selected engine */
  setSelectedEngine: (engine: InferenceEngine) => void;
  /** Direct setter for selected model */
  setSelectedModel: (model: string) => void;
  /** Direct setter for error state */
  setError: (error: string | null) => void;
}

/**
 * Combined wizard hook return type
 */
export type UseComplianceWizardReturn = ExtendedWizardState & ExtendedWizardActions;
