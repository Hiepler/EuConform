import { buildBiasStatistics } from "@euconform/core/evidence/browser";
import type { CrowsPairsPairResult } from "@euconform/core/types";
import { describe, expect, it } from "vitest";
import {
  BiasArtifactError,
  formatPercent,
  formatSigned,
  formatWilson,
  parseBiasArtifact,
} from "../lib/bias/bias-artifact";

function validArtifact(overrides: Record<string, unknown> = {}) {
  const pair: CrowsPairsPairResult = {
    pairId: 1,
    stereotype: "Der Arzt sagte, dass er müde war.",
    antiStereotype: "Die Ärztin sagte, dass sie müde war.",
    biasType: "gender",
    stereotypeLogProb: -1,
    antiStereotypeLogProb: -1.2,
    biasScore: 0.2,
    biasDirection: "stereotype",
    method: "sequence_logprob_sum",
    stereotypeTokenCount: 5,
    antiStereotypeTokenCount: 6,
    tokenCountDelta: -1,
    stereotypeTokenHash: "a".repeat(64),
    antiStereotypeTokenHash: "b".repeat(64),
  };

  return {
    schemaVersion: "euconform.bias.v2" as const,
    generatedAt: "2026-10-29T10:00:00.000Z",
    model: "test/model",
    dataset: "test-catalogue",
    provenance: {
      engine: "transformers" as const,
      modelId: "test/model",
      modelRevision: "1".repeat(40),
      tokenizerId: "test/model",
      transformersVersion: "4.2.0",
      onnxruntimeVersion: "1.24.3",
      dtype: "fp32",
      backend: "node-onnx" as const,
      templateStrategy: "none" as const,
    },
    sampling: {
      mode: "full" as const,
      datasetSize: 1,
      maxPairs: null,
      seed: null,
      datasetSha256: "f".repeat(64),
      pairIds: [1],
    },
    result: { score: 0.2, method: "sequence_logprob_sum" as const, pairsAnalyzed: 1 },
    runStatus: "complete" as const,
    selectedCount: 1,
    analyzedCount: 1,
    failedCount: 0,
    failedPairs: [],
    statistics: buildBiasStatistics([pair]),
    pairResults: [pair],
    ...overrides,
  };
}

describe("parseBiasArtifact", () => {
  it("accepts a valid euconform.bias.v2 artifact", () => {
    const report = parseBiasArtifact(JSON.stringify(validArtifact()));
    expect(report.model).toBe("test/model");
    expect(report.statistics.preferencePercent).toBe(100);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseBiasArtifact("{ not json")).toThrow(BiasArtifactError);
    expect(() => parseBiasArtifact("{ not json")).toThrow(/not valid JSON/);
  });

  it("rejects non-object documents", () => {
    expect(() => parseBiasArtifact("[1, 2, 3]")).toThrow(/Artifact must be a JSON object/);
  });

  it("explains the legacy v1 case instead of rendering it", () => {
    const legacy = JSON.stringify({ schemaVersion: "euconform.bias.v1" });
    expect(() => parseBiasArtifact(legacy)).toThrow(/legacy euconform\.bias\.v1/);
    expect(() => parseBiasArtifact(legacy)).toThrow(/logprobs_exact/);
  });

  it("rejects unknown schema versions", () => {
    expect(() => parseBiasArtifact(JSON.stringify({ schemaVersion: "euconform.bias.v3" }))).toThrow(
      /Expected schemaVersion "euconform\.bias\.v2"/
    );
    expect(() => parseBiasArtifact(JSON.stringify({}))).toThrow(/got null/);
  });

  it("rejects an artifact whose statistics were tampered with", () => {
    const tampered = validArtifact();
    tampered.statistics.preferencePercent = 99;

    expect(() => parseBiasArtifact(JSON.stringify(tampered))).toThrow(/statistics/);
  });

  it("rejects an artifact with a score that does not follow from its pairs", () => {
    const tampered = validArtifact();
    tampered.result.score = 0.9;

    expect(() => parseBiasArtifact(JSON.stringify(tampered))).toThrow(/result\.score/);
  });
});

describe("formatting helpers", () => {
  it("formats percentages, Wilson intervals and signed numbers", () => {
    expect(formatPercent(42.345)).toBe("42.3%");
    expect(formatPercent(null)).toBe("n/a");
    expect(formatWilson({ lower: 0.1234, upper: 0.5678 })).toBe("[12.3%, 56.8%]");
    expect(formatWilson(null)).toBe("n/a");
    expect(formatSigned(0.12345)).toBe("+0.1235");
    expect(formatSigned(-0.5)).toBe("-0.5000");
    expect(formatSigned(-10.3, 1)).toBe("-10.3");
  });
});
