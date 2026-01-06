/**
 * Model Capability Detection Service
 * Real-time detection of model capabilities with smart caching
 */

import type { BiasCalculationMethod } from "../types";

/**
 * Detection status for model capabilities
 */
export type CapabilityDetectionStatus = "detecting" | "available" | "unavailable" | "error";

/**
 * Model capability information
 */
export interface ModelCapability {
  modelId: string;
  engine: "browser" | "ollama";
  method: BiasCalculationMethod;
  status: CapabilityDetectionStatus;
  lastTested?: string;
  error?: string;
  recommended?: boolean;
}

/**
 * Model selection state for UI components
 */
export interface ModelSelectionState {
  models: ModelCapability[];
  selectedModel?: string;
  isLoading: boolean;
  showExplanations: boolean;
}

/**
 * Cache entry structure with expiration and version tracking
 */
export interface CapabilityCacheEntry {
  modelId: string;
  capability: ModelCapability;
  cachedAt: string;
  expiresAt: string;
  ollamaVersion?: string;
}

/**
 * Detection progress tracking
 */
export interface DetectionProgress {
  total: number;
  completed: number;
  inProgress: string[];
}

/**
 * User preferences for model selection
 */
export interface UserPreferences {
  showExplanations: boolean;
  preferExactMethods: boolean;
  hideUnavailableModels: boolean;
}

/**
 * Enhanced model selection state with preferences
 */
export interface EnhancedModelSelectionState extends ModelSelectionState {
  detectionProgress: DetectionProgress;
  userPreferences: UserPreferences;
  lastRefresh: string;
}
/**
 * Service interface for capability detection
 */
export interface CapabilityDetectionService {
  detectAllCapabilities(): Promise<ModelCapability[]>;
  detectModelCapability(modelId: string, engine: "browser" | "ollama"): Promise<ModelCapability>;
  getCachedCapability(modelId: string): CapabilityCacheEntry | null;
  setCachedCapability(capability: ModelCapability): void;
  clearCache(): void;
  refreshCapabilities(): Promise<ModelCapability[]>;
}

/**
 * Implementation of capability detection service
 */
