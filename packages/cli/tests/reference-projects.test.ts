import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { generateScanOutput } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeBundleManifest, writeOutputFiles, writeZipBundle } from "../src/output/writer";
import { verifyBundleInput } from "../src/verify/verify";

const EXAMPLES = resolve(import.meta.dirname, "../../../examples");
const TMP_DIR = resolve(import.meta.dirname, "../.tmp-test-reference-projects");

async function scanReferenceProject(projectDir: string, outputDirName: string) {
  const targetPath = resolve(EXAMPLES, projectDir);
  const outputDir = resolve(TMP_DIR, outputDirName);
  const scanResult = await scanRepository({ targetPath });
  const output = generateScanOutput(scanResult);

  await writeOutputFiles(output, outputDir, "all");
  await writeBundleManifest(outputDir, {
    tool: output.report.tool,
    target: {
      name: output.report.target.name,
      rootPath: output.report.target.rootPath,
    },
    generatedAt: output.report.generatedAt,
  });

  const zipPath = await writeZipBundle(outputDir);

  return { output, outputDir, zipPath };
}

describe("reference project adoption flow", () => {
  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("scans and verifies the local Ollama reference project", async () => {
    const { output, outputDir, zipPath } = await scanReferenceProject(
      "ollama-chatbot",
      "ollama-chatbot"
    );

    expect(output.report.aiFootprint.usesAI).toBe(true);
    expect(output.report.aiFootprint.inferenceModes.some((mode) => mode.includes("ollama"))).toBe(
      true
    );
    expect(output.report.complianceSignals.disclosure.status).not.toBe("absent");

    const manifestReport = await verifyBundleInput(resolve(outputDir, "euconform.bundle.json"));
    const zipReport = await verifyBundleInput(zipPath);

    expect(existsSync(zipPath)).toBe(true);
    expect(manifestReport.status).toBe("valid");
    expect(zipReport.status).toBe("valid");
  });

  it("scans and verifies the RAG reference project", async () => {
    const { output, outputDir, zipPath } = await scanReferenceProject(
      "rag-assistant",
      "rag-assistant"
    );

    expect(output.report.aiFootprint.usesAI).toBe(true);
    expect(output.report.aiFootprint.inferenceModes.some((mode) => mode.includes("ollama"))).toBe(
      true
    );
    expect(output.report.aiFootprint.ragHints.length).toBeGreaterThan(0);

    const manifestReport = await verifyBundleInput(resolve(outputDir, "euconform.bundle.json"));
    const zipReport = await verifyBundleInput(zipPath);

    expect(existsSync(zipPath)).toBe(true);
    expect(manifestReport.status).toBe("valid");
    expect(zipReport.status).toBe("valid");
  });
});
