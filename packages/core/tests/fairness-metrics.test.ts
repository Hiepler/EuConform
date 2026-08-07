import { describe, expect, it } from "vitest";
import {
  disparateImpact,
  equalizedOdds,
  generateLoanDataset,
  predictiveParity,
  runComprehensiveBiasAnalysis,
  runCrowsPairsBiasAnalysis,
  runFairnessAnalysis,
  statisticalParityDifference,
} from "../src/fairness-metrics";
import type { SequenceLogProbProvider } from "../src/inference";
import type { ScoredLogProb } from "../src/inference/transformers-inference";
import type { BiasTestConfig, PredictionData } from "../src/types";

/** A provider whose scoring always throws — used to prove failures propagate. */
const alwaysFailingProvider: SequenceLogProbProvider = {
  getScoredLogProb: async (): Promise<ScoredLogProb> => {
    throw new Error("measurement unavailable");
  },
};

const alwaysSucceedingProvider: SequenceLogProbProvider = {
  getScoredLogProb: async (text: string): Promise<ScoredLogProb> => ({
    score: text.includes("stereo") ? -1 : -2,
    scoredTokenIds: [],
    span: { start: 0, end: 0 },
    contextTokenHash: "test-hash",
    provenance: {
      modelId: "test-model",
      dtypeInfo: "float32",
      backend: "test",
      libraryVersion: "test",
    },
  }),
};

const config: BiasTestConfig = {
  dataset: [
    { id: 1, sent_more: "stereo sentence", sent_less: "anti sentence", bias_type: "gender" },
  ],
  model: "test-model",
  engine: "browser",
};

