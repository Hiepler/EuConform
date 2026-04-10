import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateScanOutput } from "../../src/evidence/output";
import { scanRepository } from "../../src/scanner/aggregator";

const FIXTURES = resolve(import.meta.dirname, "../fixtures");

describe("generateSummaryMarkdown", () => {
  it("includes disclaimer text", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.summaryMarkdown).toContain("technical guidance only");
    expect(output.summaryMarkdown).toContain("does not constitute legal advice");
    expect(output.summaryMarkdown).toContain("Scan scope: `production`");
  });

  it("includes project overview section", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.summaryMarkdown).toContain("## Project Overview");
    expect(output.summaryMarkdown).toContain(output.report.target.name);
  });

  it("includes AI components section", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.summaryMarkdown).toContain("## AI Components Detected");
    // Table headers
    expect(output.summaryMarkdown).toContain("| Component |");
    expect(output.summaryMarkdown).toContain("| Kind |");
  });

  it("includes compliance signals table", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.summaryMarkdown).toContain("## Compliance Signals");
    expect(output.summaryMarkdown).toContain("| Area | Status |");
  });

  it("includes open questions section", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.summaryMarkdown).toContain("## Open Questions");
  });

  it("includes recommended actions section", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.summaryMarkdown).toContain("## Recommended Actions");
  });

  it("includes footer with artifact references", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });
    const output = generateScanOutput(scanResult);

    expect(output.summaryMarkdown).toContain("euconform.report.json");
    expect(output.summaryMarkdown).toContain("euconform.aibom.json");
  });

  it("handles project with no AI components", async () => {
    const scanResult = await scanRepository({
      targetPath: resolve(FIXTURES, "plain-webapp"),
    });
    const output = generateScanOutput(scanResult);

    // plain-webapp still lists framework components (e.g. express) in the BOM,
    // but the report should indicate no AI is being used
    expect(output.report.aiFootprint.usesAI).toBe(false);
    // Assessment hints section should reflect no AI detected
    expect(output.summaryMarkdown).toContain("No assessment hints generated (no AI detected)");
  });
});
