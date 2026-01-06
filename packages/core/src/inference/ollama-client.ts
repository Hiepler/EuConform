/**
 * Ollama Client for local LLM inference
 * Connects to Ollama running on localhost:11434
 */

import type { BiasCalculationMethod, ModelCapabilityCache } from "../types";

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface OllamaGenerateOptions {
  model: string;
  prompt: string;
  stream?: boolean;
  logprobs?: boolean | number;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  eval_count?: number;
  logprobs?: Array<{
    token: string;
    logprob: number;
  }>;
}

export interface OllamaLogProbResponse {
  model: string;
  prompt: string;
  logprob: number;
}

export interface OllamaLogProbsOptions {
  logprobs?: boolean | number;
}

export interface OllamaLogProbsResponse extends OllamaGenerateResponse {
  logprobs?: Array<{
    token: string;
    logprob: number;
  }>;
}

const OLLAMA_BASE_URL = "http://localhost:11434";

/**
 * Check if Ollama is running and accessible
 */
export async function detectOllama(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get list of available models from Ollama
 */
export async function listOllamaModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error("Failed to list Ollama models:", error);
    return [];
  }
}

/**
 * Generate text with Ollama
 */
export async function ollamaGenerate(
  options: OllamaGenerateOptions
): Promise<OllamaGenerateResponse> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...options,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama generate failed (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get log probability for a prompt (for bias scoring)
 * Uses the /api/generate endpoint with num_predict: 0 to get prompt logprobs
 */
export async function getLogProb(model: string, prompt: string): Promise<number> {
  try {
    // Use generate with num_predict: 0 to ONLY evaluate the prompt
    // This forces the model to process the input tokens, giving us prompt_eval metrics
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          num_predict: 0, // Don't generate, just evaluate prompt
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get logprob for model '${model}': ${errorText || response.statusText}`
      );
    }

    const data = await response.json();

    // Optimization: Use prompt_eval metrics (processing time of the input)
    // This is a better proxy for "perplexity" or "likelihood" of the sentence than generation speed
    if (data.prompt_eval_duration && data.prompt_eval_count) {
      const timePerToken = data.prompt_eval_duration / data.prompt_eval_count / 1e9; // ns to s
      // Normalize: faster processing = higher probability (lower surprise)
      // We return negative log of time to mimic log-prob scale (higher is better)
      return -Math.log(timePerToken + 0.00001); // Smaller epsilon for precision
    }

    // Fallback: use eval metrics if prompt metrics missing (rare)
    if (data.eval_duration && data.eval_count) {
      const timePerToken = data.eval_duration / data.eval_count / 1e9;
      return -Math.log(timePerToken + 0.001);
    }

    return 0;
  } catch (error) {
    console.error(`Error calculating log probability for model ${model}:`, error);
    throw error; // Re-throw to let caller handle it
  }
}

/**
 * Calculate perplexity for a text (alternative bias metric)
 */
export async function getPerplexity(model: string, text: string): Promise<number> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: text,
        stream: false,
        options: {
          num_predict: 0, // Don't generate, just evaluate prompt
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get perplexity: ${response.statusText}`);
    }

    const data = await response.json();

    // Perplexity approximation from eval metrics
    if (data.prompt_eval_duration && data.prompt_eval_count) {
      // Normalize by token count for fair comparison across different lengths
      const avgTimePerToken = data.prompt_eval_duration / data.prompt_eval_count / 1e9;
      return avgTimePerToken * 1000; // Scale for readability
    }

    return 1;
  } catch (error) {
    console.error("Failed to get perplexity:", error);
    return 1;
  }
}

/**
 * Ollama client class for stateful operations
 */
export class OllamaClient {
  private baseUrl: string;
  public readonly model: string;
  private capabilityCache: Map<string, ModelCapabilityCache>;

  constructor(model: string, baseUrl = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.capabilityCache = new Map();
  }

