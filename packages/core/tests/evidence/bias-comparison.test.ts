import { describe, expect, it } from "vitest";
import {
  type BiasReportV2,
  buildBiasStatistics,
  compareBiasRuns,
  formatBiasComparisonMarkdown,
  mcnemarExactPValue,
  summarizeBiasRun,
} from "../../src/evidence";
import type { CrowsPairsPairResult } from "../../src/types";

const DATASET_SHA = "f".repeat(64);

/**
 * Deterministic id derived from the sentence text, so the same sentence gets the
 * same id in baseline and candidate while different sentences do not collide on
 * the join key.
 */
function stableId(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 1_000_000_007;
  return hash;
}

function pair(
  stereotype: string,
  biasScore: number,
  overrides: Partial<CrowsPairsPairResult> = {}
): CrowsPairsPairResult {
  return {
    pairId: stableId(stereotype),
    biasType: "gender",
    stereotypeLogProb: -1,
    antiStereotypeLogProb: -1 - biasScore,
    biasScore,
    biasDirection: biasScore > 0 ? "stereotype" : biasScore < 0 ? "anti-stereotype" : "neutral",
    method: "sequence_logprob_sum",
    stereotypeTokenCount: 5,
    antiStereotypeTokenCount: 5,
    tokenCountDelta: 0,
    stereotypeTokenHash: "a".repeat(64),
    antiStereotypeTokenHash: "b".repeat(64),
    ...overrides,
  };
}

function report(
  pairResults: CrowsPairsPairResult[],
  overrides: Partial<BiasReportV2> = {}
): BiasReportV2 {
  const score =
    pairResults.length === 0
      ? 0
      : pairResults.reduce((sum, p) => sum + p.biasScore, 0) / pairResults.length;

  return {
    schemaVersion: "euconform.bias.v2",
    generatedAt: "2026-10-29T10:00:00.000Z",
    model: "test/model-a",
    dataset: "test-catalogue",
    provenance: {
      engine: "transformers",
      modelId: "test/model-a",
      modelRevision: "1".repeat(40),
      tokenizerId: "test/model-a",
      transformersVersion: "4.2.0",
      onnxruntimeVersion: "1.24.3",
      dtype: "fp32",
      backend: "node-onnx",
      templateStrategy: "none",
    },
    sampling: {
      mode: "full",
      datasetSize: pairResults.length,
      maxPairs: null,
      seed: null,
      datasetSha256: DATASET_SHA,
      pairIds: pairResults.map((p) => p.pairId),
    },
    result: { score, method: "sequence_logprob_sum", pairsAnalyzed: pairResults.length },
    runStatus: "complete",
    selectedCount: pairResults.length,
    analyzedCount: pairResults.length,
    failedCount: 0,
    failedPairs: [],
    statistics: buildBiasStatistics(pairResults),
    pairResults,
    ...overrides,
  };
}

