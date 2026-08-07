import { describe, expect, it } from "vitest";
import { buildBiasStatistics } from "../../src/evidence/bias-statistics";
import { validateBiasArtifact, validateScanBundle } from "../../src/evidence/validate";
import type { CrowsPairsPairResult } from "../../src/types";

const LEGACY_V1_ARTIFACT = {
  // Values taken verbatim from .euconform/euconform.bias.json (the real, pre-Task-3
  // stage artifact this legacy path must keep accepting).
  schemaVersion: "euconform.bias.v1",
  generatedAt: "2026-08-05T11:06:28.569Z",
  model: "phi3:3.8b",
  dataset: "crows_pairs_de",
  result: {
    score: -0.019561,
    method: "logprobs_exact",
    pairsAnalyzed: 24,
    stereotypicalPreference: 45.83,
  },
  sampling: { datasetSize: 100, maxPairs: 25, seed: 42 },
};

function pair(overrides: Partial<CrowsPairsPairResult> = {}): CrowsPairsPairResult {
  return {
    pairId: 1,
    stereotype: "s",
    antiStereotype: "a",
    biasType: "gender",
    stereotypeLogProb: -1,
    antiStereotypeLogProb: -1.5,
    biasScore: 0.5,
    biasDirection: "stereotype",
    method: "sequence_logprob_sum",
    stereotypeTokenCount: 4,
    antiStereotypeTokenCount: 4,
    tokenCountDelta: 0,
    stereotypeTokenHash: "a".repeat(64),
    antiStereotypeTokenHash: "b".repeat(64),
    ...overrides,
  };
}

function buildV2Artifact() {
  const pairResults = [pair()];
  return {
    schemaVersion: "euconform.bias.v2" as const,
    generatedAt: "2026-08-07T10:00:00.000Z",
    model: "Xenova/gpt2",
    dataset: "crows_pairs_de",
    provenance: {
      engine: "transformers",
      modelId: "Xenova/gpt2",
      modelRevision: "f".repeat(40),
      tokenizerId: "Xenova/gpt2",
      transformersVersion: "2.17.2",
      onnxruntimeVersion: "1.14.0",
      dtype: "fp32",
      backend: "node-onnx",
      templateStrategy: "none",
    },
    sampling: {
      mode: "full",
      datasetSize: 1,
      maxPairs: null,
      seed: null,
      datasetSha256: "c".repeat(64),
      pairIds: [1],
    },
    result: { score: 0.5, method: "sequence_logprob_sum", pairsAnalyzed: 1 },
    runStatus: "complete" as const,
    selectedCount: 1,
    analyzedCount: 1,
    failedCount: 0,
    failedPairs: [],
    statistics: buildBiasStatistics(pairResults),
    pairResults,
  };
}

describe("validateBiasArtifact (shared dispatcher)", () => {
  it("flags a v1 artifact as legacy with an incident-naming warning, but still validates it", () => {
    const outcome = validateBiasArtifact(LEGACY_V1_ARTIFACT);
    expect(outcome.legacy).toBe(true);
    expect(outcome.warning).toMatch(/logprobs_exact/);
    expect(outcome.warning).toMatch(/v1/);
    expect(outcome.document).toMatchObject({ model: "phi3:3.8b" });
  });

  it("delegates a v2 artifact to the semantic validator and marks it non-legacy", () => {
    const outcome = validateBiasArtifact(buildV2Artifact());
    expect(outcome.legacy).toBe(false);
    expect(outcome.warning).toBeUndefined();
    expect(outcome.document).toMatchObject({ schemaVersion: "euconform.bias.v2" });
  });

  it("rejects a v2 artifact with tampered statistics the same way validate() and verify() must", () => {
    const artifact = buildV2Artifact();
    const tampered = {
      ...artifact,
      statistics: { ...artifact.statistics, preferenceCount: 999 },
    };
    expect(() => validateBiasArtifact(tampered)).toThrow(/preferenceCount/);
  });
});

describe("bundle decoupling: artifact schema versions are independent of the bundle's", () => {
  const BUNDLE_HEADER = {
    schemaVersion: "euconform.bundle.v1",
    generatedAt: "2026-08-07T10:00:00.000Z",
    tool: { name: "euconform", version: "0.1.0" },
    target: { name: "test", rootPath: "/test" },
  };

  it("accepts a euconform.bundle.v1 manifest referencing a euconform.bias.v2 artifact", () => {
    const bundle = {
      ...BUNDLE_HEADER,
      artifacts: [
        {
          role: "report",
          fileName: "euconform.report.json",
          sha256: "a".repeat(64),
          required: true,
          schemaVersion: "euconform.report.v1",
        },
        {
          role: "bias",
          fileName: "euconform.bias.json",
          sha256: "b".repeat(64),
          required: false,
          schemaVersion: "euconform.bias.v2",
        },
      ],
    };
    expect(() => validateScanBundle(bundle)).not.toThrow();
  });
});
