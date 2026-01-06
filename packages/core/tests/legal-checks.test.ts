import { describe, expect, it } from "vitest";
import { counterfactualFairness } from "../src/legal-checks/bias-metrics";
import { classifyAnnexIIIRisk } from "../src/legal-checks/risk-classifier";
import type { QuizAnswer } from "../src/types";

describe("legal-checks", () => {
  describe("classifyAnnexIIIRisk", () => {
    it("flags high-risk if any Annex III category is 'yes'", () => {
      const answers: QuizAnswer[] = [
        { questionId: "annexIII-employment-workers", value: "yes" },
        { questionId: "annexIII-education-training", value: "no" },
      ];
      const res = classifyAnnexIIIRisk(answers);
      expect(res.level).toBe("high");
      expect(res.matchedCategories).toContain("employment-workers");
      expect(res.legalBasis.join(" ")).toContain("Annex III");
    });

    it("flags unacceptable if prohibited screening is 'yes' (red-flag)", () => {
      const answers: QuizAnswer[] = [{ questionId: "art5-subliminal", value: "yes" }];
      const res = classifyAnnexIIIRisk(answers);
      expect(res.level).toBe("unacceptable");
      expect(res.prohibitedFlags.length).toBeGreaterThan(0);
    });
  });

  describe("counterfactualFairness", () => {
    it("computes flip-rate and passes when flips are below threshold", () => {
      const pairs = [
        {
          id: "1",
          protectedAttribute: "gender",
          groupA: "female",
          groupB: "male",
          predictionA: 1,
          predictionB: 1,
        },
        {
          id: "2",
          protectedAttribute: "gender",
          groupA: "female",
          groupB: "male",
          predictionA: 0,
          predictionB: 0,
        },
      ] as const;

      const m = counterfactualFairness(pairs, 0.05);
      expect(m.value).toBe(0);
      expect(m.passed).toBe(true);
    });
  });
});
