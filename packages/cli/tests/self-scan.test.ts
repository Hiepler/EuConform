import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { generateScanOutput } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeOutputFiles } from "../src/output/writer";

const MONOREPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = resolve(import.meta.dirname, "../.tmp-test-self-scan");

describe("EuConform self-scan", () => {
  let output: Awaited<ReturnType<typeof generateScanOutput>>;

  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });

    const scanResult = await scanRepository({
      targetPath: MONOREPO_ROOT,
    });
    output = generateScanOutput(scanResult);
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("self-scan detects AI components", () => {
    expect(output.report.aiFootprint.usesAI).toBe(true);
  });

  it("self-scan detects known frameworks", () => {
    const stack = output.report.target.detectedStack.map((s) => s.toLowerCase());
    const stackStr = stack.join(" ");

    // The monorepo uses Next.js, React, and TypeScript
    expect(
      stack.some((s) => s.includes("next") || s.includes("react") || s.includes("typescript"))
    ).toBe(true);

    // Should detect at least 2 of the expected frameworks
    const found = [
      stackStr.includes("next"),
      stackStr.includes("react"),
      stackStr.includes("typescript"),
    ].filter(Boolean);
    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  it("self-scan detects local inference", () => {
    const inferenceModes = output.report.aiFootprint.inferenceModes;
    const providerHints = output.report.aiFootprint.providerHints;

    // The monorepo has Ollama and/or transformers usage
    const hasLocalInference = inferenceModes.some(
      (m) => m.includes("ollama") || m.includes("transformers")
    );
    const hasAnyProvider = providerHints.length > 0;

    expect(hasLocalInference || hasAnyProvider).toBe(true);
  });

  it("self-scan detects bias testing infrastructure", () => {
    const biasStatus = output.report.complianceSignals.biasTesting.status;
    // The monorepo has bias testing infrastructure
    expect(["present", "partial"]).toContain(biasStatus);
  });

  it("self-scan excludes tests, examples, and detector source from compliance evidence", () => {
    const complianceEvidence = Object.values(output.report.complianceSignals).flatMap(
      (group) => group.evidence
    );

    expect(
      complianceEvidence.some((e) => e.file.includes("/tests/") || e.file.includes("examples/"))
    ).toBe(false);
    expect(complianceEvidence.some((e) => e.file.includes("src/scanner/detectors/"))).toBe(false);
  });

  it("self-scan produces valid output files", async () => {
    const outDir = resolve(TMP_DIR, "self-scan-output");
    await writeOutputFiles(output, outDir, "all");

    expect(existsSync(resolve(outDir, "euconform.report.json"))).toBe(true);
    expect(existsSync(resolve(outDir, "euconform.aibom.json"))).toBe(true);
    expect(existsSync(resolve(outDir, "euconform.summary.md"))).toBe(true);

    // Verify JSON is parseable
    const report = JSON.parse(await readFile(resolve(outDir, "euconform.report.json"), "utf-8"));
    expect(report.schemaVersion).toBe("euconform.report.v1");

    const aibom = JSON.parse(await readFile(resolve(outDir, "euconform.aibom.json"), "utf-8"));
    expect(aibom.schemaVersion).toBe("euconform.aibom.v1");

    const md = await readFile(resolve(outDir, "euconform.summary.md"), "utf-8");
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain("# EuConform Scan Report");
  });

  it("self-scan report has correct schema version", () => {
    expect(output.report.schemaVersion).toBe("euconform.report.v1");
  });
});
