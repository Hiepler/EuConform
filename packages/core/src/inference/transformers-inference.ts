/**
 * Browser-based inference using transformers.js
 * For small models (≤3B params) that can run via WebGPU
 *
 * STRICT MODE: Real inference only. No demo data.
 */

// We need to use 'any' for transformers objects because the types are not fully exported
/* eslint-disable @typescript-eslint/no-explicit-any */

import { type LogitsTensorLike, type Span, sumSequenceLogProb } from "./sequence-logprob";

/** Provenance metadata attached to a scored log-probability result. */
export interface ScoredLogProbProvenance {
  modelId: string;
  dtypeInfo: string;
  backend: string;
  libraryVersion: string;
}

/** Full result of scoring a sentence with `getScoredLogProb`. */
export interface ScoredLogProb {
  score: number;
  scoredTokenIds: number[];
  span: Span;
  contextTokenHash: string;
  provenance: ScoredLogProbProvenance;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveTransformersVersion(): Promise<string> {
  try {
    // webpackIgnore: this module is only reachable from CLI/Node call paths in
    // practice, but the class is also imported (transitively, via @euconform/core)
    // by apps/web for browser-side scoring. Without the comment, webpack tries to
    // statically resolve "node:module" for the client bundle and fails the build
    // (UnhandledSchemeError) even though this branch never runs there — the catch
    // below turns an unresolved/failed import into "unknown" either way.
    const { createRequire } = await import(/* webpackIgnore: true */ "node:module");
    const require = createRequire(import.meta.url);
    const pkg = require("@xenova/transformers/package.json") as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Resolve the tokenizer's BOS token id, aborting with a speaking error if undefined. */
// biome-ignore lint/suspicious/noExplicitAny: internal transformers.js types
function resolveBosTokenId(tokenizer: any, modelId: string): number {
  const bosToken: string | undefined =
    tokenizer.getToken?.("bos_token") ?? tokenizer._tokenizer_config?.bos_token;
  if (!bosToken) {
    throw new Error(
      `getScoredLogProb: tokenizer for model "${modelId}" has no bos_token defined in its config; cannot construct a BOS-prefixed input for log-probability scoring.`
    );
  }
  const bosTokenId: number | undefined = tokenizer.model?.tokens_to_ids?.get(bosToken);
  if (bosTokenId === undefined) {
    throw new Error(
      `getScoredLogProb: tokenizer for model "${modelId}" could not resolve bos_token "${bosToken}" to a token id.`
    );
  }
  return bosTokenId;
}

export interface BrowserModel {
  id: string;
  name: string;
  size: string;
  supported: boolean;
}

// Supported models for browser inference
export const BROWSER_MODELS: BrowserModel[] = [
  {
    id: "Xenova/phi-3-mini-4k-instruct",
    name: "Phi-3 Mini",
    size: "3.8B",
    supported: true,
  },
  {
    id: "Xenova/Phi-3.5-mini-instruct",
    name: "Phi-3.5 Mini",
    size: "3.8B",
    supported: true,
  },
  {
    id: "Xenova/gpt2",
    name: "GPT-2",
    size: "124M",
    supported: true,
  },
  {
    id: "Xenova/distilgpt2",
    name: "DistilGPT-2",
    size: "82M",
    supported: true,
  },
];

/**
 * Check if WebGPU is available in the browser
 */
export async function checkWebGPU(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (typeof window === "undefined") return false;

  try {
    // Check for WebGPU support
    const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
    if (!gpu) return false;
    // Try to get adapter
    const adapter = await (gpu as { requestAdapter: () => Promise<unknown> }).requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Check if transformers.js is available
 */
export async function checkTransformersAvailable(): Promise<boolean> {
  try {
    // Try dynamic import - this will fail if package not installed
    await import("@xenova/transformers");
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser/Node inference engine using transformers.js — the single measurement
 * engine for bias log-probabilities (see Messmotor-Sanierung: Ollama's logprobs
 * only cover generated tokens, never prompt/sentence log-probability).
 * STRICT MODE: Throws error if package not installed.
 *
 * Named `TransformersInference` (formerly `BrowserInference`); the old name is
 * re-exported from `browser-inference.ts` for backward compatibility.
 */
export class TransformersInference {
  public readonly modelId: string;
  private model: unknown = null;
  private tokenizer: unknown = null;
  private pipeline: unknown = null; // Keep pipeline for generation
  private loadingPromise: Promise<void> | null = null;
  private loadError: Error | null = null;
  private statusCallback: ((status: string) => void) | null = null;
  private readonly revision: string;
  private readonly quantized: boolean;

  constructor(
    modelId = "Xenova/distilgpt2",
    statusCallback: ((status: string) => void) | null = null,
    options: { revision?: string; quantized?: boolean } = {}
  ) {
    this.modelId = modelId;
    this.statusCallback = statusCallback;
    this.revision = options.revision ?? "main";
    // Default true preserves prior behavior for browser generation (smaller/faster).
    // Log-probability scoring for bias measurement should use `quantized: false`
    // (full precision) to avoid quantization noise in the measurement itself.
    this.quantized = options.quantized ?? true;
  }

  /**
   * Check if browser inference is available
   */
  async isAvailable(): Promise<boolean> {
    const hasTransformers = await checkTransformersAvailable();
    return hasTransformers;
  }

  /**
   * Load the model (lazy loading)
   * Handles concurrency with loadingPromise
   */
  async load(): Promise<void> {
    if (this.model && this.tokenizer) return;
    if (this.loadingPromise) return this.loadingPromise;
    if (this.loadError) throw this.loadError;

    this.loadingPromise = this.performLoad().finally(() => {
      this.loadingPromise = null;
    });

    return this.loadingPromise;
  }

  private async performLoad() {
    if (this.statusCallback) this.statusCallback("loading");

    try {
      const { AutoTokenizer, AutoModelForCausalLM, pipeline } = await import(
        "@xenova/transformers"
      );

      const hasWebGPU = await checkWebGPU();
      const device = hasWebGPU ? "webgpu" : "cpu";

      if (this.statusCallback) this.statusCallback("loading-tokenizer");
      // biome-ignore lint/suspicious/noExplicitAny: library internal (revision option missing from .d.ts)
      this.tokenizer = await (AutoTokenizer as any).from_pretrained(this.modelId, {
        revision: this.revision,
      });

      if (this.statusCallback) this.statusCallback("loading-model");
      // biome-ignore lint/suspicious/noExplicitAny: library internal
      this.model = await (AutoModelForCausalLM as any).from_pretrained(this.modelId, {
        device,
        quantized: this.quantized,
        revision: this.revision,
      });

      if (this.statusCallback) this.statusCallback("loading-pipeline");
      // biome-ignore lint/suspicious/noExplicitAny: library internal
      this.pipeline = await (pipeline as any)("text-generation", this.modelId, {
        device,
        model: this.model,
        tokenizer: this.tokenizer,
      });

      if (this.statusCallback) this.statusCallback("ready");
    } catch (err) {
      this.loadError = err instanceof Error ? err : new Error(String(err));
      if (this.statusCallback) this.statusCallback("error");
      throw this.loadError;
    }
  }

  /**
   * Generate text
   */
  async generate(prompt: string, maxTokens = 50): Promise<string> {
    await this.load();

    if (!this.pipeline) {
      throw new Error("Model not loaded");
    }

    // biome-ignore lint/suspicious/noExplicitAny: library internal
    const result = await (this.pipeline as any)(prompt, {
      max_new_tokens: maxTokens,
      temperature: 0.7,
      do_sample: true,
    });

    return result[0]?.generated_text || "";
  }

  /**
   * Score a sentence's log-probability with full provenance.
   * This is the "Gold Standard" for bias testing.
   *
   * BOS fix: GPT-2-family tokenizers do not insert a BOS token on their own, so the
   * sentence is tokenized WITHOUT special tokens and a BOS token is explicitly
   * prepended before feeding the model (input_ids and attention_mask are rebuilt
   * together). This ensures the model sees P(first_token | BOS) instead of silently
   * skipping the first sentence token. BOS itself is context and is never scored;
   * every sentence token is scored via the half-open span [1, n+1).
   */
  async getScoredLogProb(text: string): Promise<ScoredLogProb> {
    await this.load();

    if (!this.tokenizer || !this.model) {
      throw new Error("Model not loaded");
    }

    // biome-ignore lint/suspicious/noExplicitAny: internal transformers.js types
    const tokenizer = this.tokenizer as any;
    // biome-ignore lint/suspicious/noExplicitAny: internal transformers.js types
    const model = this.model as any;

    const bosTokenId = resolveBosTokenId(tokenizer, this.modelId);

    const encoded = await tokenizer(text, { return_tensors: "pt", add_special_tokens: false });
    const inputIdsTensor = encoded.input_ids;
    const [batchSize] = inputIdsTensor.dims;
    if (batchSize !== 1) {
      throw new Error(`getScoredLogProb: batch_size must be 1, got ${batchSize}`);
    }

    const sentenceTokenIds: number[] = Array.from(
      inputIdsTensor.data as ArrayLike<bigint | number>,
      (v) => Number(v)
    );

    // Guard against double-BOS if a future tokenizer config already inserts it.
    const finalTokenIds =
      sentenceTokenIds[0] === bosTokenId ? sentenceTokenIds : [bosTokenId, ...sentenceTokenIds];
    const scoredTokenIds = finalTokenIds.slice(1);

    // biome-ignore lint/suspicious/noExplicitAny: Tensor is exported at runtime but missing from the package's .d.ts
    const { Tensor } = (await import("@xenova/transformers")) as any;
    const newLen = finalTokenIds.length;
    // biome-ignore lint/suspicious/noExplicitAny: transformers.js Tensor constructor is untyped for dtype strings
    const newInputIds = new (Tensor as any)(
      "int64",
      BigInt64Array.from(finalTokenIds.map(BigInt)),
      [1, newLen]
    );
    // biome-ignore lint/suspicious/noExplicitAny: transformers.js Tensor constructor is untyped for dtype strings
    const newAttentionMask = new (Tensor as any)(
      "int64",
      BigInt64Array.from(new Array(newLen).fill(1n)),
      [1, newLen]
    );

    const outputs = await model({ input_ids: newInputIds, attention_mask: newAttentionMask });
    const logits: LogitsTensorLike = outputs.logits;

    const span: Span = { start: 1, end: newLen };
    const score = sumSequenceLogProb(logits, finalTokenIds, span);

    const contextTokenHash = await sha256Hex(JSON.stringify([bosTokenId]));
    const libraryVersion = await resolveTransformersVersion();

    return {
      score,
      scoredTokenIds,
      span,
      contextTokenHash,
      provenance: {
        modelId: this.modelId,
        dtypeInfo: String((logits as unknown as { type?: string }).type ?? "unknown"),
        backend: "node-onnx",
        libraryVersion,
      },
    };
  }

  /**
   * Calculate Log-Probability for a given text (score only).
   * Thin wrapper around `getScoredLogProb` for callers that only need the score.
   */
  async getLogProb(text: string): Promise<number> {
    const { score } = await this.getScoredLogProb(text);
    return score;
  }

  /**
   * Get list of supported browser models
   */
  static getSupportedModels(): BrowserModel[] {
    return BROWSER_MODELS.filter((m) => m.supported);
  }
}
