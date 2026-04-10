import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateScanOutput } from "../../src/evidence/output";
import { scanRepository } from "../../src/scanner/aggregator";

const FIXTURES = resolve(__dirname, "../fixtures");
const MONOREPO_ROOT = resolve(__dirname, "../../../..");

describe("generateScanOutput", () => {
  it("generates valid report schema for AI project", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.report.schemaVersion).toBe("euconform.report.v1");
    expect(output.report.generatedAt).toBeTruthy();
    expect(output.report.tool.name).toBe("euconform");
    expect(output.report.tool.version).toBeTruthy();
    expect(output.report.target.rootPath).toBeTruthy();
    expect(output.report.target.name).toBeTruthy();
    expect(output.report.aiFootprint).toBeDefined();
    expect(output.report.complianceSignals).toBeDefined();
    expect(output.report.assessmentHints).toBeDefined();
    expect(output.report.gaps).toBeDefined();
    expect(output.report.recommendationSummary).toBeDefined();
  });

  it("keeps documentation-only disclosure as a hint, not an implementation", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.report.complianceSignals.disclosure.status).toBe("absent");
    expect(
      output.report.assessmentHints.riskIndicators.some((hint) =>
        hint.hint.toLowerCase().includes("documentation references ai disclosure")
      )
    ).toBe(true);
  });

  it("generates valid AIBOM schema", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.aibom.schemaVersion).toBe("euconform.aibom.v1");
    expect(output.aibom.project.name).toBeTruthy();
    expect(Array.isArray(output.aibom.components)).toBe(true);
    expect(output.aibom.components.length).toBeGreaterThan(0);

    // Each component should have required fields
    for (const comp of output.aibom.components) {
      expect(comp.id).toBeTruthy();
      expect(comp.kind).toBeTruthy();
      expect(comp.name).toBeTruthy();
      expect(comp.source).toBeTruthy();
    }
  });

  it("generates stable, readable AIBOM component ids", async () => {
    const scanResult = await scanRepository({
      targetPath: MONOREPO_ROOT,
    });
    const output = generateScanOutput(scanResult);
    const ids = output.aibom.components.map((component) => component.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => !id.includes("--"))).toBe(true);
    expect(ids.every((id) => id.includes(":"))).toBe(true);
  });

  it("derives export capabilities from reporting signals", async () => {
    const scanResult = await scanRepository({
      targetPath: MONOREPO_ROOT,
    });
    const output = generateScanOutput(scanResult);

    const reportingEvidence = output.report.complianceSignals.reportingExports.evidence;
    expect(output.aibom.complianceCapabilities.jsonExport).toBe(
      reportingEvidence.some(
        (e) => e.file.includes(".json") || e.snippet.toLowerCase().includes("json")
      )
    );
  });

  it("generates summary markdown", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(typeof output.summaryMarkdown).toBe("string");
    expect(output.summaryMarkdown.length).toBeGreaterThan(0);

    // Should contain expected markdown sections
    expect(output.summaryMarkdown).toContain("# EuConform Scan Report");
    expect(output.summaryMarkdown).toContain("## Project Overview");
    expect(output.summaryMarkdown).toContain("## AI Components Detected");
    expect(output.summaryMarkdown).toContain("## Compliance Signals");
  });

  it("reports AI detected = true for AI project", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.report.aiFootprint.usesAI).toBe(true);
    expect(output.report.aiFootprint.providerHints.length).toBeGreaterThan(0);
  });

  it("reports AI detected = false for plain webapp", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "plain-webapp"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.report.aiFootprint.usesAI).toBe(false);
    expect(output.report.aiFootprint.providerHints).toHaveLength(0);
    expect(output.report.aiFootprint.inferenceModes).toHaveLength(0);
  });

  it("generates gaps for AI project without compliance signals", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    // nextjs-openai has AI but minimal compliance infrastructure,
    // so gaps should be generated
    expect(output.report.gaps.length).toBeGreaterThan(0);

    // Each gap should have required fields
    for (const gap of output.report.gaps) {
      expect(gap.id).toBeTruthy();
      expect(gap.title).toBeTruthy();
      expect(gap.description).toBeTruthy();
      expect(["critical", "high", "medium", "low"]).toContain(gap.priority);
      expect(["missing", "partial"]).toContain(gap.status);
      expect(gap.basis).toBe("scanner-rule");
    }
  });

  it("generates no gaps for plain webapp", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "plain-webapp"),
    });
    const output = generateScanOutput(scanResult);

    // No AI detected means no compliance gaps
    expect(output.report.gaps).toHaveLength(0);
  });

  it("includes compliance signals in report", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "compliance-good"),
    });
    const output = generateScanOutput(scanResult);

    const { complianceSignals } = output.report;

    // compliance-good has logging (pino) and incident reporting (sentry)
    // At least some compliance areas should not be "absent"
    const statuses = Object.values(complianceSignals).map((g) => g.status);
    const nonAbsent = statuses.filter((s) => s === "present" || s === "partial");
    expect(nonAbsent.length).toBeGreaterThan(0);
  });

  it("includes recommendations", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.report.recommendationSummary.length).toBeGreaterThan(0);

    // Should contain wizard recommendation or be capped at 5 entries
    const hasWizard = output.report.recommendationSummary.some((r) =>
      r.toLowerCase().includes("wizard")
    );
    // The list is capped at 5 — wizard may be trimmed for projects with many gaps
    if (output.report.recommendationSummary.length < 5) {
      expect(hasWizard).toBe(true);
    }
    expect(output.report.recommendationSummary.length).toBeLessThanOrEqual(5);
  });

  it("uses softened GPAI wording for cloud providers", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(
      output.report.assessmentHints.gpaiIndicators.some((hint) =>
        hint.hint.includes("Provider obligations depend on your role")
      )
    ).toBe(true);
  });
});
