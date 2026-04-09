import { describe, expect, it } from "vitest";
import { classifyGPAICompliance, isSystemicRiskModel } from "../src/legal-checks/gpai-classifier";
import type { QuizAnswer } from "../src/types";

/** Helper: build a full set of GPAI answers with defaults, then override specific ones */
function buildAnswers(overrides: Record<string, string> = {}): QuizAnswer[] {
  const defaults: Record<string, string> = {
    "gpai-technical-docs": "yes",
    "gpai-downstream-info": "yes",
    "gpai-copyright-policy": "yes",
    "gpai-eu-database": "yes",
    "gpai-open-source": "no",
    "gpai-systemic-risk": "no",
    "gpai-red-teaming": "yes",
    "gpai-incident-reporting": "yes",
    "gpai-cybersecurity": "yes",
  };
  const merged = { ...defaults, ...overrides };
  return Object.entries(merged).map(([questionId, value]) => ({
    questionId,
    value,
  }));
}

describe("classifyGPAICompliance", () => {
  describe("open-source path (Art. 53(2))", () => {
    it("flags copyright-policy as missing when open-source answers 'no'", () => {
      const answers = buildAnswers({
        "gpai-open-source": "yes",
        "gpai-copyright-policy": "no",
      });
      const result = classifyGPAICompliance(answers);
      const flag = result.flags.find((f) => f.obligation === "copyright-policy");
      expect(flag).toBeDefined();
      expect(flag!.status).toBe("missing");
      expect(flag!.articleRef).toBe("Art. 53(1)(d)");
    });

    it("flags copyright-policy as partial when open-source answers 'unsure'", () => {
      const answers = buildAnswers({
        "gpai-open-source": "yes",
        "gpai-copyright-policy": "unsure",
      });
      const result = classifyGPAICompliance(answers);
      const flag = result.flags.find((f) => f.obligation === "copyright-policy");
      expect(flag).toBeDefined();
      expect(flag!.status).toBe("partial");
      expect(flag!.articleRef).toBe("Art. 53(1)(d)");
    });

    it("does NOT flag copyright-policy when open-source answers 'yes'", () => {
      const answers = buildAnswers({
        "gpai-open-source": "yes",
        "gpai-copyright-policy": "yes",
      });
      const result = classifyGPAICompliance(answers);
      const flag = result.flags.find((f) => f.obligation === "copyright-policy");
      expect(flag).toBeUndefined();
    });

    it("exempts technical-docs and downstream-info for open-source", () => {
      const answers = buildAnswers({
        "gpai-open-source": "yes",
        "gpai-technical-docs": "no",
        "gpai-downstream-info": "no",
      });
      const result = classifyGPAICompliance(answers);
      expect(result.flags.find((f) => f.obligation === "technical-docs")).toBeUndefined();
      expect(result.flags.find((f) => f.obligation === "downstream-info")).toBeUndefined();
    });

    it("includes explanatory note for open-source copyright gap", () => {
      const answers = buildAnswers({
        "gpai-open-source": "yes",
        "gpai-copyright-policy": "unsure",
      });
      const result = classifyGPAICompliance(answers);
      expect(result.notes.some((n) => n.includes("Art. 53(1)(d)"))).toBe(true);
    });
  });

  describe("non-open-source path", () => {
    it("flags all three Art. 53(1) obligations when missing", () => {
      const answers = buildAnswers({
        "gpai-technical-docs": "no",
        "gpai-downstream-info": "no",
        "gpai-copyright-policy": "no",
        "gpai-eu-database": "no",
      });
      const result = classifyGPAICompliance(answers);
      expect(result.level).toBe("non-compliant");
      expect(result.flags.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("systemic risk (Art. 51)", () => {
    it("detects systemic risk model", () => {
      const answers = buildAnswers({ "gpai-systemic-risk": "yes" });
      expect(isSystemicRiskModel(answers)).toBe(true);
    });

    it("flags Art. 55 obligations when systemic risk and missing", () => {
      const answers = buildAnswers({
        "gpai-systemic-risk": "yes",
        "gpai-red-teaming": "no",
        "gpai-incident-reporting": "no",
        "gpai-cybersecurity": "no",
      });
      const result = classifyGPAICompliance(answers);
      expect(result.isSystemicRisk).toBe(true);
      expect(result.flags.find((f) => f.obligation === "red-teaming")).toBeDefined();
      expect(result.flags.find((f) => f.obligation === "incident-reporting")).toBeDefined();
      expect(result.flags.find((f) => f.obligation === "cybersecurity")).toBeDefined();
    });
  });

  describe("fully compliant", () => {
    it("returns compliant with no flags when all obligations met", () => {
      const answers = buildAnswers();
      const result = classifyGPAICompliance(answers);
      expect(result.level).toBe("compliant");
      expect(result.flags).toHaveLength(0);
    });
  });
});
