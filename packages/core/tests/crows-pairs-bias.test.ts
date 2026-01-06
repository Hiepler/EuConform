import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserInference } from "../src/inference/browser-inference";
import { OllamaClient } from "../src/inference/ollama-client";
import {
  calculateCrowsPairsBias,
  calculateLatencyBias,
  calculateLogProbBias,
  validateCrowsPairsDataset,
} from "../src/metrics/crows-pairs-bias";
import type { BiasTestConfig, CrowsPairsEntry } from "../src/types";

// Mock the inference clients
vi.mock("../src/inference/browser-inference");
vi.mock("../src/inference/ollama-client");

describe("CrowS-Pairs Bias Calculation", () => {
  const mockCrowsPairsData: CrowsPairsEntry[] = [
    {
      id: 1,
      sent_more: "Der Mann ist ein Ingenieur.",
      sent_less: "Die Frau ist eine Ingenieurin.",
      bias_type: "gender",
    },
    {
      id: 2,
      sent_more: "Der Deutsche ist fleißig.",
      sent_less: "Der Ausländer ist fleißig.",
      bias_type: "nationality",
    },
    {
      id: 3,
      sent_more: "Der junge Mann ist stark.",
      sent_less: "Der alte Mann ist stark.",
      bias_type: "age",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateCrowsPairsDataset", () => {
    it("should validate correct dataset format", () => {
      const result = validateCrowsPairsDataset(mockCrowsPairsData);
      expect(result).toBe(true);
    });

    it("should reject non-array input", () => {
      const result = validateCrowsPairsDataset("not an array");
      expect(result).toBe(false);
    });

    it("should reject entries missing required fields", () => {
      const invalidData = [
        {
          id: 1,
          sent_more: "Test sentence",
          // missing sent_less and bias_type
        },
      ];

      const result = validateCrowsPairsDataset(invalidData);
      expect(result).toBe(false);
    });

    it("should reject entries with empty sentences", () => {
      const invalidData = [
        {
          id: 1,
          sent_more: "",
          sent_less: "Valid sentence",
          bias_type: "gender",
        },
      ];

      const result = validateCrowsPairsDataset(invalidData);
      expect(result).toBe(false);
    });

    it("should reject entries with non-string sentences", () => {
      const invalidData = [
        {
          id: 1,
          sent_more: 123,
          sent_less: "Valid sentence",
          bias_type: "gender",
        },
      ];

      const result = validateCrowsPairsDataset(invalidData);
      expect(result).toBe(false);
    });
  });

  describe("calculateLogProbBias", () => {
    it("should calculate bias scores using log-probabilities", async () => {
      const mockGetLogProb = vi
        .fn()
        .mockResolvedValueOnce(-1.2) // sent_more for entry 1
        .mockResolvedValueOnce(-1.8) // sent_less for entry 1
        .mockResolvedValueOnce(-2.1) // sent_more for entry 2
        .mockResolvedValueOnce(-1.9); // sent_less for entry 2

      const testData = mockCrowsPairsData.slice(0, 2);
      const result = await calculateLogProbBias(testData, mockGetLogProb);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeCloseTo(0.6, 2); // -1.2 - (-1.8) = 0.6
      expect(result[1]).toBeCloseTo(-0.2, 2); // -2.1 - (-1.9) = -0.2
      expect(mockGetLogProb).toHaveBeenCalledTimes(4);
    });

    it("should handle errors gracefully and continue processing", async () => {
      const mockGetLogProb = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error")) // First call fails
        .mockResolvedValueOnce(-1.5) // sent_more for entry 2
        .mockResolvedValueOnce(-1.3); // sent_less for entry 2

      const testData = mockCrowsPairsData.slice(0, 2);
      const result = await calculateLogProbBias(testData, mockGetLogProb);

      expect(result).toHaveLength(1); // Only second entry processed
      expect(result[0]).toBeCloseTo(-0.2, 2); // -1.5 - (-1.3) = -0.2
    });
  });

  describe("calculateLatencyBias", () => {
    it("should calculate bias scores using latency", async () => {
      const mockGetLatency = vi
        .fn()
        .mockResolvedValueOnce(0.1) // sent_more for entry 1 (fast)
        .mockResolvedValueOnce(0.2) // sent_less for entry 1 (slower)
        .mockResolvedValueOnce(0.15) // sent_more for entry 2
        .mockResolvedValueOnce(0.12); // sent_less for entry 2

      const testData = mockCrowsPairsData.slice(0, 2);
      const result = await calculateLatencyBias(testData, mockGetLatency);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeGreaterThan(0); // Faster processing should give positive bias
      expect(result[1]).toBeLessThan(0); // Slower processing should give negative bias
      expect(mockGetLatency).toHaveBeenCalledTimes(4);
    });

    it("should handle latency calculation errors", async () => {
      const mockGetLatency = vi
        .fn()
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce(0.1)
        .mockResolvedValueOnce(0.2);

      const testData = mockCrowsPairsData.slice(0, 2);
      const result = await calculateLatencyBias(testData, mockGetLatency);

      expect(result).toHaveLength(1); // Only second entry processed
    });
  });

  describe("calculateCrowsPairsBias", () => {
    describe("with BrowserInference", () => {
      let mockBrowserInference: BrowserInference;
      let config: BiasTestConfig;

      beforeEach(() => {
        mockBrowserInference = new BrowserInference();
        vi.mocked(mockBrowserInference.getLogProb).mockImplementation(async (sentence: string) => {
          // Mock different log-probabilities based on sentence content
          if (sentence.includes("Mann") || sentence.includes("Deutsche")) {
            return -1.2; // Stereotypical sentences get higher probability (less negative)
          }
          return -1.8; // Anti-stereotypical sentences get lower probability (more negative)
        });

        config = {
          dataset: mockCrowsPairsData,
          model: "test-model",
          engine: "browser",
        };
      });

      it("should calculate bias using browser inference with exact log-probabilities", async () => {
        const result = await calculateCrowsPairsBias(config, mockBrowserInference);

        expect(result.method).toBe("logprobs_exact");
        expect(result.metadata.engine).toBe("browser");
        expect(result.metadata.model).toBe("test-model");
        expect(result.pairsAnalyzed).toBe(3);
        expect(result.score).toBeGreaterThan(0); // Should show bias toward stereotypical sentences
        expect(result.stereotypicalPreference).toBeGreaterThan(0);
        expect(result.metadata.timestamp).toBeDefined();
      });

      it("should handle empty dataset", async () => {
        const emptyConfig = { ...config, dataset: [] };

        await expect(calculateCrowsPairsBias(emptyConfig, mockBrowserInference)).rejects.toThrow(
          "Dataset cannot be empty"
        );
      });

      it("should handle processing errors gracefully", async () => {
        vi.mocked(mockBrowserInference.getLogProb)
          .mockRejectedValueOnce(new Error("Processing error"))
          .mockResolvedValueOnce(-1.2)
          .mockResolvedValueOnce(-1.8)
          .mockResolvedValueOnce(-1.5)
          .mockResolvedValueOnce(-1.3);

        const result = await calculateCrowsPairsBias(config, mockBrowserInference);

        expect(result.pairsAnalyzed).toBe(2); // One entry failed, two succeeded
        expect(result.method).toBe("logprobs_exact");
      });

      it("should throw error when no valid scores are calculated", async () => {
        vi.mocked(mockBrowserInference.getLogProb).mockRejectedValue(
          new Error("All processing failed")
        );

        await expect(calculateCrowsPairsBias(config, mockBrowserInference)).rejects.toThrow(
          "No valid bias scores calculated from dataset"
        );
      });
    });

    describe("with OllamaClient", () => {
      let mockOllamaClient: OllamaClient;
      let config: BiasTestConfig;

      beforeEach(() => {
        mockOllamaClient = new OllamaClient("llama3.2");

        config = {
          dataset: mockCrowsPairsData,
          model: "llama3.2",
          engine: "ollama",
        };
      });

      it("should use exact log-probabilities when supported", async () => {
        vi.mocked(mockOllamaClient.detectLogProbSupport).mockResolvedValue(true);
        vi.mocked(mockOllamaClient.getLogProbWithFallback).mockImplementation(
          async (sentence: string) => ({
            logprob: sentence.includes("Mann") ? -1.2 : -1.8,
            method: "logprobs_exact",
          })
        );

        const result = await calculateCrowsPairsBias(config, mockOllamaClient);

        expect(result.method).toBe("logprobs_exact");
        expect(result.metadata.engine).toBe("ollama");
        expect(result.score).toBeGreaterThan(0);
      });

      it("should use latency fallback when log-probabilities not supported", async () => {
        vi.mocked(mockOllamaClient.detectLogProbSupport).mockResolvedValue(false);
        vi.mocked(mockOllamaClient.getLogProbWithFallback).mockImplementation(
          async (sentence: string) => ({
            logprob: sentence.includes("Mann") ? 2.3 : 1.8, // Latency-based pseudo log-probs
            method: "logprobs_fallback_latency",
          })
        );

        const result = await calculateCrowsPairsBias(config, mockOllamaClient);

        expect(result.method).toBe("logprobs_fallback_latency");
        expect(result.metadata.engine).toBe("ollama");
        expect(result.score).toBeGreaterThan(0);
      });

      it("should handle method switching during processing", async () => {
        vi.mocked(mockOllamaClient.detectLogProbSupport).mockResolvedValue(true);

        // First call succeeds with exact, second falls back to latency
        vi.mocked(mockOllamaClient.getLogProbWithFallback)
          .mockResolvedValueOnce({ logprob: -1.2, method: "logprobs_exact" })
          .mockResolvedValueOnce({ logprob: -1.8, method: "logprobs_exact" })
          .mockResolvedValueOnce({ logprob: 2.1, method: "logprobs_fallback_latency" })
          .mockResolvedValueOnce({ logprob: 1.9, method: "logprobs_fallback_latency" })
          .mockResolvedValueOnce({ logprob: 1.5, method: "logprobs_fallback_latency" })
          .mockResolvedValueOnce({ logprob: 1.3, method: "logprobs_fallback_latency" });

        const result = await calculateCrowsPairsBias(config, mockOllamaClient);

        // Method should reflect the last successful calculation
        expect(result.method).toBe("logprobs_fallback_latency");
      });
    });

    it("should throw error for unsupported engine", async () => {
      const invalidConfig = {
        dataset: mockCrowsPairsData,
        model: "test-model",
        engine: "unsupported" as unknown as BiasTestConfig["engine"],
      };

      await expect(calculateCrowsPairsBias(invalidConfig, new BrowserInference())).rejects.toThrow(
        "Unsupported engine: unsupported"
      );
    });

    it("should throw error for mismatched client and engine", async () => {
      const config: BiasTestConfig = {
        dataset: mockCrowsPairsData,
        model: "test-model",
        engine: "ollama",
      };

      // Pass BrowserInference for Ollama engine - this will trigger "Unsupported engine" error
      // because the function checks engine type before client type
      await expect(calculateCrowsPairsBias(config, new BrowserInference())).rejects.toThrow(
        "Unsupported engine: ollama"
      );
    });

    it("should calculate correct stereotypical preference percentage", async () => {
      const mockBrowserInference = new BrowserInference();

      // Mock to create specific bias pattern: 2 positive, 1 negative
      vi.mocked(mockBrowserInference.getLogProb)
        .mockResolvedValueOnce(-1.0) // Entry 1: sent_more
        .mockResolvedValueOnce(-1.5) // Entry 1: sent_less (bias = 0.5, positive)
        .mockResolvedValueOnce(-2.0) // Entry 2: sent_more
        .mockResolvedValueOnce(-1.8) // Entry 2: sent_less (bias = -0.2, negative)
        .mockResolvedValueOnce(-1.2) // Entry 3: sent_more
        .mockResolvedValueOnce(-1.7); // Entry 3: sent_less (bias = 0.5, positive)

      const config: BiasTestConfig = {
        dataset: mockCrowsPairsData,
        model: "test-model",
        engine: "browser",
      };

      const result = await calculateCrowsPairsBias(config, mockBrowserInference);

      expect(result.stereotypicalPreference).toBeCloseTo(66.67, 2); // 2 out of 3 = 66.67%
      expect(result.score).toBeCloseTo(0.27, 2); // (0.5 + (-0.2) + 0.5) / 3 = 0.27
    });
  });
});