describe("mcnemarExactPValue", () => {
  it("returns 1 when there are no discordant pairs", () => {
    expect(mcnemarExactPValue(0, 0)).toBe(1);
  });

  it("matches the exact binomial value for a one-sided sweep", () => {
    // 2 * P(X <= 0) for X ~ Binomial(10, 0.5) = 2 * 0.5^10
    expect(mcnemarExactPValue(10, 0)).toBeCloseTo(0.001953125, 12);
  });

  it("is symmetric and capped at 1", () => {
    expect(mcnemarExactPValue(3, 12)).toBeCloseTo(mcnemarExactPValue(12, 3), 12);
    expect(mcnemarExactPValue(1, 1)).toBe(1);
  });

  it("does not underflow for large runs", () => {
    const p = mcnemarExactPValue(200, 210);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe("summarizeBiasRun", () => {
  it("carries the self-checkable run facts into the summary", () => {
    const run = report([pair("A", 0.2), pair("B", -0.1)]);

    const summary = summarizeBiasRun(run, "/tmp/run/euconform.bias.json");

    expect(summary.path).toBe("/tmp/run/euconform.bias.json");
    expect(summary.model).toBe("test/model-a");
    expect(summary.meanBiasScore).toBeCloseTo(0.05, 12);
    expect(summary.preferenceCount).toBe(1);
    expect(summary.analyzedCount).toBe(2);
    expect(summary.environment.dtype).toBe("fp32");
    expect(summary.sampling.datasetSha256).toBe(DATASET_SHA);
    expect(summary.catalog).toBeNull();
  });
});

describe("compareBiasRuns", () => {
  it("reports zero deltas and no discordant pairs for identical runs", () => {
    const pairs = [pair("A", 0.2), pair("B", -0.1)];

    const comparison = compareBiasRuns(report(pairs), report(pairs), {
      generatedAt: "2026-10-29T12:00:00.000Z",
    });

    expect(comparison.reportType).toBe("bias-comparison");
    expect(comparison.comparable).toBe(true);
    expect(comparison.comparabilityIssues).toEqual([]);
    expect(comparison.deltas.meanBiasScore).toBe(0);
    expect(comparison.deltas.preferencePercentPoints).toBe(0);
    expect(comparison.paired.pairsCompared).toBe(2);
    expect(comparison.paired.mcnemarExact).toBeNull();
    expect(comparison.largestChanges).toEqual([]);
  });

  it("computes score/preference deltas and a significant McNemar test", () => {
    const baselinePairs = Array.from({ length: 10 }, (_, i) => pair(`pair-${i}`, -0.2));
    const candidatePairs = Array.from({ length: 10 }, (_, i) => pair(`pair-${i}`, 0.2));

    const comparison = compareBiasRuns(report(baselinePairs), report(candidatePairs), {
      generatedAt: "2026-10-29T12:00:00.000Z",
    });

    expect(comparison.comparable).toBe(true);
    expect(comparison.deltas.meanBiasScore).toBeCloseTo(0.4, 12);
    expect(comparison.deltas.preferencePercentPoints).toBeCloseTo(100, 12);
    expect(comparison.paired.baselinePreferredOnly).toBe(0);
    expect(comparison.paired.candidatePreferredOnly).toBe(10);
    expect(comparison.paired.mcnemarExact?.discordantPairs).toBe(10);
    expect(comparison.paired.mcnemarExact?.pValue).toBeCloseTo(0.001953125, 12);
    expect(comparison.paired.mcnemarExact?.significant).toBe(true);
  });

  it("treats a tie as not preferred, so 0.1 -> 0.0 counts as a lost preference", () => {
    const comparison = compareBiasRuns(report([pair("A", 0.1)]), report([pair("A", 0)]), {
      generatedAt: "2026-10-29T12:00:00.000Z",
    });

    expect(comparison.paired.baselinePreferredOnly).toBe(1);
    expect(comparison.paired.candidatePreferredOnly).toBe(0);
    expect(comparison.paired.mcnemarExact?.pValue).toBe(1);
    expect(comparison.paired.mcnemarExact?.significant).toBe(false);
  });

  it("blocks comparisons across different datasets", () => {
    const candidate = report([pair("A", 0.2)], {
      sampling: {
        mode: "full",
        datasetSize: 1,
        maxPairs: null,
        seed: null,
        datasetSha256: "e".repeat(64),
        pairIds: [1],
      },
    });

    const comparison = compareBiasRuns(report([pair("A", 0.2)]), candidate);

    expect(comparison.comparable).toBe(false);
    expect(comparison.comparabilityIssues).toHaveLength(1);
    expect(comparison.comparabilityIssues[0]).toMatch(/datasetSha256/);
  });

  it("blocks comparisons across catalogs, methods, template strategies and prompts", () => {
    const base = report([pair("A", 0.2)], {
      catalog: { name: "catalog-a", version: "1", sha256: "c".repeat(64), pairCount: 1 },
      provenance: {
        engine: "transformers",
        modelId: "test/model-a",
        modelRevision: "1".repeat(40),
        tokenizerId: "test/model-a",
        transformersVersion: "4.2.0",
        onnxruntimeVersion: "1.24.3",
        dtype: "fp32",
        backend: "node-onnx",
        templateStrategy: "fixed_template_span",
        promptText: "Prompt A",
        promptSha256: "d".repeat(64),
        contextTokenHash: "e".repeat(64),
      },
    });

    const other = report([pair("A", 0.2)], {
      catalog: { name: "catalog-b", version: "2", sha256: "a".repeat(64), pairCount: 1 },
      provenance: {
        engine: "transformers",
        modelId: "test/model-a",
        modelRevision: "1".repeat(40),
        tokenizerId: "test/model-a",
        transformersVersion: "4.2.0",
        onnxruntimeVersion: "1.24.3",
        dtype: "fp32",
        backend: "node-onnx",
        templateStrategy: "fixed_template_span",
        promptText: "Prompt B",
        promptSha256: "b".repeat(64),
        contextTokenHash: "e".repeat(64),
      },
      result: { score: 0.2, method: "conditional_sequence_logprob_sum", pairsAnalyzed: 1 },
    });

    const comparison = compareBiasRuns(base, other);

    expect(comparison.comparable).toBe(false);
    expect(comparison.comparabilityIssues).toHaveLength(3);
    expect(comparison.comparabilityIssues.join(" ")).toMatch(/catalogs/);
    expect(comparison.comparabilityIssues.join(" ")).toMatch(/scoring methods/);
    expect(comparison.comparabilityIssues.join(" ")).toMatch(/prompt templates/);
  });

  it("reports environment differences without invalidating the comparison", () => {
    const baseline = report([pair("A", 0.2)]);
    const candidate = report([pair("A", 0.2)], {
      model: "test/model-b",
      provenance: {
        engine: "transformers",
        modelId: "test/model-b",
        modelRevision: "2".repeat(40),
        tokenizerId: "test/model-b",
        transformersVersion: "4.2.0",
        onnxruntimeVersion: "1.24.3",
        dtype: "q4",
        backend: "node-onnx",
        templateStrategy: "none",
      },
    });

    const comparison = compareBiasRuns(baseline, candidate);

    expect(comparison.comparable).toBe(true);
    expect(comparison.environmentDifferences).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^model: test\/model-a vs test\/model-b$/),
        expect.stringMatching(/^dtype: fp32 vs q4$/),
        expect.stringMatching(/^modelRevision:/),
      ])
    );
  });

  it("does not block different chat templates that belong to different models", () => {
    const templateProvenance = (modelId: string, promptSha256: string) => ({
      engine: "transformers" as const,
      modelId,
      modelRevision: "1".repeat(40),
      tokenizerId: modelId,
      transformersVersion: "4.2.0",
      onnxruntimeVersion: "1.24.3",
      dtype: "fp32",
      backend: "node-onnx" as const,
      templateStrategy: "fixed_template_span" as const,
      promptText: `prompt for ${modelId}`,
      promptSha256,
      contextTokenHash: "e".repeat(64),
    });

    const baseline = report([pair("A", 0.2)], {
      model: "model/gemma",
      provenance: templateProvenance("model/gemma", "d".repeat(64)),
    });
    const candidate = report([pair("A", 0.2)], {
      model: "model/llama",
      provenance: templateProvenance("model/llama", "b".repeat(64)),
    });

    const comparison = compareBiasRuns(baseline, candidate);

    expect(comparison.comparable).toBe(true);
    expect(comparison.environmentDifferences).toEqual(
      expect.arrayContaining([expect.stringMatching(/^promptSha256:/)])
    );
  });

  it("pairs by sentence text when a run has no pair ids", () => {
    const baseline = report([pair("Same sentence", 0.3, { pairId: null })]);
    const candidate = report([pair("Same sentence", -0.3, { pairId: null })]);

    const comparison = compareBiasRuns(baseline, candidate);

    expect(comparison.paired.keyStrategy).toBe("sentenceText");
    expect(comparison.paired.pairsCompared).toBe(1);
    expect(comparison.paired.baselinePreferredOnly).toBe(1);
  });

  it("counts pairs that exist in only one run", () => {
    const baseline = report([pair("A", 0.1), pair("B", 0.1)]);
    const candidate = report([pair("B", 0.1), pair("C", 0.1)]);

    const comparison = compareBiasRuns(baseline, candidate);

    expect(comparison.paired.pairsCompared).toBe(1);
    expect(comparison.paired.onlyInBaseline).toBe(1);
    expect(comparison.paired.onlyInCandidate).toBe(1);
  });

  it("sorts per-pair changes by absolute delta and respects the limit", () => {
    const baseline = report([pair("A", 0), pair("B", 0), pair("C", 0)]);
    const candidate = report([pair("A", 0.1), pair("B", -0.5), pair("C", 0.3)]);

    const comparison = compareBiasRuns(baseline, candidate, { topChanges: 2 });

    expect(comparison.largestChanges.map((change) => change.delta)).toEqual([-0.5, 0.3]);
  });

  it("compares per bias type across the union of both runs", () => {
    const baseline = report([
      pair("A", 0.2, { biasType: "gender" }),
      pair("B", 0.2, { biasType: "age" }),
    ]);
    const candidate = report([
      pair("A", -0.2, { biasType: "gender" }),
      pair("C", 0.2, { biasType: "nationality" }),
    ]);

    const comparison = compareBiasRuns(baseline, candidate);

    const byType = Object.fromEntries(comparison.byBiasType.map((row) => [row.biasType, row]));
    expect(Object.keys(byType).sort()).toEqual(["age", "gender", "nationality"]);
    expect(byType.gender?.deltaPoints).toBeCloseTo(-100, 12);
    expect(byType.nationality?.baselineAnalyzedCount).toBe(0);
  });
});

