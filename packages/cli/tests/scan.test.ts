import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { generateScanOutput } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeOutputFiles } from "../src/output/writer";
import { shouldFailOnGaps } from "../src/utils/gap-priority";

const FIXTURES = resolve(import.meta.dirname, "../../core/tests/fixtures");
const TMP_DIR = resolve(import.meta.dirname, "../.tmp-test-output");

describe("CLI scan integration", () => {
  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("scan produces output files for nextjs-openai fixture", async () => {
    const outDir = resolve(TMP_DIR, "nextjs-openai");
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);
    await writeOutputFiles(output, outDir, "all");

    expect(existsSync(resolve(outDir, "euconform.report.json"))).toBe(true);
    expect(existsSync(resolve(outDir, "euconform.aibom.json"))).toBe(true);
    expect(existsSync(resolve(outDir, "euconform.summary.md"))).toBe(true);

    // Verify JSON is parseable
    const report = JSON.parse(await readFile(resolve(outDir, "euconform.report.json"), "utf-8"));
    expect(report.schemaVersion).toBe("euconform.report.v1");

    const aibom = JSON.parse(await readFile(resolve(outDir, "euconform.aibom.json"), "utf-8"));
    expect(aibom.schemaVersion).toBe("euconform.aibom.v1");

    // Verify markdown is non-empty
    const md = await readFile(resolve(outDir, "euconform.summary.md"), "utf-8");
    expect(md.length).toBeGreaterThan(0);
  });

  it("scan produces output files for ollama-rag fixture", async () => {
    const outDir = resolve(TMP_DIR, "ollama-rag");
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "ollama-rag"),
    });
    const output = generateScanOutput(scanResult);
    await writeOutputFiles(output, outDir, "all");

    expect(existsSync(resolve(outDir, "euconform.report.json"))).toBe(true);
    expect(existsSync(resolve(outDir, "euconform.aibom.json"))).toBe(true);
    expect(existsSync(resolve(outDir, "euconform.summary.md"))).toBe(true);

    // Verify ollama and RAG signals detected
    const report = JSON.parse(await readFile(resolve(outDir, "euconform.report.json"), "utf-8"));
    const inferenceModes = report.aiFootprint.inferenceModes as string[];
    expect(inferenceModes.some((m: string) => m.includes("ollama"))).toBe(true);
    expect(report.aiFootprint.ragHints.length).toBeGreaterThan(0);
  });

  it("scan produces no AI signals for plain-webapp fixture", async () => {
    const outDir = resolve(TMP_DIR, "plain-webapp");
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "plain-webapp"),
    });
    const output = generateScanOutput(scanResult);
    await writeOutputFiles(output, outDir, "all");

    const report = JSON.parse(await readFile(resolve(outDir, "euconform.report.json"), "utf-8"));
    expect(report.aiFootprint.usesAI).toBe(false);
  });

  it("scan detects compliance signals in compliance-good fixture", async () => {
    const outDir = resolve(TMP_DIR, "compliance-good");
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "compliance-good"),
    });
    const output = generateScanOutput(scanResult);
    await writeOutputFiles(output, outDir, "all");

    const report = JSON.parse(await readFile(resolve(outDir, "euconform.report.json"), "utf-8"));
    // compliance-good fixture has bias testing infrastructure
    const biasStatus = report.complianceSignals.biasTesting.status;
    expect(["present", "partial"]).toContain(biasStatus);
  });

  it("uses production scope by default and can expand to all scope", async () => {
    const productionResult = await scanRepository({
      targetPath: resolve(FIXTURES, "compliance-good"),
    });
    const allResult = await scanRepository({
      targetPath: resolve(FIXTURES, "compliance-good"),
      scope: "all",
    });

    expect(productionResult.meta.scanScope).toBe("production");
    expect(allResult.meta.scanScope).toBe("all");
    expect(allResult.meta.filesScanned).toBeGreaterThan(productionResult.meta.filesScanned);
  });

  it("report.json conforms to schema", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);
    const outDir = resolve(TMP_DIR, "schema-report");
    await writeOutputFiles(output, outDir, "json");

    const report = JSON.parse(await readFile(resolve(outDir, "euconform.report.json"), "utf-8"));

    // Required top-level fields
    expect(report.schemaVersion).toBe("euconform.report.v1");
    expect(typeof report.generatedAt).toBe("string");
    expect(typeof report.tool).toBe("object");
    expect(typeof report.tool.name).toBe("string");
    expect(typeof report.tool.version).toBe("string");
    expect(typeof report.target).toBe("object");
    expect(typeof report.target.rootPath).toBe("string");
    expect(typeof report.target.name).toBe("string");
    expect(typeof report.target.repoType).toBe("string");
    expect(Array.isArray(report.target.detectedStack)).toBe(true);
    expect(typeof report.aiFootprint).toBe("object");
    expect(typeof report.aiFootprint.usesAI).toBe("boolean");
    expect(Array.isArray(report.aiFootprint.inferenceModes)).toBe(true);
    expect(Array.isArray(report.aiFootprint.providerHints)).toBe(true);
    expect(Array.isArray(report.aiFootprint.ragHints)).toBe(true);
    expect(typeof report.complianceSignals).toBe("object");
    expect(typeof report.assessmentHints).toBe("object");
    expect(Array.isArray(report.gaps)).toBe(true);
    expect(Array.isArray(report.recommendationSummary)).toBe(true);
  });

  it("aibom.json conforms to schema", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);
    const outDir = resolve(TMP_DIR, "schema-aibom");
    await writeOutputFiles(output, outDir, "json");

    const aibom = JSON.parse(await readFile(resolve(outDir, "euconform.aibom.json"), "utf-8"));

    // Required top-level fields
    expect(aibom.schemaVersion).toBe("euconform.aibom.v1");
    expect(typeof aibom.project).toBe("object");
    expect(typeof aibom.project.name).toBe("string");
    expect(typeof aibom.project.rootPath).toBe("string");
    expect(Array.isArray(aibom.components)).toBe(true);
    expect(aibom.components.length).toBeGreaterThan(0);

    // Each component has required fields
    for (const comp of aibom.components) {
      expect(typeof comp.id).toBe("string");
      expect(typeof comp.kind).toBe("string");
      expect(typeof comp.name).toBe("string");
      expect(typeof comp.source).toBe("string");
    }

    // Compliance capabilities
    expect(typeof aibom.complianceCapabilities).toBe("object");
    expect(typeof aibom.complianceCapabilities.biasEvaluation).toBe("boolean");
    expect(typeof aibom.complianceCapabilities.jsonExport).toBe("boolean");
    expect(typeof aibom.complianceCapabilities.pdfExport).toBe("boolean");
    expect(typeof aibom.complianceCapabilities.loggingInfrastructure).toBe("boolean");
    expect(typeof aibom.complianceCapabilities.humanReviewFlow).toBe("boolean");
    expect(typeof aibom.complianceCapabilities.incidentHandling).toBe("boolean");
  });

  it("summary.md contains disclaimer", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);
    const outDir = resolve(TMP_DIR, "schema-md");
    await writeOutputFiles(output, outDir, "md");

    const md = await readFile(resolve(outDir, "euconform.summary.md"), "utf-8");
    expect(md).toContain("technical guidance only");
    expect(md).toContain("does not constitute legal advice");
    expect(md).toContain("Scan scope: `production`");
  });

  it("fail-on helper triggers at or above the configured threshold", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(shouldFailOnGaps(output.report.gaps, "high")).toBe(true);
    expect(shouldFailOnGaps(output.report.gaps, "none")).toBe(false);
  });
});