describe("Fairness Metrics", () => {
  describe("disparateImpact", () => {
    it("should return 1.0 for perfectly fair predictions", () => {
      const data: PredictionData[] = [
        { prediction: 1, protectedGroup: "A" },
        { prediction: 0, protectedGroup: "A" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 0, protectedGroup: "B" },
      ];

      const result = disparateImpact(data);
      expect(result.value).toBe(1);
      expect(result.passed).toBe(true);
    });

    it("should detect bias when one group has lower positive rate", () => {
      const data: PredictionData[] = [
        // Group A: 75% positive
        { prediction: 1, protectedGroup: "A" },
        { prediction: 1, protectedGroup: "A" },
        { prediction: 1, protectedGroup: "A" },
        { prediction: 0, protectedGroup: "A" },
        // Group B: 25% positive
        { prediction: 0, protectedGroup: "B" },
        { prediction: 0, protectedGroup: "B" },
        { prediction: 0, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
      ];

      const result = disparateImpact(data);
      expect(result.value).toBeCloseTo(0.333, 2);
      expect(result.passed).toBe(false);
    });

    it("should pass when ratio is above 0.8 threshold", () => {
      const data: PredictionData[] = [
        // Group A: 100% positive
        { prediction: 1, protectedGroup: "A" },
        { prediction: 1, protectedGroup: "A" },
        // Group B: 90% positive
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 0, protectedGroup: "B" },
      ];

      const result = disparateImpact(data);
      expect(result.passed).toBe(true);
    });
  });

  describe("statisticalParityDifference", () => {
    it("should return 0 for equal rates", () => {
      const data: PredictionData[] = [
        { prediction: 1, protectedGroup: "A" },
        { prediction: 0, protectedGroup: "A" },
        { prediction: 1, protectedGroup: "B" },
        { prediction: 0, protectedGroup: "B" },
      ];

      const result = statisticalParityDifference(data);
      expect(result.value).toBe(0);
      expect(result.passed).toBe(true);
    });

    it("should detect large differences in rates", () => {
      const data: PredictionData[] = [
        { prediction: 1, protectedGroup: "A" },
        { prediction: 1, protectedGroup: "A" },
        { prediction: 0, protectedGroup: "B" },
        { prediction: 0, protectedGroup: "B" },
      ];

      const result = statisticalParityDifference(data);
      expect(result.value).toBe(1); // 100% - 0% = 100%
      expect(result.passed).toBe(false);
    });
  });

  describe("equalizedOdds", () => {
    it("should require labels for calculation", () => {
      const data: PredictionData[] = [
        { prediction: 1, protectedGroup: "A" },
        { prediction: 0, protectedGroup: "B" },
      ];

      const result = equalizedOdds(data);
      expect(result.passed).toBe(false);
      expect(result.description).toContain("labels required");
    });

    it("should calculate with labels present", () => {
      const data: PredictionData[] = [
        { prediction: 1, label: 1, protectedGroup: "A" },
        { prediction: 0, label: 0, protectedGroup: "A" },
        { prediction: 1, label: 1, protectedGroup: "B" },
        { prediction: 0, label: 0, protectedGroup: "B" },
      ];

      const result = equalizedOdds(data);
      expect(result.value).toBe(0);
      expect(result.passed).toBe(true);
    });
  });

  describe("predictiveParity", () => {
    it("should require labels for calculation", () => {
      const data: PredictionData[] = [{ prediction: 1, protectedGroup: "A" }];

      const result = predictiveParity(data);
      expect(result.passed).toBe(false);
    });

    it("should pass when precision is equal across groups", () => {
      const data: PredictionData[] = [
        // Group A: 2 TP, 1 FP = 66.7% precision
        { prediction: 1, label: 1, protectedGroup: "A" },
        { prediction: 1, label: 1, protectedGroup: "A" },
        { prediction: 1, label: 0, protectedGroup: "A" },
        // Group B: 2 TP, 1 FP = 66.7% precision
        { prediction: 1, label: 1, protectedGroup: "B" },
        { prediction: 1, label: 1, protectedGroup: "B" },
        { prediction: 1, label: 0, protectedGroup: "B" },
      ];

      const result = predictiveParity(data);
      expect(result.value).toBeCloseTo(0, 2);
      expect(result.passed).toBe(true);
    });
  });

  describe("runFairnessAnalysis", () => {
    it("should return all metrics", () => {
      const data: PredictionData[] = [
        { prediction: 1, label: 1, protectedGroup: "A" },
        { prediction: 0, label: 0, protectedGroup: "B" },
      ];

      const result = runFairnessAnalysis(data, "test-model", "gender");

      expect(result.modelId).toBe("test-model");
      expect(result.protectedAttribute).toBe("gender");
      expect(result.metrics).toHaveLength(4);
      expect(result.samplesAnalyzed).toBe(2);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("generateLoanDataset", () => {
    it("should generate specified number of samples", () => {
      const data = generateLoanDataset(100);
      expect(data).toHaveLength(100);
    });

    it("should include all required fields", () => {
      const data = generateLoanDataset(10);
      for (const item of data) {
        expect(item.prediction).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.protectedGroup).toBeDefined();
      }
    });

    it("should have multiple protected groups", () => {
      const data = generateLoanDataset(1000);
      const groups = new Set(data.map((d) => d.protectedGroup));
      expect(groups.size).toBeGreaterThan(1);
    });
  });

  /**
   * These entry points used to catch ANY calculateCrowsPairsBias failure —
   * including the core's intentional fail-closed abort — and return a
   * fabricated BiasTestResult (overallPassed: false, samplesAnalyzed: 0,
   * method: "logprobs_fallback_latency") instead of propagating it. That is
   * exactly the silent-fallback pattern this remediation removes: a failed
   * measurement must never look like a plausible result object.
   */
  describe("runCrowsPairsBiasAnalysis", () => {
    it("returns a real result when measurement succeeds", async () => {
      const result = await runCrowsPairsBiasAnalysis(config, alwaysSucceedingProvider);
      expect(result.crowsPairsResult).toBeDefined();
      expect(result.samplesAnalyzed).toBe(1);
    });

    it("propagates a measurement failure instead of fabricating a result", async () => {
      await expect(runCrowsPairsBiasAnalysis(config, alwaysFailingProvider)).rejects.toThrow();
    });
  });

  describe("runComprehensiveBiasAnalysis", () => {
    it("returns a real result when measurement succeeds", async () => {
      const result = await runComprehensiveBiasAnalysis(
        [],
        config,
        alwaysSucceedingProvider,
        "gender"
      );
      expect(result.crowsPairsResult).toBeDefined();
    });

    it("propagates a measurement failure instead of fabricating or falling back to traditional-only metrics", async () => {
      const predictionData: PredictionData[] = [
        { prediction: 1, protectedGroup: "A" },
        { prediction: 0, protectedGroup: "B" },
      ];
      await expect(
        runComprehensiveBiasAnalysis(predictionData, config, alwaysFailingProvider, "gender")
      ).rejects.toThrow();
    });
  });
});