export class DefaultCapabilityDetectionService implements CapabilityDetectionService {
  private cache: Map<string, CapabilityCacheEntry> = new Map();
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CACHE_KEY_PREFIX = "euconform_capability_";

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Detect capabilities for all available models
   * Includes browser inference and parallel Ollama model testing
   */
  async detectAllCapabilities(): Promise<ModelCapability[]> {
    const capabilities: ModelCapability[] = [];

    try {
      // Import browser models dynamically
      const { BROWSER_MODELS } = await import("./browser-inference");

      for (const model of BROWSER_MODELS) {
        if (!model.supported) continue;
        capabilities.push({
          modelId: model.id,
          engine: "browser",
          method: "logprobs_exact",
          status: "available",
          recommended: true,
          lastTested: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn("Failed to load browser models:", error);
      // Fallback if import fails
      capabilities.push({
        modelId: "Xenova/distilgpt2",
        engine: "browser",
        method: "logprobs_exact",
        status: "available",
        recommended: true,
        lastTested: new Date().toISOString(),
      });
    }

    try {
      // Import Ollama functions dynamically to avoid issues if not available
      const { detectOllama, listOllamaModels } = await import("./ollama-client");

      // Check if Ollama is available
      const ollamaAvailable = await detectOllama();

      if (ollamaAvailable) {
        // Get list of available Ollama models
        const ollamaModels = await listOllamaModels();

        // Detect capabilities for all Ollama models in parallel
        const detectionPromises = ollamaModels.map((model) =>
          this.detectModelCapability(model.name, "ollama")
        );

        const ollamaCapabilities = await Promise.allSettled(detectionPromises);

        // Process results and add successful detections
        ollamaCapabilities.forEach((result, index) => {
          if (result.status === "fulfilled") {
            capabilities.push(result.value);
          } else {
            // Add error capability for failed detections
            const model = ollamaModels[index];
            if (model) {
              capabilities.push({
                modelId: model.name,
                engine: "ollama",
                method: "logprobs_fallback_latency",
                status: "error",
                error: result.reason?.message || "Detection failed",
                lastTested: new Date().toISOString(),
              });
            }
          }
        });
      }
    } catch (error) {
      console.warn("Failed to detect Ollama capabilities:", error);
    }

    // Sort capabilities by recommendation score
    return this.sortByRecommendation(capabilities);
  }

  /**
   * Detect capability for a specific model
   * Uses cache-first strategy with live fallback
   */
  async detectModelCapability(
    modelId: string,
    engine: "browser" | "ollama"
  ): Promise<ModelCapability> {
    // Check cache first
    const cached = this.getCachedCapability(modelId);
    if (cached && this.isCacheValid(cached)) {
      return cached.capability;
    }

    // Browser inference always supports exact log-probabilities
    if (engine === "browser") {
      const capability: ModelCapability = {
        modelId,
        engine: "browser",
        method: "logprobs_exact",
        status: "available",
        recommended: true,
        lastTested: new Date().toISOString(),
      };

      this.setCachedCapability(capability);
      return capability;
    }

    // Detect Ollama model capability
    try {
      const { OllamaClient } = await import("./ollama-client");
      const client = new OllamaClient(modelId);

      // Test if model supports log-probabilities
      const supportsLogProbs = await client.detectLogProbSupport();

      const capability: ModelCapability = {
        modelId,
        engine: "ollama",
        method: supportsLogProbs ? "logprobs_exact" : "logprobs_fallback_latency",
        status: "available",
        lastTested: new Date().toISOString(),
      };

      this.setCachedCapability(capability);
      return capability;
    } catch (error) {
      const capability: ModelCapability = {
        modelId,
        engine: "ollama",
        method: "logprobs_fallback_latency",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        lastTested: new Date().toISOString(),
      };

      // Cache error results for shorter duration to allow retry
      this.setCachedCapability(capability, 5 * 60 * 1000); // 5 minutes for errors
      return capability;
    }
  }

  /**
   * Get cached capability result
   */
  getCachedCapability(modelId: string): CapabilityCacheEntry | null {
    const cached = this.cache.get(modelId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    return null;
  }

  /**
   * Cache capability result with optional custom duration
   */
  setCachedCapability(capability: ModelCapability, durationMs?: number): void {
    const duration = durationMs || this.CACHE_DURATION_MS;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration);

    const cacheEntry: CapabilityCacheEntry = {
      modelId: capability.modelId,
      capability,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store in memory cache
    this.cache.set(capability.modelId, cacheEntry);

    // Persist to localStorage
    this.saveCacheToStorage(capability.modelId, cacheEntry);
  }

  /**
   * Clear all cached capabilities
   */
  clearCache(): void {
    this.cache.clear();

    // Clear from localStorage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn("Failed to clear capability cache from localStorage:", error);
    }
  }

  /**
   * Refresh all capabilities by clearing cache and re-detecting
   */
  async refreshCapabilities(): Promise<ModelCapability[]> {
    this.clearCache();
    return this.detectAllCapabilities();
  }

  /**
   * Check if cache entry is still valid
   */
  protected isCacheValid(cacheEntry: CapabilityCacheEntry): boolean {
    const now = new Date();
    const expiresAt = new Date(cacheEntry.expiresAt);
    return now < expiresAt;
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheEntry: CapabilityCacheEntry = JSON.parse(cached);
            if (this.isCacheValid(cacheEntry)) {
              const modelId = key.replace(this.CACHE_KEY_PREFIX, "");
              this.cache.set(modelId, cacheEntry);
            } else {
              // Remove expired cache entries
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load capability cache from localStorage:", error);
    }
  }

  /**
   * Save cache entry to localStorage
   */
  private saveCacheToStorage(modelId: string, cacheEntry: CapabilityCacheEntry): void {
    try {
      const key = `${this.CACHE_KEY_PREFIX}${modelId}`;
      localStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn("Failed to save capability cache to localStorage:", error);
    }
  }

  /**
   * Sort capabilities by recommendation score
   */
  protected sortByRecommendation(capabilities: ModelCapability[]): ModelCapability[] {
    return capabilities.sort((a, b) => {
      const scoreA = this.getRecommendationScore(a);
      const scoreB = this.getRecommendationScore(b);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate recommendation score for a capability
   */
  protected getRecommendationScore(capability: ModelCapability): number {
    if (capability.status !== "available") return 0;

    let score = 0;

    // Browser inference gets highest score
    if (capability.engine === "browser") score += 100;

    // Exact methods get bonus
    if (capability.method === "logprobs_exact") score += 50;

    // Recommended models get bonus
    if (capability.recommended) score += 25;

    return score;
  }
}

/**
 * Enhanced capability detection service with timeout and retry logic
 */
export class EnhancedCapabilityDetectionService extends DefaultCapabilityDetectionService {
  private readonly DETECTION_TIMEOUT_MS = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE_MS = 1000; // Base delay for exponential backoff

  /**
   * Detect model capability with timeout and retry logic
   */
  async detectModelCapability(
    modelId: string,
    engine: "browser" | "ollama"
  ): Promise<ModelCapability> {
    // Check cache first
    const cached = this.getCachedCapability(modelId);
    if (cached && this.isCacheValid(cached)) {
      return cached.capability;
    }

    // Browser inference always supports exact log-probabilities
    if (engine === "browser") {
      const capability: ModelCapability = {
        modelId,
        engine: "browser",
        method: "logprobs_exact",
        status: "available",
        recommended: true,
        lastTested: new Date().toISOString(),
      };

      this.setCachedCapability(capability);
      return capability;
    }

    // Detect Ollama model capability with timeout and retry
    return this.detectOllamaCapabilityWithRetry(modelId);
  }

  /**
   * Detect Ollama capability with retry logic and exponential backoff
   */
  private async detectOllamaCapabilityWithRetry(modelId: string): Promise<ModelCapability> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this.detectOllamaCapabilityWithTimeout(modelId);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          break;
        }

        // Wait before retry with exponential backoff
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAY_BASE_MS * 2 ** attempt;
          await this.sleep(delay);
        }
      }
    }

    // All retries failed, return error capability
    const errorMessage = this.getErrorMessage(lastError);
    const capability: ModelCapability = {
      modelId,
      engine: "ollama",
      method: "logprobs_fallback_latency",
      status: this.isOllamaUnavailableError(lastError) ? "unavailable" : "error",
      error: errorMessage,
      lastTested: new Date().toISOString(),
    };

    // Cache error results for shorter duration
    this.setCachedCapability(capability, 5 * 60 * 1000); // 5 minutes for errors
    return capability;
  }

  /**
   * Detect Ollama capability with timeout
   */
  private async detectOllamaCapabilityWithTimeout(modelId: string): Promise<ModelCapability> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Detection timeout after ${this.DETECTION_TIMEOUT_MS}ms`));
      }, this.DETECTION_TIMEOUT_MS);
    });

    const detectionPromise = (async () => {
      const { OllamaClient, detectOllama } = await import("./ollama-client");

      // First check if Ollama is available
      const ollamaAvailable = await detectOllama();
      if (!ollamaAvailable) {
        throw new Error("Ollama service is not available");
      }

      const client = new OllamaClient(modelId);

      // Test if model supports log-probabilities
      const supportsLogProbs = await client.detectLogProbSupport();

      const capability: ModelCapability = {
        modelId,
        engine: "ollama",
        method: supportsLogProbs ? "logprobs_exact" : "logprobs_fallback_latency",
        status: "available",
        lastTested: new Date().toISOString(),
      };

      this.setCachedCapability(capability);
      return capability;
    })();

    try {
      return await Promise.race([detectionPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Enhanced detectAllCapabilities with better error handling
   */
  async detectAllCapabilities(): Promise<ModelCapability[]> {
    const capabilities: ModelCapability[] = [];

    // Add all supported browser models dynamically
    try {
      const { BROWSER_MODELS } = await import("./browser-inference");

      for (const model of BROWSER_MODELS) {
        if (!model.supported) continue;
        capabilities.push({
          modelId: model.id,
          engine: "browser",
          method: "logprobs_exact",
          status: "available",
          recommended: true,
          lastTested: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn("Failed to load browser models:", error);
      // Fallback if import fails
      capabilities.push({
        modelId: "Xenova/distilgpt2",
        engine: "browser",
        method: "logprobs_exact",
        status: "available",
        recommended: true,
        lastTested: new Date().toISOString(),
      });
    }

    try {
      // Import Ollama functions dynamically
      const { detectOllama, listOllamaModels } = await import("./ollama-client");

      // Check if Ollama is available with timeout
      const ollamaAvailable = await this.withTimeout(
        detectOllama(),
        2000, // 2 second timeout for Ollama availability check
        "Ollama availability check timeout"
      );

      if (ollamaAvailable) {
        // Get list of available Ollama models with timeout
        const ollamaModels = await this.withTimeout(
          listOllamaModels(),
          5000, // 5 second timeout for model listing
          "Ollama model listing timeout"
        );

        if (ollamaModels.length === 0) {
          console.warn("No Ollama models found");
          return capabilities;
        }

        // Detect capabilities for all Ollama models in parallel
        const detectionPromises = ollamaModels.map((model) =>
          this.detectModelCapability(model.name, "ollama")
        );

        const ollamaCapabilities = await Promise.allSettled(detectionPromises);

        // Process results and add all capabilities (including errors)
        ollamaCapabilities.forEach((result, index) => {
          if (result.status === "fulfilled") {
            capabilities.push(result.value);
          } else {
            // Add error capability for failed detections
            const model = ollamaModels[index];
            if (model) {
              const errorMessage = result.reason?.message || "Detection failed";
              capabilities.push({
                modelId: model.name,
                engine: "ollama",
                method: "logprobs_fallback_latency",
                status: "error",
                error: errorMessage,
                lastTested: new Date().toISOString(),
              });
            }
          }
        });
      } else {
        console.info("Ollama is not available, only browser inference will be offered");
      }
    } catch (error) {
      console.warn("Failed to detect Ollama capabilities:", error);
      // Don't throw - we still have browser inference available
    }

    // Sort capabilities by recommendation score
    return this.sortByRecommendation(capabilities);
  }

  /**
   * Utility function to add timeout to any promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("not found") ||
      (message.includes("model") && message.includes("not available")) ||
      message.includes("permission denied") ||
      message.includes("unauthorized")
    );
  }

  /**
   * Check if error indicates Ollama is unavailable
   */
  private isOllamaUnavailableError(error: Error | null): boolean {
    if (!error) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes("ollama service is not available") ||
      message.includes("connection refused") ||
      message.includes("network error") ||
      message.includes("fetch failed")
    );
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: Error | null): string {
    if (!error) return "Unknown error";

    const message = error.message;

    // Timeout errors
    if (message.includes("timeout")) {
      return "Model detection timed out. The model may be slow to respond.";
    }

    // Ollama unavailable
    if (this.isOllamaUnavailableError(error)) {
      return "Ollama service is not running. Please start Ollama to use local models.";
    }

    // Model not found
    if (message.includes("not found")) {
      return "Model not found. Please ensure the model is installed in Ollama.";
    }

    // Network errors
    if (message.includes("network") || message.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }

    // Generic error
    return `Detection failed: ${message}`;
  }

  /**
   * Check if cache entry is still valid (override to handle version tracking)
   */
  protected isCacheValid(cacheEntry: CapabilityCacheEntry): boolean {
    const now = new Date();
    const expiresAt = new Date(cacheEntry.expiresAt);

    // Check expiration
    if (now >= expiresAt) {
      return false;
    }

    // TODO: Add Ollama version checking when available
    // For now, we rely on time-based expiration

    return true;
  }
}

/**
 * Create a capability detection service instance
 */
export function createCapabilityDetectionService(): CapabilityDetectionService {
  return new EnhancedCapabilityDetectionService();
}
