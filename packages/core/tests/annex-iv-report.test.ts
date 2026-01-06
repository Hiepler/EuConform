import { describe, expect, it } from "vitest";
import { buildAnnexIVReportV1 } from "../src/legal-checks/annex-iv-report";
import type { Citation } from "../src/legal-checks/bias-metrics";
import type { BiasCalculationMethod, BiasTestResult, RiskLevel } from "../src/types";

describe("Annex IV Report Generation", () => {
  const mockLegalSources: Citation[] = [
    {
      title: "Verordnung (EU) 2024/1689 (EU AI Act)",
      url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
      type: "regulation",
    },
  ];

  const mockProvider = {
    name: "Test Company GmbH",
    address: "Test Street 123, 12345 Test City",
    contact: "test@example.com",
  };

  const mockSystem = {
    name: "Test AI System",
    intendedPurpose: "Automated decision making for testing",
    deploymentContext: "Internal testing environment",
    userGroups: ["Developers", "QA Engineers"],
    riskLevel: "high" as RiskLevel,
    annexIII: {
      level: "high" as RiskLevel,
      matchedCategories: ["employment-workers"],
      legalBasis: ["Article 6", "Annex III"],
      prohibitedFlags: [],
    },
  };

  describe("buildAnnexIVReportV1", () => {
    it("should generate basic report structure", () => {
      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
      });

      expect(report.meta.reportVersion).toBe("annex-iv.v1");
      expect(report.meta.generatedAt).toBeDefined();
      expect(report.meta.tool.name).toBe("AImpact");
      expect(report.meta.disclaimer).toContain("legally binding conformity assessment");
      expect(report.meta.legalSources).toEqual(mockLegalSources);

      expect(report.section1_generalDescription.provider).toEqual(mockProvider);
      expect(report.section1_generalDescription.system).toEqual(mockSystem);
    });

    it("should include bias methodology when provided", () => {
      const biasMethodology = {
        method: "logprobs_exact" as BiasCalculationMethod,
        engine: "browser" as const,
        dataset: "CrowS-Pairs (German adaptation)",
        citation: "Nangia et al. (2020)",
        description: "Bias-Score berechnet mittels Log-Probability-Differenz",
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        biasMethodology,
      });

      expect(report.section5_performanceAndFairness.biasMethodology).toEqual(biasMethodology);
    });

    it("should include bias test results in performance section", () => {
      const mockBiasResults: BiasTestResult[] = [
        {
          modelId: "test-model",
          timestamp: "2024-01-01T00:00:00.000Z",
          method: "logprobs_exact",
          engine: "browser",
          crowsPairsResult: {
            score: 0.15,
            method: "logprobs_exact",
            pairsAnalyzed: 100,
            stereotypicalPreference: 65.5,
            metadata: {
              engine: "browser",
              model: "test-model",
              timestamp: "2024-01-01T00:00:00.000Z",
            },
          },
          overallPassed: false,
          samplesAnalyzed: 100,
        },
      ];

      const performanceAndFairness = {
        biasAndFairness: mockBiasResults,
        thresholdsAndInterpretationNotes: [
          "CrowS-Pairs bias score > 0.1 indicates potential stereotypical bias",
        ],
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        performanceAndFairness,
      });

      expect(report.section5_performanceAndFairness.biasAndFairness).toEqual(mockBiasResults);
      expect(report.section5_performanceAndFairness.thresholdsAndInterpretationNotes).toContain(
        "CrowS-Pairs bias score > 0.1 indicates potential stereotypical bias"
      );
    });

    it("should document exact log-probability methodology", () => {
      const exactMethodology = {
        method: "logprobs_exact" as BiasCalculationMethod,
        engine: "browser" as const,
        dataset: "CrowS-Pairs (German adaptation)",
        citation:
          "Nangia, N., Vania, C., Bhalerao, R., & Bowman, S. R. (2020). CrowS-Pairs: A Challenge Dataset for Measuring Social Biases in Masked Language Models. EMNLP 2020.",
        description:
          "Bias-Score berechnet mittels Log-Probability-Differenz zwischen stereotypischen und anti-stereotypischen Satzpaaren. Formel: mean(logprob_stereo - logprob_anti)",
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        biasMethodology: exactMethodology,
      });

      const methodology = report.section5_performanceAndFairness.biasMethodology;
      expect(methodology?.method).toBe("logprobs_exact");
      expect(methodology?.description).toContain("Log-Probability-Differenz");
      expect(methodology?.citation).toContain("Nangia");
      expect(methodology?.dataset).toBe("CrowS-Pairs (German adaptation)");
    });

    it("should document latency fallback methodology", () => {
      const fallbackMethodology = {
        method: "logprobs_fallback_latency" as BiasCalculationMethod,
        engine: "ollama" as const,
        dataset: "CrowS-Pairs (German adaptation)",
        citation: "Nangia et al. (2020) - adapted with latency proxy",
        description:
          "Latency-Proxy-Fallback verwendet - Inferenz-Timing als Proxy für Modell-Präferenzen, da Log-Probabilities nicht verfügbar",
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        biasMethodology: fallbackMethodology,
      });

      const methodology = report.section5_performanceAndFairness.biasMethodology;
      expect(methodology?.method).toBe("logprobs_fallback_latency");
      expect(methodology?.description).toContain("Latency-Proxy-Fallback");
      expect(methodology?.engine).toBe("ollama");
    });

    it("should include custom tool information", () => {
      const customTool = {
        name: "EuConform",
        version: "1.2.3",
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        tool: customTool,
      });

      expect(report.meta.tool).toEqual(customTool);
    });

    it("should include reproducibility information", () => {
      const reproducibility = {
        seed: 42,
        notes: [
          "CrowS-Pairs dataset version: 2024-01-01",
          "Model checkpoint: test-model-v1.0",
          "Inference temperature: 0.0",
        ],
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        reproducibility,
      });

      expect(report.meta.reproducibility).toEqual(reproducibility);
    });

    it("should include data governance information", () => {
      const dataManagement = {
        datasets: [
          {
            name: "CrowS-Pairs German",
            description: "German adaptation of CrowS-Pairs bias detection dataset",
            timeframe: "2024",
            license: "CC BY-SA 4.0",
            preprocessing: "Translated and culturally adapted for German context",
            version: "1.0",
            knownLimitations: [
              "Limited to specific bias categories",
              "Cultural adaptation may not cover all German-specific biases",
            ],
          },
        ],
        dataGovernanceChecklist: {
          passed: true,
          checks: [
            { name: "Data quality assessment", passed: true, notes: "Dataset validated" },
            {
              name: "Bias detection in training data",
              passed: true,
              notes: "CrowS-Pairs methodology applied",
            },
          ],
        },
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        dataManagement,
      });

      expect(report.section3_dataManagement).toEqual(dataManagement);
    });

    it("should include technical documentation artifacts", () => {
      const technicalDocumentation = {
        artifacts: [
          {
            name: "Bias Test Results",
            description: "CrowS-Pairs bias assessment results",
            location: "reports/bias-assessment-2024-01-01.json",
          },
          {
            name: "Model Card",
            description: "Detailed model documentation",
            location: "docs/model-card.md",
          },
        ],
        changeLog: [
          { date: "2024-01-01", change: "Initial bias assessment completed" },
          { date: "2024-01-02", change: "Report generated with methodology documentation" },
        ],
        references: [
          ...mockLegalSources,
          {
            title: "CrowS-Pairs: A Challenge Dataset for Measuring Social Biases",
            url: "https://aclanthology.org/2020.emnlp-main.154",
            type: "paper" as const,
          },
        ],
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        technicalDocumentation,
      });

      expect(report.section7_technicalDocumentation).toEqual(technicalDocumentation);
    });

    it("should handle missing optional fields gracefully", () => {
      const minimalReport = buildAnnexIVReportV1({
        provider: { name: "Minimal Company" },
        system: {
          name: "Minimal System",
          intendedPurpose: "Testing",
          riskLevel: "minimal" as RiskLevel,
          annexIII: {
            level: "minimal" as RiskLevel,
            matchedCategories: [],
            legalBasis: [],
            prohibitedFlags: [],
          },
        },
        legalSources: mockLegalSources,
      });

      expect(minimalReport.meta.reportVersion).toBe("annex-iv.v1");
      expect(minimalReport.section1_generalDescription.provider.name).toBe("Minimal Company");
      expect(minimalReport.section5_performanceAndFairness.biasMethodology).toBeUndefined();
    });

    it("should preserve all bias calculation metadata", () => {
      const comprehensiveMethodology = {
        method: "logprobs_exact" as BiasCalculationMethod,
        engine: "browser" as const,
        dataset:
          "CrowS-Pairs (German adaptation) - 100 stereotype pairs covering gender, age, nationality, and profession biases",
        citation:
          "Nangia, N., Vania, C., Bhalerao, R., & Bowman, S. R. (2020). CrowS-Pairs: A Challenge Dataset for Measuring Social Biases in Masked Language Models. In Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing (EMNLP), pages 1953–1967.",
        description:
          "Wissenschaftlich validierte Bias-Messung mittels exakter Log-Probability-Differenz. Berechnung: mean(log P(stereotypical_sentence) - log P(anti_stereotypical_sentence)) über alle Satzpaare. Positive Werte indizieren Bias zugunsten stereotypischer Aussagen.",
      };

      const report = buildAnnexIVReportV1({
        provider: mockProvider,
        system: mockSystem,
        legalSources: mockLegalSources,
        biasMethodology: comprehensiveMethodology,
      });

      const reportedMethodology = report.section5_performanceAndFairness.biasMethodology;
      expect(reportedMethodology).toEqual(comprehensiveMethodology);
      expect(reportedMethodology?.description).toContain("exakter Log-Probability-Differenz");
      expect(reportedMethodology?.citation).toContain("EMNLP");
    });
  });
});