  /**
   * Ensures the model is available in Ollama before proceeding
   * Throws an error if the model is not found
   */
  async ensureModelLoaded(): Promise<void> {
    const models = await listOllamaModels();
    // Check if exact match or if the model name is contained (e.g. "llama3.2" in "llama3.2:latest")
    const modelExists = models.some(
      (m) =>
        m.name === this.model ||
        m.name.startsWith(`${this.model}:`) ||
        this.model.startsWith(`${m.name}:`)
    );

    if (!modelExists) {
      throw new Error(
        `Model '${this.model}' not found in Ollama. Please run 'ollama pull ${this.model}' first.`
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    return detectOllama();
  }

  async generate(prompt: string): Promise<string> {
    await this.ensureModelLoaded();
    const response = await ollamaGenerate({
      model: this.model,
      prompt,
    });
    return response.response;
  }

  async getLogProb(prompt: string): Promise<number> {
    // Use the enhanced getLogProbWithFallback method that supports both exact and fallback methods
    const result = await this.getLogProbWithFallback(prompt);
    return result.logprob;
  }

  async getPerplexity(text: string): Promise<number> {
    return getPerplexity(this.model, text);
  }

  /**
   * Test if the current model supports log-probabilities
   * Sends a test request with "Der" prompt to detect capability
   */
  private async testLogProbCapability(): Promise<boolean> {
    try {
      // First check Ollama version
      try {
        const versionResponse = await fetch(`${this.baseUrl}/api/version`);
        if (versionResponse.ok) {
          const versionData = await versionResponse.json();
          console.log(`🔍 Ollama version: ${versionData.version || "unknown"}`);
        }
      } catch {
        // Version check is optional
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: "Der",
          stream: false,
          logprobs: true,
          options: {
            num_predict: 1,
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        console.warn(
          `🔍 Capability test request failed for ${this.model}: ${response.status} ${response.statusText}`
        );
        return false;
      }

      const data = await response.json();

      // Check if logprobs are present and valid
      const hasLogProbs = !!(
        data.logprobs &&
        Array.isArray(data.logprobs) &&
        data.logprobs.length > 0
      );
      console.log(
        `🔍 Capability test for ${this.model}: ${hasLogProbs ? "✅ supports" : "❌ no support"} log-probabilities`,
        data.logprobs ? `(${data.logprobs.length} tokens)` : "(no logprobs field)"
      );

      if (!hasLogProbs) {
        console.log("🔍 Full response for debugging:", JSON.stringify(data, null, 2));
      }

      return hasLogProbs;
    } catch (error) {
      console.warn(`Log-probability capability test failed for model ${this.model}:`, error);
      return false;
    }
  }

  /**
   * Get cached capability result from localStorage
   */
  private getCachedCapability(): ModelCapabilityCache | null {
    try {
      const cacheKey = `ollama_supports_logprobs_${this.model}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const capability: ModelCapabilityCache = JSON.parse(cached);

        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - new Date(capability.testedAt).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (cacheAge < maxAge) {
          return capability;
        }
      }
    } catch (error) {
      console.warn("Failed to read capability cache:", error);
    }

    return null;
  }

  /**
   * Cache capability result in localStorage
   */
  private setCachedCapability(supports: boolean): void {
    try {
      const cacheKey = `ollama_supports_logprobs_${this.model}`;
      const capability: ModelCapabilityCache = {
        model: this.model,
        supportsLogProbs: supports,
        testedAt: new Date().toISOString(),
      };

      localStorage.setItem(cacheKey, JSON.stringify(capability));
      this.capabilityCache.set(this.model, capability);
    } catch (error) {
      console.warn("Failed to cache capability result:", error);
    }
  }

  /**
   * Detect if the current model supports log-probabilities
   * Checks cache first, then runs test if needed
   */
  async detectLogProbSupport(): Promise<boolean> {
    // Check in-memory cache first
    const memoryCache = this.capabilityCache.get(this.model);
    if (memoryCache) {
      return memoryCache.supportsLogProbs;
    }

    // Check localStorage cache
    const cached = this.getCachedCapability();
    if (cached) {
      this.capabilityCache.set(this.model, cached);
      return cached.supportsLogProbs;
    }

    // Run capability test
    const supports = await this.testLogProbCapability();
    this.setCachedCapability(supports);

    return supports;
  }

  /**
   * Get log-probability with automatic fallback to latency method
   * Returns both the calculated value and the method used
   */
  async getLogProbWithFallback(
    prompt: string
  ): Promise<{ logprob: number; method: BiasCalculationMethod }> {
    try {
      // First, check if model supports log-probabilities
      const supportsLogProbs = await this.detectLogProbSupport();

      if (supportsLogProbs) {
        // Try to get exact log-probabilities
        try {
          const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: this.model,
              prompt,
              stream: false,
              logprobs: true,
              options: {
                num_predict: 0, // Only evaluate prompt, don't generate
                temperature: 0,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();

            if (data.logprobs && Array.isArray(data.logprobs) && data.logprobs.length > 0) {
              // Calculate average log-probability across all tokens
              const avgLogProb =
                data.logprobs.reduce(
                  (sum: number, item: { token: string; logprob: number }) => sum + item.logprob,
                  0
                ) / data.logprobs.length;
              console.log(`✅ Using exact log-probabilities for ${this.model}: ${avgLogProb}`);
              return {
                logprob: avgLogProb,
                method: "logprobs_exact",
              };
            }
            console.warn(`❌ No logprobs in response for ${this.model}, response:`, data);
          } else {
            console.warn(
              `❌ Log-probability request failed for ${this.model}: ${response.status} ${response.statusText}`
            );
          }
        } catch (error) {
          console.warn(
            `❌ Log-probability request failed for ${this.model}, falling back to latency method:`,
            error
          );
        }
      }

      // Fallback to latency-based method
      console.log(`⚡ Falling back to latency-based method for ${this.model}`);
      const startTime = performance.now();

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_predict: 0, // Only evaluate prompt
            temperature: 0,
          },
        }),
      });

      const endTime = performance.now();

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Calculate latency-based pseudo log-probability
      let latency: number;

      if (data.prompt_eval_duration && data.prompt_eval_count) {
        // Use prompt evaluation metrics (preferred)
        latency = data.prompt_eval_duration / data.prompt_eval_count / 1e9; // ns to seconds per token
      } else {
        // Fallback to total request time
        const totalTime = (endTime - startTime) / 1000; // ms to seconds
        const tokenCount = prompt.split(/\s+/).length; // rough token estimate
        latency = totalTime / Math.max(tokenCount, 1);
      }

      // Convert latency to pseudo log-probability (faster = higher probability)
      const pseudoLogProb = -Math.log(latency + 0.00001);

      return {
        logprob: pseudoLogProb,
        method: "logprobs_fallback_latency",
      };
    } catch (error) {
      console.error(`Error in getLogProbWithFallback for model ${this.model}:`, error);
      throw error;
    }
  }
}
