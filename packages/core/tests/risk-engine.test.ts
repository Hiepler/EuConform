import { describe, expect, it } from "vitest";
import { RISK_QUIZ_QUESTIONS, classifyRisk, getQuizQuestions } from "../src/risk-engine";
import type { QuizAnswer } from "../src/types";

describe("Risk Engine", () => {
  describe("getQuizQuestions", () => {
    it("should return all quiz questions", () => {
      const questions = getQuizQuestions();
      expect(questions).toHaveLength(6);
      expect(questions).toEqual(RISK_QUIZ_QUESTIONS);
    });

    it("should have valid question structure", () => {
      const questions = getQuizQuestions();
      for (const question of questions) {
        expect(question.id).toBeDefined();
        expect(question.question).toBeDefined();
        expect(question.options.length).toBeGreaterThan(0);
      }
    });
  });

  describe("classifyRisk - Prohibited Practices", () => {
    it("should classify subliminal manipulation as unacceptable", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "other" },
        { questionId: "subliminal", value: "yes" },
        { questionId: "vulnerability", value: "no" },
        { questionId: "social-scoring", value: "no" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "full" },
      ];

      const result = classifyRisk(answers);
      expect(result.level).toBe("unacceptable");
      expect(result.flags.some((f) => f.articleReference === "Article 5(1)(a)")).toBe(true);
    });

    it("should classify vulnerability exploitation as unacceptable", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "other" },
        { questionId: "subliminal", value: "no" },
        { questionId: "vulnerability", value: "yes" },
        { questionId: "social-scoring", value: "no" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "full" },
      ];

      const result = classifyRisk(answers);
      expect(result.level).toBe("unacceptable");
    });

    it("should classify social scoring as unacceptable", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "other" },
        { questionId: "subliminal", value: "no" },
        { questionId: "vulnerability", value: "no" },
        { questionId: "social-scoring", value: "yes" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "full" },
      ];

      const result = classifyRisk(answers);
      expect(result.level).toBe("unacceptable");
    });
  });

  describe("classifyRisk - High Risk", () => {
    it("should classify biometric identification system as high risk", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "biometric" },
        { questionId: "subliminal", value: "no" },
        { questionId: "vulnerability", value: "no" },
        { questionId: "social-scoring", value: "no" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "full" },
      ];

      const result = classifyRisk(answers);
      expect(result.level).toBe("high");
      expect(result.category).toBe("biometric-identification");
    });

    it("should classify employment AI as high risk", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "employment" },
        { questionId: "subliminal", value: "no" },
        { questionId: "vulnerability", value: "no" },
        { questionId: "social-scoring", value: "no" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "limited" },
      ];

      const result = classifyRisk(answers);
      expect(result.level).toBe("high");
      expect(result.category).toBe("employment-workers");
    });
  });

  describe("classifyRisk - Limited Risk", () => {
    it("should classify chatbot as limited risk", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "chatbot" },
        { questionId: "subliminal", value: "no" },
        { questionId: "vulnerability", value: "no" },
        { questionId: "social-scoring", value: "no" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "full" },
      ];

      const result = classifyRisk(answers);
      expect(result.level).toBe("limited");
      expect(result.legalBasis).toContain("Article 50 - Transparency Obligations");
    });
  });

  describe("classifyRisk - Minimal Risk", () => {
    it("should classify general purpose system with good oversight as minimal", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "other" },
        { questionId: "subliminal", value: "no" },
        { questionId: "vulnerability", value: "no" },
        { questionId: "social-scoring", value: "no" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "full" },
      ];

      const result = classifyRisk(answers);
      expect(result.level).toBe("minimal");
    });
  });

  describe("Risk Score Calculation", () => {
    it("should return score between 0 and 100", () => {
      const answers: QuizAnswer[] = [
        { questionId: "purpose", value: "other" },
        { questionId: "subliminal", value: "no" },
        { questionId: "vulnerability", value: "no" },
        { questionId: "social-scoring", value: "no" },
        { questionId: "biometric-realtime", value: "no" },
        { questionId: "human-oversight", value: "full" },
      ];

      const result = classifyRisk(answers);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
