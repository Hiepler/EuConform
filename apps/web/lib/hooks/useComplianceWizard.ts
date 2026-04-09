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
  type GPAIComplianceResult,
  type GapAnalysisResult,
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
  classifyGPAICompliance,
  createInferenceClient,
  createInferenceFactory,
  detectCapabilities,
  generateAnnexIIIGapAnalysis,
  generateGPAIGapAnalysis,
  getAnnexIIIQuestions,
  getGPAIQuestions,
  getHumanOversightAndLoggingTemplate,
  runCrowsPairsLogProbTest,
} from "@euconform/core";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import type { NormalizedTestCase } from "../types/custom-test-suite";
import type {
  InferenceEngine,
  ModelLoadingStatus,
  UseComplianceWizardReturn,
  UserRole,
  WizardStep,
} from "../types/wizard";

// Static question lists — defined once at module scope to avoid re-allocation on every render
const ANNEX_III_QUESTIONS = getAnnexIIIQuestions();
const GPAI_QUIZ_QUESTIONS = getGPAIQuestions();

/** Split text into lines of at most maxChars characters (word-aware) */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Custom hook for managing the compliance wizard state and actions
 * @param customTestCases - Optional custom test cases to use instead of default dataset
 * @returns Combined wizard state and action handlers
 */
