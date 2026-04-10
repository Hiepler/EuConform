import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../../src/scanner/aggregator";

const FIXTURES = resolve(__dirname, "../fixtures");

describe("scanRepository", () => {
  it("scans nextjs-openai fixture", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });

    const signalIds = result.signals.map((s) => s.id);

    // Should detect Next.js framework
    expect(signalIds.some((id) => id.includes("nextjs") || id.includes("next"))).toBe(true);

    // Should detect OpenAI provider
    expect(signalIds.some((id) => id.includes("openai"))).toBe(true);

    // Should detect AI disclosure from README
    expect(result.signals.some((s) => s.category === "compliance-disclosure")).toBe(true);
  });

  it("scans ollama-rag fixture", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "ollama-rag"),
    });

    const signalIds = result.signals.map((s) => s.id);
    const categories = result.signals.map((s) => s.category);

    // Should detect Express framework
    expect(signalIds.some((id) => id.includes("express"))).toBe(true);

    // Should detect Ollama (local inference)
    expect(categories).toContain("local-inference");

    // Should detect ChromaDB (RAG)
    expect(categories).toContain("rag");
  });

  it("scans plain-webapp fixture", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "plain-webapp"),
    });

    // Should NOT detect any AI signals
    const aiSignals = result.signals.filter(
      (s) =>
        s.category === "ai-provider" ||
        s.category === "ai-framework" ||
        s.category === "local-inference" ||
        s.category === "ai-model"
    );
    expect(aiSignals).toHaveLength(0);

    // Should have minimal signals (framework at most)
    expect(result.signals.length).toBeLessThan(10);
  });

  it("scans compliance-good fixture", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "compliance-good"),
    });

    const categories = result.signals.map((s) => s.category);

    // Should detect compliance signals for disclosure, logging, bias
    expect(categories).toContain("compliance-logging");
    // OpenAI is an AI provider
    expect(categories).toContain("ai-provider");
  });

  it("generates open questions when AI is detected", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });

    expect(result.openQuestions.length).toBeGreaterThan(0);

    // Should include the market placement question
    const marketQuestion = result.openQuestions.find((q) => q.id === "oq-market-placement");
    expect(marketQuestion).toBeDefined();
  });

  it("generates signal summary", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });

    expect(result.signalSummary.total).toBe(result.signals.length);
    expect(result.signalSummary.total).toBeGreaterThan(0);

    // byConfidence should have correct totals
    const confidenceTotal =
      result.signalSummary.byConfidence.high +
      result.signalSummary.byConfidence.medium +
      result.signalSummary.byConfidence.low;
    expect(confidenceTotal).toBe(result.signalSummary.total);
  });

  it("deduplicates signals", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });

    // Check that signal IDs are unique after deduplication
    const ids = result.signals.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("records scan scope metadata", async () => {
    const result = await scanRepository({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
      scope: "all",
    });

    expect(result.meta.scanScope).toBe("all");
  });
});
