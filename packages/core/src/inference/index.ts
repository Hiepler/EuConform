/**
 * Inference Factory
 * Auto-detects available inference engines and provides unified interface
 */

import {
  BROWSER_MODELS,
  BrowserInference,
  type BrowserModel,
  checkWebGPU,
} from "./browser-inference";
import { OllamaClient, type OllamaModel, detectOllama, listOllamaModels } from "./ollama-client";

export type InferenceEngine = "ollama" | "browser" | "demo";

export interface InferenceCapabilities {
  ollama: {
    available: boolean;
    models: OllamaModel[];
  };
  browser: {
    available: boolean;
    webgpu: boolean;
    models: BrowserModel[];
  };
  recommended: InferenceEngine;
}

export interface InferenceClient {
  engine: InferenceEngine;
  modelId: string;
  generate(prompt: string): Promise<string>;
  getLogProb(prompt: string): Promise<number>;
}

/**
 * Detect all available inference capabilities
 */
export async function detectCapabilities(): Promise<InferenceCapabilities> {
  const [ollamaAvailable, webgpuAvailable, ollamaModels] = await Promise.all([
    detectOllama(),
    checkWebGPU(),
    detectOllama().then((ok) => (ok ? listOllamaModels() : [])),
  ]);

  // Determine recommended engine
  let recommended: InferenceEngine = "demo";
  if (ollamaAvailable && ollamaModels.length > 0) {
    recommended = "ollama";
  } else if (webgpuAvailable) {
    recommended = "browser";
  }

  return {
    ollama: {
      available: ollamaAvailable,
      models: ollamaModels,
    },
    browser: {
      available: webgpuAvailable || true, // CPU fallback always available
      webgpu: webgpuAvailable,
      models: BROWSER_MODELS,
    },
    recommended,
  };
}

/**
 * Create an inference client for the specified engine
 */
export function createInferenceClient(
  engine: InferenceEngine,
  modelId: string,
  statusCallback?: (status: string) => void
): InferenceClient {
  switch (engine) {
    case "ollama": {
      const ollamaClient = new OllamaClient(modelId);
      return {
        engine: "ollama",
        modelId,
        generate: (prompt: string) => ollamaClient.generate(prompt),
        getLogProb: (prompt: string) => ollamaClient.getLogProb(prompt),
      };
    }

    case "browser": {
      const browserClient = new BrowserInference(modelId, statusCallback);
      return {
        engine: "browser",
        modelId,
        generate: (prompt: string) => browserClient.generate(prompt),
        getLogProb: (prompt: string) => browserClient.getLogProb(prompt),
      };
    }
    default:
      // Demo mode returns simulated results
      return {
        engine: "demo",
        modelId: "demo-model",
        generate: async (prompt: string) => {
          await new Promise((r) => setTimeout(r, 500)); // Simulate latency
          return `[Demo] Response to: ${prompt.slice(0, 50)}...`;
        },
        getLogProb: async () => {
          await new Promise((r) => setTimeout(r, 100));
          // Return random value between -5 and 0 for demo
          return -Math.random() * 5;
        },
      };
  }
}

/**
 * Auto-select the best available inference client
 */
export async function createAutoInferenceClient(preferredModel?: string): Promise<InferenceClient> {
  const capabilities = await detectCapabilities();

  if (capabilities.recommended === "ollama") {
    // Use preferred model if available, otherwise first model
    const model = preferredModel || capabilities.ollama.models[0]?.name || "llama3.2:3b";
    return createInferenceClient("ollama", model);
  }

  if (capabilities.recommended === "browser") {
    const model = preferredModel || BROWSER_MODELS[0]?.id || "Xenova/distilgpt2";
    return createInferenceClient("browser", model);
  }

  return createInferenceClient("demo", "demo-model");
}

// Re-export types and utilities
export { detectOllama, listOllamaModels, OllamaClient } from "./ollama-client";
export { BrowserInference, checkWebGPU, BROWSER_MODELS } from "./browser-inference";
export {
  InferenceFactory,
  createInferenceFactory,
  detectBestMethodForConfig,
  type InferenceResult,
} from "./inference-factory";
export {
  createCapabilityDetectionService,
  DefaultCapabilityDetectionService,
  EnhancedCapabilityDetectionService,
  type CapabilityDetectionService,
  type ModelCapability,
  type ModelSelectionState,
  type CapabilityCacheEntry,
  type DetectionProgress,
  type UserPreferences,
  type EnhancedModelSelectionState,
  type CapabilityDetectionStatus,
} from "./capability-detection";
export type { OllamaModel, BrowserModel };