export function useComplianceWizard(
  customTestCases?: NormalizedTestCase[]
): UseComplianceWizardReturn {
  const { t, language } = useLanguage();

  // ============================================================================
  // State Declarations
  // ============================================================================

  // Navigation state
  const [step, setStep] = useState<WizardStep>("intro");
  const [userRole, setUserRole] = useState<UserRole>(null);

  // Capabilities and engine state
  const [capabilities, setCapabilities] = useState<InferenceCapabilities | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<InferenceEngine>("ollama");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedCapability, setSelectedCapability] = useState<ModelCapability | null>(null);

  // Inference clients
  const [inferenceClient, setInferenceClient] = useState<InferenceClient | null>(null);
  const [inferenceFactory, setInferenceFactory] = useState<InferenceFactory | null>(null);

  // Annex III quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

  // GPAI quiz state
  const [gpaiCurrentQuestion, setGpaiCurrentQuestion] = useState(0);
  const [gpaiAnswers, setGpaiAnswers] = useState<QuizAnswer[]>([]);
  const [gpaiAssessment, setGpaiAssessment] = useState<GPAIComplianceResult | null>(null);

  // Bias test state
  const [isRunningBiasTest, setIsRunningBiasTest] = useState(false);
  const [biasProgress, setBiasProgress] = useState(0);
  const [biasCurrentStep, setBiasCurrentStep] = useState<string>("");
  const [biasResult, setBiasResult] = useState<CrowsPairsLogProbResult | null>(null);

  // Loading and error state
  const [modelLoadingStatus, setModelLoadingStatus] = useState<ModelLoadingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
   * Handle inference engine selection and set a sensible default model
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
   * Select GPAI provider role and navigate to model-select
   */
  const handleSelectGpaiRole = useCallback(
    (engine: InferenceEngine) => {
      setUserRole("gpai-provider");
      handleEngineSelect(engine);
      setStep("model-select");
    },
    [handleEngineSelect]
  );

  /**
   * Start the quiz after model selection.
   * Branches on userRole: "gpai-provider" → "gpai-quiz", else → "quiz"
   */
  const handleStartQuiz = useCallback(() => {
    if (!selectedCapability || selectedCapability.status !== "available") {
      setError("Please select an available model before continuing");
      return;
    }

    const client = createInferenceClient(selectedEngine, selectedModel, (status: string) => {
      setModelLoadingStatus(status as ModelLoadingStatus);
    });

    const factory = createInferenceFactory((status: string) => {
      setModelLoadingStatus(status as ModelLoadingStatus);
    });

    factory.setSelectedCapability(selectedCapability);

    setInferenceClient(client);
    setInferenceFactory(factory);

    if (userRole === "gpai-provider") {
      setStep("gpai-quiz");
    } else {
      setUserRole("annex-iii");
      setStep("quiz");
    }
  }, [selectedCapability, selectedEngine, selectedModel, userRole]);

  const handleAnswer = useCallback(
    (value: string) => {
      const currentQ = ANNEX_III_QUESTIONS[currentQuestion];
      if (!currentQ) return;

      const newAnswers = [
        ...answers.filter((a) => a.questionId !== currentQ.id),
        { questionId: currentQ.id, value },
      ];
      setAnswers(newAnswers);

      if (currentQuestion < ANNEX_III_QUESTIONS.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        processFinalQuizState(newAnswers);
      }
    },
    [answers, currentQuestion]
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

  /**
   * Handle GPAI quiz answer submission.
   * On last question, classifies compliance and navigates to bias-test.
   */
  const handleGpaiAnswer = useCallback(
    (value: string) => {
      const currentQ = GPAI_QUIZ_QUESTIONS[gpaiCurrentQuestion];
      if (!currentQ) return;

      const newAnswers = [
        ...gpaiAnswers.filter((a) => a.questionId !== currentQ.id),
        { questionId: currentQ.id, value },
      ];
      setGpaiAnswers(newAnswers);

      if (gpaiCurrentQuestion < GPAI_QUIZ_QUESTIONS.length - 1) {
        setGpaiCurrentQuestion((prev) => prev + 1);
      } else {
        const result = classifyGPAICompliance(newAnswers);
        setGpaiAssessment(result);
        setStep("bias-test");
      }
    },
    [gpaiAnswers, gpaiCurrentQuestion]
  );

  const convertToStereotypePairs = useCallback(
    (testCases: NormalizedTestCase[]): StereotypePair[] => {
      return testCases.map((tc) => ({
        id: tc.id,
        stereotype: tc.prompt,
        antiStereotype: tc.prompt,
        biasType: "socioeconomic" as const,
        attribute: tc.label ?? undefined,
      }));
    },
    []
  );

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
      const pairs =
        customTestCases && customTestCases.length > 0
          ? convertToStereotypePairs(customTestCases)
          : await loadBiasDataset();
      await executeBiasTest(pairs);
      setStep("results");
    } catch (err: unknown) {
      handleBiasTestError(err);
    } finally {
      if (step === "bias-test") {
        setIsRunningBiasTest(false);
      }
    }
  }, [
    inferenceClient,
    modelLoadingStatus,
    selectedCapability,
    step,
    customTestCases,
    convertToStereotypePairs,
  ]);

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

  const buildPdfPages = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PDF layout requires sequential page-overflow checks per section
    async (pdfDoc: PDFDocument, font: PDFFont, fontBold: PDFFont) => {
      let page = pdfDoc.addPage([595.28, 841.89]);
      let y = drawPdfHeader(page, fontBold, font);

      y = gpaiAssessment
        ? drawPdfGpaiSection(page, fontBold, font, y)
        : drawPdfRiskSection(page, fontBold, font, y);

      if (biasResult) {
        if (y < 200) {
          drawPdfFooter(page, font);
          page = pdfDoc.addPage([595.28, 841.89]);
          y = page.getSize().height - 50;
        }
        y = drawPdfBiasSection(page, fontBold, font, y);
      }

      const gapResult: GapAnalysisResult | null = gpaiAssessment
        ? generateGPAIGapAnalysis(gpaiAssessment)
        : assessment
          ? generateAnnexIIIGapAnalysis(assessment)
          : null;

      if (gapResult && gapResult.totalGaps > 0) {
        if (y < 250) {
          drawPdfFooter(page, font);
          page = pdfDoc.addPage([595.28, 841.89]);
          y = page.getSize().height - 50;
        }
        drawPdfGapSection(page, fontBold, font, y, gapResult);
      }

      drawPdfFooter(page, font);
    },
    [assessment, gpaiAssessment, biasResult]
  );

  const handleGeneratePdf = useCallback(async () => {
    if (!assessment && !gpaiAssessment) return;
    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const [font, fontBold] = await Promise.all([
        pdfDoc.embedFont(StandardFonts.TimesRoman),
        pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      ]);
      await buildPdfPages(pdfDoc, font, fontBold);
      await downloadPdf(pdfDoc);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [assessment, gpaiAssessment, buildPdfPages]);

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
    for (const line of wrapText(disclaimer, 90)) {
      page.drawText(line, { x: 50, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 12;
    }
    y -= 10;

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

  const drawPdfRiskSection = (
    page: PDFPage,
    fontBold: PDFFont,
    font: PDFFont,
    startY: number
  ): number => {
    let y = startY;

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

  const drawPdfGpaiSection = (
    page: PDFPage,
    fontBold: PDFFont,
    font: PDFFont,
    startY: number
  ): number => {
    if (!gpaiAssessment) return startY;
    let y = startY;

    page.drawText("GPAI Compliance Assessment (Art. 53–55)", {
      x: 50,
      y,
      size: 14,
      font: fontBold,
    });
    y -= 20;
    page.drawText(`Level: ${gpaiAssessment.level.replace("-", " ").toUpperCase()}`, {
      x: 50,
      y,
      size: 12,
      font,
    });
    y -= 15;
    page.drawText(
      `Systemic Risk (Art. 51): ${gpaiAssessment.isSystemicRisk ? "Yes – Art. 55 applies" : "No"}`,
      { x: 50, y, size: 10, font }
    );
    y -= 20;

    if (gpaiAssessment.flags.length > 0) {
      page.drawText(`Missing / Partial Obligations (${gpaiAssessment.flags.length}):`, {
        x: 50,
        y,
        size: 11,
        font: fontBold,
      });
      y -= 14;
      for (const flag of gpaiAssessment.flags) {
        page.drawText(`\u2022 ${flag.obligation} \u2013 ${flag.articleRef} [${flag.status}]`, {
          x: 60,
          y,
          size: 9,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= 12;
      }
    } else {
      page.drawText("All checked obligations are implemented.", {
        x: 50,
        y,
        size: 10,
        font,
        color: rgb(0, 0.5, 0.2),
      });
      y -= 14;
    }
    return y - 20;
  };

  const drawPdfBiasSection = (
    page: PDFPage,
    fontBold: PDFFont,
    font: PDFFont,
    startY: number
  ): number => {
    if (!biasResult) return startY;
    let y = startY;

    page.drawText(t("bias_fairness_title_pdf"), { x: 50, y, size: 14, font: fontBold });
    y -= 20;

    y = drawPdfMethodology(page, fontBold, font, y);
    y = drawPdfMetrics(page, font, y);

    return y;
  };

  const drawPdfGapSection = (
    page: PDFPage,
    fontBold: PDFFont,
    font: PDFFont,
    startY: number,
    gapResult: GapAnalysisResult
  ): number => {
    let y = startY;

    page.drawText(t("gap_analysis_title"), { x: 50, y, size: 14, font: fontBold });
    y -= 14;
    page.drawText(
      `${gapResult.criticalCount} critical \u00b7 ${gapResult.highCount} high \u00b7 ${gapResult.mediumCount} medium`,
      { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) }
    );
    y -= 18;

    const maxActions = 10;
    const shown = gapResult.actions.slice(0, maxActions);

    for (const action of shown) {
      if (y < 70) break;
      const priorityLabel = `[${action.priority.toUpperCase()}]`;
      page.drawText(`${priorityLabel} ${action.title} \u2013 ${action.articleRef}`, {
        x: 60,
        y,
        size: 10,
        font: fontBold,
      });
      y -= 13;
      page.drawText(
        `Status: ${action.status === "missing" ? t("gap_status_missing") : t("gap_status_partial")}`,
        { x: 70, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) }
      );
      y -= 16;
    }

    if (gapResult.actions.length > maxActions) {
      page.drawText(
        `\u2026 and ${gapResult.actions.length - maxActions} more actions (see full report)`,
        { x: 60, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) }
      );
      y -= 14;
    }

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
    const severityLabel =
      biasResult.overall.severity === "strong"
        ? t("results_severity_strong")
        : biasResult.overall.severity === "light"
          ? t("results_severity_light")
          : t("pdf_severity_none");
    page.drawText(`${t("pdf_severity")}: ${severityLabel}`, { x: 60, y, size: 10, font });
    y -= 30;

    return drawPdfBiasCategories(page, font, y);
  };

  const drawPdfBiasCategories = (page: PDFPage, font: PDFFont, startY: number): number => {
    if (!biasResult) return startY;
    let y = startY;
    for (const cat of biasResult.byBiasType) {
      const status = cat.passed ? "\u2713" : "\u2717";
      page.drawText(
        `${status} ${cat.biasType}: ${cat.stereotypePreferencePercent.toFixed(0)}% stereo. pref.`,
        { x: 60, y, size: 9, font, color: cat.passed ? rgb(0, 0.5, 0.2) : rgb(0.7, 0.1, 0.1) }
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
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `euconform-report-${selectedModel.replace(/[/:]/g, "-")}-${Date.now()}.pdf`;
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadAnnexIvJson = useCallback(() => {
    // GPAI path: export GPAI compliance report instead of Annex IV
    if (userRole === "gpai-provider") {
      if (!gpaiAssessment) return;
      const gapResult = generateGPAIGapAnalysis(gpaiAssessment);
      const gpaiReport = {
        meta: {
          reportVersion: "gpai-compliance.v1",
          generatedAt: new Date().toISOString(),
          tool: { name: "EuConform" },
          disclaimer: t("disclaimer_non_legal_advice"),
          legalBasis: gpaiAssessment.legalBasis,
          note: "This is a technical orientation scaffold, not legal advice.",
        },
        model: {
          name: selectedModel || t("annex_iv_unspecified_system"),
          engine: selectedEngine,
        },
        compliance: {
          level: gpaiAssessment.level,
          isSystemicRisk: gpaiAssessment.isSystemicRisk,
          flags: gpaiAssessment.flags,
          notes: gpaiAssessment.notes,
        },
        gapAnalysis: gapResult,
        biasAssessment: biasResult
          ? { result: biasResult, methodology: getBiasMethodologyData() }
          : null,
        reproducibility: getReproducibilityData(),
      };
      downloadJson(gpaiReport);
      return;
    }

    if (!assessment) return;
    const annex = classifyAnnexIIIRisk(answers);
    const gapResult = generateAnnexIIIGapAnalysis(assessment);
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
      gapAnalysis: gapResult,
    });

    downloadJson(report);
  }, [answers, assessment, gpaiAssessment, biasResult, selectedModel, selectedEngine, userRole, t]);

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
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `euconform-annex-iv-${(selectedModel || "system").replace(/[/:]/g, "-")}-${Date.now()}.json`;
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  /**
   * Reset wizard to initial state
   */
  const resetAll = useCallback(() => {
    setStep("intro");
    setUserRole(null);
    setSelectedEngine("ollama");
    setSelectedModel("");
    setSelectedCapability(null);
    setInferenceClient(null);
    setInferenceFactory(null);
    setCurrentQuestion(0);
    setAnswers([]);
    setAssessment(null);
    setGpaiCurrentQuestion(0);
    setGpaiAnswers([]);
    setGpaiAssessment(null);
    setBiasResult(null);
    setBiasProgress(0);
    setModelLoadingStatus("idle");
    setError(null);
  }, []);

  // ============================================================================
  // Additional Exposed State Setters (for screen components)
  // ============================================================================

  /** Shared reset for inference + error state used by all back-navigation handlers */
  const resetSharedState = useCallback(() => {
    setInferenceClient(null);
    setInferenceFactory(null);
    setModelLoadingStatus("idle");
    setBiasResult(null);
    setError(null);
  }, []);

  const resetAnnexIIIQuiz = useCallback(() => {
    setCurrentQuestion(0);
    setAnswers([]);
    setAssessment(null);
  }, []);

  const resetGpaiQuiz = useCallback(() => {
    setGpaiCurrentQuestion(0);
    setGpaiAnswers([]);
    setGpaiAssessment(null);
  }, []);

  const navigateBackToModelSelect = useCallback(() => {
    setStep("model-select");
    resetSharedState();
    resetAnnexIIIQuiz();
  }, [resetSharedState, resetAnnexIIIQuiz]);

  const navigateBackToIntro = useCallback(() => {
    setStep("intro");
    setUserRole(null);
    resetSharedState();
    resetAnnexIIIQuiz();
    resetGpaiQuiz();
  }, [resetSharedState, resetAnnexIIIQuiz, resetGpaiQuiz]);

  const navigateToPreviousQuestion = useCallback(() => {
    setCurrentQuestion((prev) => Math.max(0, prev - 1));
  }, []);

  const navigateGpaiBack = useCallback(() => {
    setStep("model-select");
    resetSharedState();
    resetGpaiQuiz();
  }, [resetSharedState, resetGpaiQuiz]);

  /**
   * Navigate to previous question in GPAI quiz
   */
  const navigateToPreviousGpaiQuestion = useCallback(() => {
    setGpaiCurrentQuestion((prev) => Math.max(0, prev - 1));
  }, []);

  // ============================================================================
  // Return Combined State and Actions
  // ============================================================================

  return {
    // State
    step,
    userRole,
    selectedEngine,
    selectedModel,
    selectedCapability,
    inferenceClient,
    inferenceFactory,
    currentQuestion,
    answers,
    assessment,
    gpaiCurrentQuestion,
    gpaiAnswers,
    gpaiAssessment,
    isRunningBiasTest,
    biasProgress,
    biasCurrentStep,
    biasResult,
    modelLoadingStatus,
    error,
    isGeneratingPdf,

    // Derived state
    capabilities,
    questions: ANNEX_III_QUESTIONS,
    totalQuestions: ANNEX_III_QUESTIONS.length,
    gpaiQuestions: GPAI_QUIZ_QUESTIONS,
    gpaiTotalQuestions: GPAI_QUIZ_QUESTIONS.length,

    // Actions
    setStep,
    handleEngineSelect,
    handleModelSelect,
    handleStartQuiz,
    handleAnswer,
    handleGpaiAnswer,
    handleSelectGpaiRole,
    handleRunBiasTest,
    handleSkipBiasTest,
    handleGeneratePdf,
    handleDownloadAnnexIvJson,
    resetAll,

    // Additional navigation helpers
    navigateBackToModelSelect,
    navigateBackToIntro,
    navigateToPreviousQuestion,
    navigateGpaiBack,
    navigateToPreviousGpaiQuestion,
    setSelectedEngine,
    setSelectedModel,
    setError,
  };
}
