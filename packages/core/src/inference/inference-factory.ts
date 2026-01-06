/**
 * Inference Factory with Method Detection
 * Provides unified interface for bias calculations across engines with automatic method detection
 */

import { calculateCrowsPairsBias } from "../metrics/crows-pairs-bias";
import type { BiasCalculationMethod, BiasTestConfig, CrowsPairsBiasResult } from "../types";
import { BrowserInference } from "./browser-inference";
import type { ModelCapability } from "./capability-detection";
import { OllamaClient } from "./ollama-client";

/**
 * Result wrapper that includes method metadata for all inference operations
 */
export interface InferenceResult<T> {
  data: T;
  method: BiasCalculationMethod;
  engine: "browser" | "ollama";
  model: string;
  capability?: ModelCapability;
}

/**
 * Inference Factory class that manages inference clients and provides unified interface
 * Automatically detects best available calculation method and returns metadata
 */
export class InferenceFactory {
  private browserClient: BrowserInference | null = null;
  private ollamaClient: OllamaClient | null = null;
  private statusCallback: ((status: string) => void) | null = null;
  private selectedCapability: ModelCapability | null = null;

  constructor(statusCallback?: (status: string) => void) {
    this.statusCallback = statusCallback || null;
  }

  /**
   * Set the selected model capability for enhanced metadata tracking
   */
  setSelectedCapability(capability: ModelCapability): void {
    this.selectedCapability = capability;
  }

  /**
   * Create a bias calculation with automatic method detection
   * Returns InferenceResult with both data and method metadata
   */
  async createBiasCalculation(
    config: BiasTestConfig
  ): Promise<InferenceResult<CrowsPairsBiasResult>> {
    const { engine, model } = config;

    this.validateConfiguration(config);

    const inferenceClient = await this.getInferenceClient(engine, model);
    let _detectedMethod: BiasCalculationMethod;

    if (engine === "browser") {
      _detectedMethod = "logprobs_exact";
    } else {
      // Use capability method if available, otherwise detect
      _detectedMethod =
        this.selectedCapability?.method ?? (await this.detectBestMethod(inferenceClient));
    }

    // Perform bias calculation
    const biasResult = await calculateCrowsPairsBias(config, inferenceClient);

    // Return result with metadata including capability information
    return {
      data: biasResult,
      method: biasResult.method, // Use the method determined during calculation
      engine,
      model,
      capability: this.selectedCapability || undefined,
    };
  }

  /**
   * Detect the best available calculation method for the given client
   * Returns the method that should be used for bias calculations
   */
  private async detectBestMethod(
    client: BrowserInference | OllamaClient
  ): Promise<BiasCalculationMethod> {
    if (client instanceof BrowserInference) {
      // Browser inference always supports exact log-probabilities
      return "logprobs_exact";
    }
    if (client instanceof OllamaClient) {
      // Check Ollama's log-probability support
      const supportsLogProbs = await client.detectLogProbSupport();
      return supportsLogProbs ? "logprobs_exact" : "logprobs_fallback_latency";
    }
    throw new Error("Unknown inference client type");
  }

  /**
   * Get browser inference client (creates if needed)
   */
  getBrowserClient(model: string): BrowserInference {
    if (!this.browserClient || this.browserClient.modelId !== model) {
      this.browserClient = new BrowserInference(model, this.statusCallback);
    }
    return this.browserClient;
  }

  /**
   * Get Ollama client (creates if needed)
   */
  getOllamaClient(model: string): OllamaClient {
    if (!this.ollamaClient || this.ollamaClient.model !== model) {
      this.ollamaClient = new OllamaClient(model);
    }
    return this.ollamaClient;
  }

  private validateConfiguration(config: BiasTestConfig): void {
    const { engine, model } = config;
    if (!this.selectedCapability) return;

    if (this.selectedCapability.status !== "available") {
      throw new Error(
        `Selected model ${model} is not available (status: ${this.selectedCapability.status})`
      );
    }
    if (this.selectedCapability.modelId !== model || this.selectedCapability.engine !== engine) {
      throw new Error(
        `Configuration mismatch: expected ${this.selectedCapability.modelId} (${this.selectedCapability.engine}), got ${model} (${engine})`
      );
    }
  }

  private async getInferenceClient(engine: "browser" | "ollama", model: string) {
    if (engine === "browser") {
      return this.getBrowserClient(model);
    }
    if (engine === "ollama") {
      return this.getOllamaClient(model);
    }
    throw new Error(`Unsupported engine: ${engine}`);
  }

  /**
   * Create inference result wrapper for any data with method detection
   * Useful for wrapping existing inference operations with metadata
   */
  async createInferenceResult<T>(
    data: T,
    engine: "browser" | "ollama",
    model: string,
    client?: BrowserInference | OllamaClient
  ): Promise<InferenceResult<T>> {
    let method: BiasCalculationMethod;

    // Use capability method if available, otherwise detect
    const selectedMethod = this.selectedCapability?.method;
    if (selectedMethod) {
      method = selectedMethod;
    } else if (engine === "browser") {
      method = "logprobs_exact";
    } else if (engine === "ollama") {
      if (client instanceof OllamaClient) {
        method = await this.detectBestMethod(client);
      } else {
        // Create temporary client for method detection
        const tempClient = new OllamaClient(model);
        method = await this.detectBestMethod(tempClient);
      }
    } else {
      throw new Error(`Unsupported engine: ${engine}`);
    }

    return {
      data,
      method,
      engine,
      model,
      capability: this.selectedCapability || undefined,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.browserClient = null;
    this.ollamaClient = null;
    this.statusCallback = null;
    this.selectedCapability = null;
  }
}

/**
 * Create a global inference factory instance
 * Provides convenient access to factory methods
 */
export function createInferenceFactory(
  statusCallback?: (status: string) => void
): InferenceFactory {
  return new InferenceFactory(statusCallback);
}

/**
 * Utility function to detect best method for a given configuration
 * Useful for pre-flight checks without creating full factory
 */
export async function detectBestMethodForConfig(
  config: BiasTestConfig
): Promise<BiasCalculationMethod> {
  const { engine, model } = config;

  if (engine === "browser") {
    return "logprobs_exact";
  }
  if (engine === "ollama") {
    const client = new OllamaClient(model);
    const supportsLogProbs = await client.detectLogProbSupport();
    return supportsLogProbs ? "logprobs_exact" : "logprobs_fallback_latency";
  }
  throw new Error(`Unsupported engine: ${engine}`);
}
