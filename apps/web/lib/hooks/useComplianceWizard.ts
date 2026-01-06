"use client";

/**
 * useComplianceWizard Hook
 * Centralized state management for the EU AI Act compliance wizard flow
 *
 * This hook encapsulates all state variables and handler functions for the
 * compliance wizard, separating business logic from presentation.
 */

import {
  AI_ACT_SOURCES,
  type BiasCalculationMethod,
  type CrowsPairsLogProbResult,
  type InferenceCapabilities,
  type InferenceClient,
  type InferenceFactory,
  type ModelCapability,
  type QuizAnswer,
  type RiskAssessment,
  type RiskLevel,
  type StereotypePair,
  buildAnnexIVReportV1,
  classifyAnnexIIIRisk,
  createInferenceClient,
  createInferenceFactory,
  detectCapabilities,
  getAnnexIIIQuestions,
  getHumanOversightAndLoggingTemplate,
  runCrowsPairsLogProbTest,
} from "@euconform/core";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import type {
  InferenceEngine,
  ModelLoadingStatus,
  UseComplianceWizardReturn,
  WizardStep,
} from "../types/wizard";

/**
 * Custom hook for managing the compliance wizard state and actions
 * @returns Combined wizard state and action handlers
 */
export function useComplianceWizard(): UseComplianceWizardReturn {
  const { t, language } = useLanguage();

  // ============================================================================
  // State Declarations
  // ============================================================================

  // Navigation state
  const [step, setStep] = useState<WizardStep>("intro");

  // Capabilities and engine state
  const [capabilities, setCapabilities] = useState<InferenceCapabilities | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<InferenceEngine>("ollama");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedCapability, setSelectedCapability] = useState<ModelCapability | null>(null);

  // Inference clients
  const [inferenceClient, setInferenceClient] = useState<InferenceClient | null>(null);
  const [inferenceFactory, setInferenceFactory] = useState<InferenceFactory | null>(null);

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

  // Bias test state
  const [isRunningBiasTest, setIsRunningBiasTest] = useState(false);
  const [biasProgress, setBiasProgress] = useState(0);
  const [biasCurrentStep, setBiasCurrentStep] = useState<string>("");
  const [biasResult, setBiasResult] = useState<CrowsPairsLogProbResult | null>(null);

  // Loading and error state
  const [modelLoadingStatus, setModelLoadingStatus] = useState<ModelLoadingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Annex III questions
  const questions = getAnnexIIIQuestions();

  // ============================================================================
  // Effects
  // ============================================================================

  // Detect capabilities on mount
  useEffect(() => {
    detectCapabilities().then(setCapabilities);
  }, []);

  // ============================================================================
  // Handler Functions
  // ============================================================================

  /**
   * Handle inference engine selection
   */
  const handleEngineSelect = useCallback(
    (engine: InferenceEngine) => {
      setSelectedEngine(engine);
      if (engine === "ollama" && capabilities?.ollama.models[0]) {
        setSelectedModel(capabilities.ollama.models[0].name);
      } else if (engine === "browser") {
        setSelectedModel("Xenova/distilgpt2");
      }
    },
    [capabilities]
  );

  /**
   * Handle model selection from capability list
   */
  const handleModelSelect = useCallback((capability: ModelCapability) => {
    setSelectedCapability(capability);
    setSelectedModel(capability.modelId);
    setSelectedEngine(capability.engine);
  }, []);

  /**
   * Start the quiz after model selection
   */
  const handleStartQuiz = useCallback(() => {
    // Validate that we have a selected model with available capability
    if (!selectedCapability || selectedCapability.status !== "available") {
      setError("Please select an available model before continuing");
      return;
    }

    // Create both the legacy client and the enhanced factory
    const client = createInferenceClient(selectedEngine, selectedModel, (status: string) => {
      setModelLoadingStatus(status as ModelLoadingStatus);
    });

    const factory = createInferenceFactory((status: string) => {
      setModelLoadingStatus(status as ModelLoadingStatus);
    });

    // Set capability information in the factory
    factory.setSelectedCapability(selectedCapability);

    setInferenceClient(client);
    setInferenceFactory(factory);
    setStep("quiz");
  }, [selectedCapability, selectedEngine, selectedModel]);

  const handleAnswer = useCallback(
    (value: string) => {
      const currentQ = questions[currentQuestion];
      if (!currentQ) return;

      const newAnswers = [
        ...answers.filter((a) => a.questionId !== currentQ.id),
        { questionId: currentQ.id, value },
      ];
      setAnswers(newAnswers);

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        processFinalQuizState(newAnswers);
      }
    },
    [answers, currentQuestion, questions]
  );

  const processFinalQuizState = (newAnswers: QuizAnswer[]) => {
    const annex = classifyAnnexIIIRisk(newAnswers);

    const adapted: RiskAssessment = {
      level: annex.level,
      category: annex.matchedCategories[0],
      score: getScoreForLevel(annex.level),
      flags: [
        ...(annex.level === "high"
          ? [
              {
                type: "warning",
                message: t("high_risk_indicator"),
                articleReference: "Art. 6–7 / Annex III",
              } as const,
            ]
          : []),
        ...annex.prohibitedFlags,
      ],
      recommendations: [
        t("disclaimer_non_legal_advice"),
        ...(annex.notes ?? []),
        t("non_legal_advice_note"),
      ],
      legalBasis: annex.legalBasis.length > 0 ? annex.legalBasis : [t("legal_basis_default")],
    };

    setAssessment(adapted);
    setStep("bias-test");
  };

  const getScoreForLevel = (level: RiskLevel): number => {
    switch (level) {
      case "unacceptable":
        return 100;
      case "high":
        return 80;
      case "limited":
        return 40;
      default:
        return 10;
    }
  };

  const handleRunBiasTest = useCallback(async () => {
    if (!inferenceClient || modelLoadingStatus === "loading") return;

    if (selectedCapability && selectedCapability.status !== "available") {
      setError(
        `Selected model ${selectedCapability.modelId} is no longer available (status: ${selectedCapability.status})`
      );
      return;
    }

    resetBiasState();

    try {
      const pairs = await loadBiasDataset();
      await executeBiasTest(pairs);
      setStep("results");
    } catch (err: unknown) {
      handleBiasTestError(err);
    } finally {
      if (step === "bias-test") {
        setIsRunningBiasTest(false);
      }
    }
  }, [inferenceClient, modelLoadingStatus, selectedCapability, step]);

  const resetBiasState = () => {
    setIsRunningBiasTest(true);
    setBiasProgress(0);
    setBiasCurrentStep("");
    setError(null);
  };

  const loadBiasDataset = async (): Promise<StereotypePair[]> => {
    setBiasCurrentStep(t("bias_loading_dataset"));
    const datasetFile =
      language === "de" ? "/datasets/crows-pairs-de.json" : "/datasets/crows-pairs-en.json";

    const response = await fetch(datasetFile);
    if (!response.ok) throw new Error("Failed to load dataset");

    const data = await response.json();
    return data.pairs;
  };

  const executeBiasTest = async (pairs: StereotypePair[]) => {
    setBiasCurrentStep(t("bias_initializing_model"));
    await new Promise((resolve) => setTimeout(resolve, 500));

    setBiasCurrentStep(t("bias_analyzing_pairs"));
    if (!inferenceClient) return;

    const result = await runCrowsPairsLogProbTest(inferenceClient, pairs, {
      maxPairs: language === "de" ? 20 : 30,
      seed: 42,
      onProgress: (completed, total) => {
        setBiasProgress(Math.round((completed / total) * 100));
      },
    });

    setBiasCurrentStep(t("bias_finalizing"));
    setBiasProgress(100);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setBiasResult(result);
  };

  const handleBiasTestError = (err: unknown) => {
    console.error("Bias test failed:", err);
    const errorMessage = err instanceof Error ? err.message : t("bias_error_unexpected");

    if (errorMessage.includes("not found") || errorMessage.includes("unavailable")) {
      setError(`${errorMessage} - The selected model may no longer be available.`);
    } else {
      setError(errorMessage);
    }
    setIsRunningBiasTest(false);
  };

  /**
   * Skip bias test and proceed to results
   */
  const handleSkipBiasTest = useCallback(() => {
    setStep("results");
  }, []);

  const handleGeneratePdf = useCallback(async () => {
    if (!assessment) return;
    setIsGeneratingPdf(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      drawPdfHeader(page, fontBold, font);
      drawPdfRiskSection(page, fontBold, font);
      if (biasResult) drawPdfBiasSection(page, fontBold, font);
      drawPdfFooter(page, font);

      await downloadPdf(pdfDoc);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [assessment, biasResult]);

  const drawPdfHeader = (page: PDFPage, fontBold: PDFFont, font: PDFFont) => {
    const { height } = page.getSize();
    let y = height - 50;

    page.drawText(`${t("title")} - EU AI Act Compliance Report`, {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0, 0.2, 0.6),
    });
    y -= 40;

    const disclaimer = t("disclaimer_non_legal_advice");
    page.drawText(t("no_legal_advice_title_pdf"), {
      x: 50,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
    page.drawText(disclaimer.slice(0, 95) + (disclaimer.length > 95 ? "…" : ""), {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 26;

    page.drawText(`${t("pdf_model")}: ${selectedModel || t("pdf_not_specified")}`, {
      x: 50,
      y,
      size: 12,
      font: fontBold,
    });
    y -= 20;
    page.drawText(`${t("pdf_engine")}: ${selectedEngine}`, { x: 50, y, size: 10, font });
    y -= 20;
    page.drawText(`${t("pdf_generated")}: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    return y - 40;
  };

  const drawPdfRiskSection = (page: PDFPage, fontBold: PDFFont, font: PDFFont) => {
    const { height } = page.getSize();
    let y = height - 210; // Approx y after header

    page.drawText(t("risk_classification_title"), { x: 50, y, size: 14, font: fontBold });
    y -= 20;
    page.drawText(`${t("pdf_level")}: ${assessment?.level.toUpperCase()}`, {
      x: 50,
      y,
      size: 12,
      font,
    });
    y -= 15;
    page.drawText(`${t("pdf_score")}: ${assessment?.score}/100`, { x: 50, y, size: 12, font });
    return y - 30;
  };

  const drawPdfBiasSection = (page: PDFPage, fontBold: PDFFont, font: PDFFont) => {
    if (!biasResult) return;
    const { height } = page.getSize();
    let y = height - 300; // Approx y after risk

    page.drawText(t("bias_fairness_title_pdf"), { x: 50, y, size: 14, font: fontBold });
    y -= 20;

    y = drawPdfMethodology(page, fontBold, font, y);
    y = drawPdfMetrics(page, font, y);

    return y;
  };

  const drawPdfMethodology = (page: PDFPage, fontBold: PDFFont, font: PDFFont, startY: number) => {
    if (!biasResult) return startY;
    let y = startY;

    page.drawText(t("pdf_methodology"), { x: 50, y, size: 12, font: fontBold });
    y -= 15;

    const methodologyText =
      biasResult.methodology === "logits"
        ? t("pdf_methodology_logprobs")
        : biasResult.methodology === "latency-proxy"
          ? t("pdf_methodology_latency")
          : `${t("pdf_methodology_default")} ${biasResult.methodology}`;

    page.drawText(methodologyText, { x: 60, y, size: 10, font });
    y -= 15;
    page.drawText(t("pdf_dataset"), { x: 60, y, size: 10, font });
    y -= 15;
    page.drawText(t("pdf_citation"), { x: 60, y, size: 10, font });
    y -= 25;

    page.drawText(t("bias_disclaimer"), { x: 50, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;
    return y;
  };

  const drawPdfMetrics = (page: PDFPage, font: PDFFont, startY: number) => {
    if (!biasResult) return startY;
    let y = startY;

    page.drawText(
      `${t("results_score")}: ${biasResult.overall.stereotypePreferencePercent.toFixed(1)}%`,
      { x: 60, y, size: 10, font }
    );
    y -= 15;
    page.drawText(
      `${t("pdf_status")}: ${biasResult.overall.passed ? t("results_passed") : t("results_failed")}`,
      { x: 60, y, size: 10, font }
    );
    y -= 15;
    page.drawText(
      `${t("pdf_severity")}: ${biasResult.overall.severity === "strong" ? t("results_severity_strong") : biasResult.overall.severity === "light" ? t("results_severity_light") : t("pdf_severity_none")}`,
      { x: 60, y, size: 10, font }
    );
    y -= 30;

    for (const cat of biasResult.byBiasType) {
      const status = cat.passed ? "[OK]" : "[X]";
      page.drawText(
        `${status} ${cat.biasType}: ${cat.stereotypePreferencePercent.toFixed(0)}% pref.`,
        { x: 60, y, size: 9, font }
      );
      y -= 12;
    }
    return y;
  };

  const drawPdfFooter = (page: PDFPage, font: PDFFont) => {
    page.drawText(t("pdf_generated_by"), {
      x: 50,
      y: 30,
      size: 8,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  };

  const downloadPdf = async (pdfDoc: PDFDocument) => {
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aimpact-report-${selectedModel.replace(/[/:]/g, "-")}-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAnnexIvJson = useCallback(() => {
    if (!assessment) return;
    const annex = classifyAnnexIIIRisk(answers);
    const report = buildAnnexIVReportV1({
      tool: { name: "EuConform" },
      disclaimer: t("disclaimer_non_legal_advice"),
      legalSources: AI_ACT_SOURCES,
      reproducibility: getReproducibilityData(),
      provider: { name: t("annex_iv_provider") },
      system: {
        name: selectedModel || t("annex_iv_unspecified_system"),
        intendedPurpose: t("annex_iv_intended_purpose"),
        riskLevel: assessment.level,
        annexIII: annex,
      },
      humanOversight: {
        humanOversight: getHumanOversightAndLoggingTemplate(assessment.level),
        loggingNotes: [t("annex_iv_logging_notes")],
      },
      performanceAndFairness: {
        biasAndFairness: biasResult ? [biasResult] : [],
        thresholdsAndInterpretationNotes: [
          t("annex_iv_disparate_impact"),
          t("annex_iv_crows_pairs_note"),
        ],
      },
      biasMethodology: getBiasMethodologyData(),
    });

    downloadJson(report);
  }, [answers, assessment, biasResult, selectedModel, t]);

  const getReproducibilityData = () => {
    const seed = biasResult?.dataset?.seed;
    if (!seed) return { notes: [t("annex_iv_no_seed")] };
    return {
      seed,
      notes: [
        `CrowS-Pairs sampling seed: ${seed}`,
        `Max pairs: ${biasResult?.dataset?.maxPairs ?? "n/a"}`,
      ],
    };
  };

  const getBiasMethodologyData = () => {
    if (!biasResult) return undefined;
    return {
      method: (biasResult.methodology === "logits"
        ? "logprobs_exact"
        : biasResult.methodology === "latency-proxy"
          ? "logprobs_fallback_latency"
          : "logprobs_exact") as BiasCalculationMethod,
      engine: biasResult.engine === "browser" ? ("browser" as const) : ("ollama" as const),
      dataset: "CrowS-Pairs (German adaptation)",
      citation: "Nangia, N., Vania, C., Bhalerao, R., & Bowman, S. R. (2020). CrowS-Pairs.",
      description:
        biasResult.methodology === "logits"
          ? t("annex_bias_logprobs_desc")
          : biasResult.methodology === "latency-proxy"
            ? t("annex_bias_latency_desc")
            : t("annex_bias_default_desc"),
    };
  };

  const downloadJson = (report: unknown) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aimpact-annex-iv-${(selectedModel || "system").replace(/[/:]/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Reset wizard to initial state
   */
  const resetAll = useCallback(() => {
    setStep("intro");
    setSelectedEngine("ollama");
    setSelectedModel("");
    setSelectedCapability(null);
    setInferenceClient(null);
    setInferenceFactory(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setAssessment(null);
    setBiasResult(null);
    setBiasProgress(0);
    setModelLoadingStatus("idle");
    setError(null);
  }, []);

  // ============================================================================
  // Additional Exposed State Setters (for screen components)
  // ============================================================================

  /**
   * Navigate back to model selection and reset quiz state
   */
  const navigateBackToModelSelect = useCallback(() => {
    setStep("model-select");
    setInferenceClient(null);
    setInferenceFactory(null);
    setModelLoadingStatus("idle");
    setCurrentQuestion(0);
    setAnswers([]);
    setAssessment(null);
    setBiasResult(null);
    setError(null);
  }, []);

  /**
   * Navigate to previous question in quiz
   */
  const navigateToPreviousQuestion = useCallback(() => {
    setCurrentQuestion((prev) => Math.max(0, prev - 1));
  }, []);

  // ============================================================================
  // Return Combined State and Actions
  // ============================================================================

  return {
    // State
    step,
    selectedEngine,
    selectedModel,
    selectedCapability,
    inferenceClient,
    inferenceFactory,
    currentQuestion,
    answers,
    assessment,
    isRunningBiasTest,
    biasProgress,
    biasCurrentStep,
    biasResult,
    modelLoadingStatus,
    error,
    isGeneratingPdf,

    // Derived state
    capabilities,
    questions,
    totalQuestions: questions.length,

    // Actions
    setStep,
    handleEngineSelect,
    handleModelSelect,
    handleStartQuiz,
    handleAnswer,
    handleRunBiasTest,
    handleSkipBiasTest,
    handleGeneratePdf,
    handleDownloadAnnexIvJson,
    resetAll,

    // Additional navigation helpers
    navigateBackToModelSelect,
    navigateToPreviousQuestion,
    setSelectedEngine,
    setSelectedModel,
    setError,
  };
}