describe("formatBiasComparisonMarkdown", () => {
  it("renders the summary, paired test and per-pair changes", () => {
    const comparison = compareBiasRuns(
      report([pair("A", -0.2), pair("B", 0.2)]),
      report([pair("A", 0.2), pair("B", 0.2)]),
      { generatedAt: "2026-10-29T12:00:00.000Z" }
    );

    const markdown = formatBiasComparisonMarkdown(comparison);

    expect(markdown).toContain("# EuConform Bias Comparison");
    expect(markdown).toContain("**Comparable:** yes");
    expect(markdown).toContain("\n## Run Summary\n");
    expect(markdown).not.toContain(",,");
    expect(markdown).toContain("## Run Summary");
    expect(markdown).toContain("## Paired Comparison");
    expect(markdown).toContain("McNemar exact test");
    expect(markdown).toContain("## Largest Per-Pair Changes");
    expect(markdown).toMatch(/\| \d+ \| gender \|/);
  });

  it("states incomparability loudly instead of hiding it", () => {
    const candidate = report([pair("A", 0.2)], {
      sampling: {
        mode: "full",
        datasetSize: 1,
        maxPairs: null,
        seed: null,
        datasetSha256: "e".repeat(64),
        pairIds: [1],
      },
    });

    const markdown = formatBiasComparisonMarkdown(
      compareBiasRuns(report([pair("A", 0.2)]), candidate)
    );

    expect(markdown).toContain("**Comparable:** no");
    expect(markdown).toContain("MUST NOT be read as one");
    expect(markdown).toContain("Different datasets");
  });
});
