import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildBiasStatistics } from "@euconform/core/evidence";
import type { BiasReportV2 } from "@euconform/core/evidence";
import type { CrowsPairsPairResult } from "@euconform/core/types";
import { runCommand } from "citty";
import consola from "consola";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import compareCommand from "../src/commands/compare";

const TMP_DIR = resolve(import.meta.dirname, "../.tmp-test-compare");

function pair(stereotype: string, biasScore: number): CrowsPairsPairResult {
  return {
    pairId: 1,
    stereotype,
    antiStereotype: `${stereotype} (anti)`,
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
  };
}

function report(biasScore: number, datasetSha256 = "f".repeat(64)): BiasReportV2 {
  const pairResults = [pair("Der Arzt sagte, dass er müde war.", biasScore)];
  return {
    schemaVersion: "euconform.bias.v2",
    generatedAt: "2026-10-29T10:00:00.000Z",
    model: "test/model",
    dataset: "test-catalogue",
    provenance: {
      engine: "transformers",
      modelId: "test/model",
      modelRevision: "1".repeat(40),
      tokenizerId: "test/model",
      transformersVersion: "4.2.0",
      onnxruntimeVersion: "1.24.3",
      dtype: "fp32",
      backend: "node-onnx",
      templateStrategy: "none",
    },
    sampling: {
      mode: "full",
      datasetSize: 1,
      maxPairs: null,
      seed: null,
      datasetSha256,
      pairIds: [1],
    },
    result: { score: biasScore, method: "sequence_logprob_sum", pairsAnalyzed: 1 },
    runStatus: "complete",
    selectedCount: 1,
    analyzedCount: 1,
    failedCount: 0,
    failedPairs: [],
    statistics: buildBiasStatistics(pairResults),
    pairResults,
  };
}

async function writeArtifact(dirName: string, artifact: BiasReportV2 | string): Promise<string> {
  const dir = resolve(TMP_DIR, dirName);
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, "euconform.bias.json"),
    typeof artifact === "string" ? artifact : JSON.stringify(artifact, null, 2)
  );
  return dir;
}

describe("euconform compare", () => {
  let stdout: string[];

  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    stdout = [];
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  function captureStdout(): void {
    stdout = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
  }

  it("prints a comparison as JSON to stdout", async () => {
    const baseline = await writeArtifact("json-baseline", report(-0.2));
    const candidate = await writeArtifact("json-candidate", report(0.2));
    captureStdout();

    await runCommand(compareCommand, { rawArgs: [baseline, candidate, "--output", "json"] });

    const parsed = JSON.parse(stdout.join(""));
    expect(parsed.reportType).toBe("bias-comparison");
    expect(parsed.comparable).toBe(true);
    expect(parsed.deltas.meanBiasScore).toBeCloseTo(0.4, 12);
    expect(parsed.paired.pairsCompared).toBe(1);
  });

  it("accepts artifact files directly and writes md + json with --out-dir", async () => {
    const baselineDir = await writeArtifact("file-baseline", report(-0.2));
    const candidateDir = await writeArtifact("file-candidate", report(0.2));
    const outDir = resolve(TMP_DIR, "out");
    vi.spyOn(consola, "success").mockImplementation(() => {});
    vi.spyOn(consola, "log").mockImplementation(() => {});

    await runCommand(compareCommand, {
      rawArgs: [
        resolve(baselineDir, "euconform.bias.json"),
        resolve(candidateDir, "euconform.bias.json"),
        "--output",
        "all",
        "--out-dir",
        outDir,
      ],
    });

    const markdown = await readFile(resolve(outDir, "euconform.bias-comparison.md"), "utf-8");
    const json = JSON.parse(
      await readFile(resolve(outDir, "euconform.bias-comparison.json"), "utf-8")
    );
    expect(markdown).toContain("# EuConform Bias Comparison");
    expect(json.deltas.preferencePercentPoints).toBe(100);
  });

  it("refuses to compare runs over different datasets", async () => {
    const baseline = await writeArtifact("diff-baseline", report(0.2));
    const candidate = await writeArtifact("diff-candidate", report(0.2, "e".repeat(64)));
    const errorSpy = vi.spyOn(consola, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`EXIT:${code}`);
    }) as never);

    await expect(
      runCommand(compareCommand, { rawArgs: [baseline, candidate, "--output", "json"] })
    ).rejects.toThrow("EXIT:1");

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("nicht vergleichbar"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("datasetSha256"));
  });

  it("writes an explicitly incomparable result with --allow-incomparable", async () => {
    const baseline = await writeArtifact("allow-baseline", report(0.2));
    const candidate = await writeArtifact("allow-candidate", report(0.2, "e".repeat(64)));
    vi.spyOn(consola, "warn").mockImplementation(() => {});
    captureStdout();

    await runCommand(compareCommand, {
      rawArgs: [baseline, candidate, "--output", "json", "--allow-incomparable"],
    });

    const parsed = JSON.parse(stdout.join(""));
    expect(parsed.comparable).toBe(false);
    expect(parsed.comparabilityIssues).toHaveLength(1);
  });

  it("rejects a file that is not a valid bias.v2 artifact", async () => {
    const baseline = await writeArtifact("invalid", "{ not json");
    const candidate = await writeArtifact("valid", report(0.2));
    const errorSpy = vi.spyOn(consola, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`EXIT:${code}`);
    }) as never);

    await expect(runCommand(compareCommand, { rawArgs: [baseline, candidate] })).rejects.toThrow(
      "EXIT:1"
    );

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("konnte nicht gelesen werden"));
  });
});
