import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildBiasStatistics, generateScanOutput } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import type { CrowsPairsPairResult } from "@euconform/core/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateFile } from "../src/commands/validate";
import { writeBundleManifest, writeOutputFiles } from "../src/output/writer";
import { verifyBundleInput } from "../src/verify/verify";

/**
 * `validate` and `verify` used to run different validators for bias artifacts
 * (AJV-only vs. a lenient hand-rolled check) and could disagree on the same
 * file. Both now delegate to `validateBiasArtifact`. This test manipulates a
 * SINGLE artifact and runs it through BOTH commands, asserting neither
 * accepts what the other rejects (Messmotor-Sanierung Task 3 brief, "ein
 * Testfall, der BEIDE Kommandos gegen dasselbe manipulierte Artefakt laufen
 * lässt").
 */

const FIXTURES = resolve(import.meta.dirname, "../../core/tests/fixtures");
const TMP_DIR = resolve(import.meta.dirname, "../.tmp-test-validate-verify-consistency");

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

function buildV2Artifact(pairResults: CrowsPairsPairResult[]) {
  const statistics = buildBiasStatistics(pairResults);
  const score = pairResults.reduce((sum, p) => sum + p.biasScore, 0) / pairResults.length;
  return {
    schemaVersion: "euconform.bias.v2",
    generatedAt: "2026-08-07T10:00:00.000Z",
    model: "Xenova/gpt2",
    dataset: "crows_pairs_de",
    provenance: {
      engine: "transformers",
      modelId: "Xenova/gpt2",
      modelRevision: "d".repeat(40),
      tokenizerId: "Xenova/gpt2",
      transformersVersion: "2.17.2",
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
    result: { score, method: "sequence_logprob_sum", pairsAnalyzed: pairResults.length },
    runStatus: "complete",
    selectedCount: pairResults.length,
    analyzedCount: pairResults.length,
    failedCount: 0,
    failedPairs: [],
    statistics,
    pairResults,
  };
}

describe("validate and verify agree on the same bias artifact", () => {
  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("both accept a well-formed euconform.bias.v2 artifact", async () => {
    const outDir = resolve(TMP_DIR, "valid");
    const scanResult = await scanRepository({ targetPath: resolve(FIXTURES, "nextjs-openai") });
    const output = generateScanOutput(scanResult);
    await writeOutputFiles(output, outDir, "all");

    const artifact = buildV2Artifact([pair()]);
    await writeFile(resolve(outDir, "euconform.bias.json"), JSON.stringify(artifact, null, 2));
    await writeBundleManifest(outDir, {
      tool: output.report.tool,
      target: { name: output.report.target.name, rootPath: output.report.target.rootPath },
      generatedAt: output.report.generatedAt,
    });

    const validateResult = await validateFile(resolve(outDir, "euconform.bias.json"));
    expect(validateResult.result.valid).toBe(true);

    const verifyReport = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"));
    const biasEntry = verifyReport.artifacts.find((a) => a.role === "bias");
    expect(biasEntry?.schemaStatus).toBe("valid");
  });

  it("both reject the same artifact with a manipulated Wilson bound", async () => {
    const outDir = resolve(TMP_DIR, "tampered");
    const scanResult = await scanRepository({ targetPath: resolve(FIXTURES, "nextjs-openai") });
    const output = generateScanOutput(scanResult);
    await writeOutputFiles(output, outDir, "all");

    const artifact = buildV2Artifact([
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
    await writeFile(resolve(outDir, "euconform.bias.json"), JSON.stringify(tampered, null, 2));
    await writeBundleManifest(outDir, {
      tool: output.report.tool,
      target: { name: output.report.target.name, rootPath: output.report.target.rootPath },
      generatedAt: output.report.generatedAt,
    });

    const validateResult = await validateFile(resolve(outDir, "euconform.bias.json"));
    expect(validateResult.result.valid).toBe(false);

    const verifyReport = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"));
    const biasEntry = verifyReport.artifacts.find((a) => a.role === "bias");
    expect(biasEntry?.schemaStatus).toBe("invalid");
    expect(verifyReport.status).toBe("errors");
  });

  it("both accept a legacy v1 artifact, but verify --strict rejects it with the incident message", async () => {
    const outDir = resolve(TMP_DIR, "legacy-v1");
    const scanResult = await scanRepository({ targetPath: resolve(FIXTURES, "nextjs-openai") });
    const output = generateScanOutput(scanResult);
    await writeOutputFiles(output, outDir, "all");

    const legacy = {
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
    };
    await writeFile(resolve(outDir, "euconform.bias.json"), JSON.stringify(legacy, null, 2));
    await writeBundleManifest(outDir, {
      tool: output.report.tool,
      target: { name: output.report.target.name, rootPath: output.report.target.rootPath },
      generatedAt: output.report.generatedAt,
    });

    const validateResult = await validateFile(resolve(outDir, "euconform.bias.json"));
    expect(validateResult.result.valid).toBe(true);
    expect(validateResult.legacyWarning).toMatch(/logprobs_exact/);

    const normalReport = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"));
    expect(normalReport.status).not.toBe("errors");
    expect(normalReport.warnings.some((w) => w.code === "artifact.bias.legacyMethod")).toBe(true);

    const strictReport = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"), {
      strict: true,
    });
    expect(strictReport.status).toBe("errors");
    expect(
      strictReport.errors.some(
        (e) => e.code === "artifact.bias.legacyMethod" && /logprobs_exact/.test(e.message)
      )
    ).toBe(true);
  });
});
