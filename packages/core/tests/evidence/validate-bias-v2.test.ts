import { describe, expect, it } from "vitest";
import { buildBiasStatistics } from "../../src/evidence/bias-statistics";
import { validateBiasReportV2 } from "../../src/evidence/validate-bias-v2";
import type { CrowsPairsPairResult } from "../../src/types";

function pair(overrides: Partial<CrowsPairsPairResult> = {}): CrowsPairsPairResult {
  return {
    pairId: 1,
    stereotype: "Der Mann ist Ingenieur.",
    antiStereotype: "Die Frau ist Ingenieurin.",
    biasType: "gender",
    stereotypeLogProb: -1.2,
    antiStereotypeLogProb: -1.8,
    biasScore: 0.6,
    biasDirection: "stereotype",
    method: "sequence_logprob_sum",
    stereotypeTokenCount: 5,
    antiStereotypeTokenCount: 5,
    tokenCountDelta: 0,
    stereotypeTokenHash: "a".repeat(64),
    antiStereotypeTokenHash: "b".repeat(64),
    ...overrides,
  };
}

/** A minimal, internally-consistent euconform.bias.v2 artifact built from real pairResults. */
function buildValidArtifact(pairResults: CrowsPairsPairResult[]) {
  const statistics = buildBiasStatistics(pairResults);
  const score = pairResults.reduce((sum, p) => sum + p.biasScore, 0) / pairResults.length;
  return {
    schemaVersion: "euconform.bias.v2" as const,
    generatedAt: "2026-08-07T10:00:00.000Z",
    model: "Xenova/gpt2",
    dataset: "crows_pairs_de",
    provenance: {
      engine: "transformers",
      modelId: "Xenova/gpt2",
      modelRevision: "e".repeat(40),
      tokenizerId: "Xenova/gpt2",
      transformersVersion: "2.17.2",
      onnxruntimeVersion: "1.14.0",
      dtype: "fp32",
      backend: "node-onnx",
      templateStrategy: "none",
    },
    sampling: {
      mode: "seeded_sample",
      datasetSize: 100,
      maxPairs: pairResults.length,
      seed: 42,
      datasetSha256: "c".repeat(64),
      pairIds: pairResults.map((p) => p.pairId),
    },
    result: {
      score,
      method: "sequence_logprob_sum",
      pairsAnalyzed: pairResults.length,
    },
    runStatus: "complete" as const,
    selectedCount: pairResults.length,
    analyzedCount: pairResults.length,
    failedCount: 0,
    failedPairs: [],
    statistics,
    pairResults,
  };
}

describe("validateBiasReportV2", () => {
  it("accepts a well-formed, internally-consistent artifact", () => {
    const artifact = buildValidArtifact([
      pair({ pairId: 1, biasScore: 0.6, biasDirection: "stereotype" }),
      pair({ pairId: 2, biasScore: -0.2, biasDirection: "anti-stereotype" }),
      pair({ pairId: 3, biasScore: 0.4, biasDirection: "stereotype", biasType: "age" }),
    ]);
    expect(() => validateBiasReportV2(artifact)).not.toThrow();
  });

  it("rejects an artifact missing required top-level fields (schema shape)", () => {
    const artifact = buildValidArtifact([pair()]);
    // biome-ignore lint/performance/noDelete: test needs a genuinely missing key, not undefined
    delete (artifact as Record<string, unknown>).provenance;
    expect(() => validateBiasReportV2(artifact)).toThrow(/provenance/);
  });

  it("rejects a manipulated Wilson bound (statistics don't follow from pairResults)", () => {
    const artifact = buildValidArtifact([
      pair({ pairId: 1, biasScore: 0.6 }),
      pair({ pairId: 2, biasScore: -0.2 }),
    ]);
    const tampered = {
      ...artifact,
      statistics: {
        ...artifact.statistics,
        preferenceWilson95: artifact.statistics.preferenceWilson95
          ? {
              lower: artifact.statistics.preferenceWilson95.lower + 0.01,
              upper: artifact.statistics.preferenceWilson95.upper,
            }
          : null,
      },
    };
    expect(() => validateBiasReportV2(tampered)).toThrow(/preferenceWilson95/);
  });

  it("rejects a tampered pairDiffQuartiles median", () => {
    const artifact = buildValidArtifact([
      pair({ pairId: 1, biasScore: 1 }),
      pair({ pairId: 2, biasScore: 2 }),
      pair({ pairId: 3, biasScore: 3 }),
      pair({ pairId: 4, biasScore: 4 }),
    ]);
    const tampered = {
      ...artifact,
      statistics: {
        ...artifact.statistics,
        pairDiffQuartiles: artifact.statistics.pairDiffQuartiles
          ? { ...artifact.statistics.pairDiffQuartiles, median: 999 }
          : null,
      },
    };
    expect(() => validateBiasReportV2(tampered)).toThrow(/pairDiffQuartiles/);
  });

  it("rejects a wrong tiesCount", () => {
    const artifact = buildValidArtifact([
      pair({ pairId: 1, biasScore: 0 }),
      pair({ pairId: 2, biasScore: 0.5 }),
    ]);
    const tampered = {
      ...artifact,
      statistics: { ...artifact.statistics, tiesCount: 0 },
    };
    expect(() => validateBiasReportV2(tampered)).toThrow(/tiesCount/);
  });

  it("rejects selectedCount/analyzedCount/failedCount invariant violations", () => {
    const artifact = buildValidArtifact([pair({ pairId: 1 })]);
    const tampered = { ...artifact, selectedCount: 5 };
    expect(() => validateBiasReportV2(tampered)).toThrow(/selectedCount/);
  });

  it("rejects failedPairs.length not matching failedCount", () => {
    const artifact = buildValidArtifact([pair({ pairId: 1 })]);
    const tampered = { ...artifact, failedCount: 1, failedPairs: [] };
    expect(() => validateBiasReportV2(tampered)).toThrow(/failedPairs|selectedCount/);
  });

  it("accepts a partial run with a matching failedPairs entry", () => {
    const artifact = buildValidArtifact([pair({ pairId: 1 }), pair({ pairId: 2 })]);
    const partial = {
      ...artifact,
      runStatus: "partial" as const,
      selectedCount: 3,
      failedCount: 1,
      failedPairs: [{ pairId: 3, reason: "measurement failed" }],
    };
    expect(() => validateBiasReportV2(partial)).not.toThrow();
  });

  it("accepts the null equal-token-subset case (no pairs share token length)", () => {
    const artifact = buildValidArtifact([
      pair({ pairId: 1, tokenCountDelta: 1, stereotypeTokenCount: 6, antiStereotypeTokenCount: 5 }),
      pair({
        pairId: 2,
        tokenCountDelta: -2,
        stereotypeTokenCount: 3,
        antiStereotypeTokenCount: 5,
      }),
    ]);
    expect(artifact.statistics.equalTokenPreferencePercent).toBeNull();
    expect(() => validateBiasReportV2(artifact)).not.toThrow();
  });

  it("rejects a mismatched top-level result.score", () => {
    const artifact = buildValidArtifact([pair({ pairId: 1, biasScore: 0.6 })]);
    const tampered = { ...artifact, result: { ...artifact.result, score: 99 } };
    expect(() => validateBiasReportV2(tampered)).toThrow(/result\.score/);
  });
});
