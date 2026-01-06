import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OllamaClient,
  detectOllama,
  listOllamaModels,
  ollamaGenerate,
} from "../src/inference/ollama-client";
import type { ModelCapabilityCache } from "../src/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock global objects for Node.js environment
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(globalThis, "performance", {
  value: {
    now: vi.fn(() => 1000), // Fixed timestamp for consistent tests
  },
  writable: true,
});

describe("OllamaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("detectOllama", () => {
    it("should return true when Ollama is accessible", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await detectOllama();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/tags", {
        signal: expect.any(AbortSignal),
      });
    });

    it("should return false when Ollama is not accessible", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection failed"));

      const result = await detectOllama();
      expect(result).toBe(false);
    });

    it("should return false when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await detectOllama();
      expect(result).toBe(false);
    });
  });

  describe("listOllamaModels", () => {
    it("should return list of models when successful", async () => {
      const mockModels = [
        { name: "llama3.2:latest", size: 1000000, digest: "abc123", modified_at: "2024-01-01" },
        { name: "mistral:latest", size: 2000000, digest: "def456", modified_at: "2024-01-02" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: mockModels }),
      });

      const result = await listOllamaModels();
      expect(result).toEqual(mockModels);
    });

    it("should return empty array when request fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await listOllamaModels();
      expect(result).toEqual([]);
    });

    it("should return empty array when no models field in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await listOllamaModels();
      expect(result).toEqual([]);
    });
  });

  describe("ollamaGenerate", () => {
    it("should generate text successfully", async () => {
      const mockResponse = {
        model: "llama3.2",
        response: "Generated text",
        done: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await ollamaGenerate({
        model: "llama3.2",
        prompt: "Test prompt",
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          prompt: "Test prompt",
          stream: false,
        }),
      });
    });

    it("should throw error when request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Server error"),
      });

      await expect(
        ollamaGenerate({
          model: "llama3.2",
          prompt: "Test prompt",
        })
      ).rejects.toThrow("Ollama generate failed (500): Server error");
    });
  });

  describe("OllamaClient class", () => {
    let client: OllamaClient;

    beforeEach(() => {
      client = new OllamaClient("llama3.2");
    });

    describe("detectLogProbSupport", () => {
      it("should return cached result when available", async () => {
        const cachedCapability: ModelCapabilityCache = {
          model: "llama3.2",
          supportsLogProbs: true,
          testedAt: new Date().toISOString(),
        };

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cachedCapability));

        const result = await client.detectLogProbSupport();
        expect(result).toBe(true);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it("should test capability when no cache exists", async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        // Mock version check (optional, called first)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: "0.1.26" }),
        });

        // Mock successful log-probability test
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              logprobs: [{ token: "Der", logprob: -1.5 }],
            }),
        });

        const result = await client.detectLogProbSupport();
        expect(result).toBe(true);

        // Verify test request was made
        expect(mockFetch).toHaveBeenCalledWith("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3.2",
            prompt: "Der",
            stream: false,
            logprobs: true,
            options: {
              num_predict: 1,
              temperature: 0,
            },
          }),
        });

        // Verify result was cached
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          "ollama_supports_logprobs_llama3.2",
          expect.stringContaining('"supportsLogProbs":true')
        );
      });

      it("should return false when log-probabilities are not supported", async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        // Mock version check
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: "0.1.26" }),
        });

        // Mock response without log-probabilities
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Der",
              logprobs: null,
            }),
        });

        const result = await client.detectLogProbSupport();
        expect(result).toBe(false);
      });

      it("should return false when test request fails", async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        // Mock version check
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: "0.1.26" }),
        });

        // Mock failed test request
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const result = await client.detectLogProbSupport();
        expect(result).toBe(false);
      });

      it("should ignore expired cache entries", async () => {
        const expiredCapability: ModelCapabilityCache = {
          model: "llama3.2",
          supportsLogProbs: true,
          testedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        };

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredCapability));

        // Mock version check
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: "0.1.26" }),
        });

        // Mock new test
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              logprobs: [{ token: "Der", logprob: -1.5 }],
            }),
        });

        const result = await client.detectLogProbSupport();
        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalled(); // Should run new test
      });
    });

    describe("getLogProbWithFallback", () => {
      it("should use exact log-probabilities when supported", async () => {
        // Mock capability detection
        mockLocalStorage.getItem.mockReturnValue(
          JSON.stringify({
            model: "llama3.2",
            supportsLogProbs: true,
            testedAt: new Date().toISOString(),
          })
        );

        // Mock log-probability response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              logprobs: [
                { token: "Hello", logprob: -1.2 },
                { token: " world", logprob: -2.1 },
              ],
            }),
        });

        const result = await client.getLogProbWithFallback("Hello world");

        expect(result.method).toBe("logprobs_exact");
        expect(result.logprob).toBeCloseTo(-1.65, 2); // Average of -1.2 and -2.1
      });

      it("should fallback to latency method when log-probabilities fail", async () => {
        // Mock capability detection showing support
        mockLocalStorage.getItem.mockReturnValue(
          JSON.stringify({
            model: "llama3.2",
            supportsLogProbs: true,
            testedAt: new Date().toISOString(),
          })
        );

        // Mock log-probability request failure, then successful fallback
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            statusText: "Log-probabilities not available",
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                prompt_eval_duration: 1000000000, // 1 second in nanoseconds
                prompt_eval_count: 2, // 2 tokens
              }),
          });

        const result = await client.getLogProbWithFallback("Hello world");

        expect(result.method).toBe("logprobs_fallback_latency");
        expect(result.logprob).toBeDefined();
        expect(typeof result.logprob).toBe("number");
      });

      it("should use latency method when model doesn't support log-probabilities", async () => {
        // Mock capability detection showing no support
        mockLocalStorage.getItem.mockReturnValue(
          JSON.stringify({
            model: "llama3.2",
            supportsLogProbs: false,
            testedAt: new Date().toISOString(),
          })
        );

        // Mock latency-based response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              prompt_eval_duration: 500000000, // 0.5 seconds in nanoseconds
              prompt_eval_count: 1,
            }),
        });

        const result = await client.getLogProbWithFallback("Test");

        expect(result.method).toBe("logprobs_fallback_latency");
        expect(result.logprob).toBeDefined();
      });

      it("should handle total request time fallback", async () => {
        mockLocalStorage.getItem.mockReturnValue(
          JSON.stringify({
            model: "llama3.2",
            supportsLogProbs: false,
            testedAt: new Date().toISOString(),
          })
        );

        // Mock response without prompt_eval metrics
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "",
            }),
        });

        // Mock performance.now to simulate request time
        const mockPerformance = vi.spyOn(globalThis.performance, "now");
        mockPerformance
          .mockReturnValueOnce(1000) // Start time
          .mockReturnValueOnce(1500); // End time (500ms later)

        const result = await client.getLogProbWithFallback("Test prompt");

        expect(result.method).toBe("logprobs_fallback_latency");
        expect(result.logprob).toBeDefined();
      });

      it("should throw error when all methods fail", async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        // Mock version check (succeeds)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: "0.1.26" }),
        });

        // Mock capability test to fail
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        // Mock the fallback latency request to also fail
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        await expect(client.getLogProbWithFallback("Test")).rejects.toThrow("Network error");
      });
    });
  });
});
