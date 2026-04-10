import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { generateScanOutput } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildCiReport, renderCiSummaryMarkdown, writeCiArtifacts } from "../src/output/ci";

const FIXTURES = resolve(import.meta.dirname, "../../core/tests/fixtures");
const TMP_DIR = resolve(import.meta.dirname, "../.tmp-test-ci");

describe("CLI CI output", () => {
  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    // biome-ignore lint/performance/noDelete: env cleanup requires actual property deletion, not assignment
    delete process.env.GITHUB_STEP_SUMMARY;
    await rm(TMP_DIR, { recursive: true, force: true });
    await mkdir(TMP_DIR, { recursive: true });
    vi.restoreAllMocks();
  });

  it("builds a CI report with actual scope and artifact inventory", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
      scope: "all",
    });
    const output = generateScanOutput(scanResult);
    const ciReport = buildCiReport(output, "high", "all", [
      "euconform.report.json",
      "euconform.aibom.json",
      "euconform.summary.md",
    ]);

    expect(ciReport.schemaVersion).toBe("euconform.ci.v1");
    expect(ciReport.scanScope).toBe("all");
    expect(ciReport.artifacts).toContain("euconform.ci.json");
    expect(ciReport.artifacts).toContain("euconform.summary.md");
  });

  it("renders a CI markdown summary with compliance overview", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "ollama-rag"),
    });
    const output = generateScanOutput(scanResult);
    const ciReport = buildCiReport(output, "medium", "production", [
      "euconform.report.json",
      "euconform.aibom.json",
      "euconform.summary.md",
    ]);

    const markdown = renderCiSummaryMarkdown(output, ciReport);
    expect(markdown).toContain("## EuConform Compliance Scan");
    expect(markdown).toContain("**Scan Scope:** production");
    expect(markdown).toContain("### Compliance Overview");
    expect(markdown).toContain("`euconform.ci-summary.md`");
  });

  it("writes GitHub CI artifacts and step summary", async () => {
    const outDir = resolve(TMP_DIR, "github");
    const stepSummaryPath = resolve(TMP_DIR, "github-step-summary.md");
    process.env.GITHUB_STEP_SUMMARY = stepSummaryPath;

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((() => true) as never);

    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);
    const artifacts = await writeCiArtifacts(output, outDir, "high", "github", "production", [
      "euconform.report.json",
      "euconform.aibom.json",
      "euconform.summary.md",
    ]);

    expect(artifacts).not.toBeNull();
    expect(existsSync(resolve(outDir, "euconform.ci.json"))).toBe(true);
    expect(existsSync(resolve(outDir, "euconform.ci-summary.md"))).toBe(true);
    expect(existsSync(stepSummaryPath)).toBe(true);

    const ciReport = JSON.parse(await readFile(resolve(outDir, "euconform.ci.json"), "utf-8"));
    expect(ciReport.scanScope).toBe("production");
    expect(ciReport.artifacts).toContain("euconform.ci.json");

    const stepSummary = await readFile(stepSummaryPath, "utf-8");
    expect(stepSummary).toContain("## EuConform Compliance Scan");
    expect(stepSummary).toContain("**CI Status:**");
    expect(stdoutSpy).toHaveBeenCalled();
  });
});
