/**
 * Browser-based inference using transformers.js
 * For small models (≤3B params) that can run via WebGPU
 *
 * STRICT MODE: Real inference only. No demo data.
 */

import type {
  DataType,
  PreTrainedModel,
  PreTrainedTokenizer,
  Tensor,
} from "@huggingface/transformers";
import type { ScoredLogProb } from "./scored-log-prob-types";
import { type LogitsTensorLike, type Span, sumSequenceLogProb } from "./sequence-logprob";
import {
  type MinimalChatTemplateTokenizer,
  type MinimalModelConfig,
  type TemplateModel,
  type TemplateTokenizer,
  hasChatTemplate,
  isConditionalGenerationConfig,
  scoreTemplateContinuation,
} from "./template-scoring";

/** Numeric precision for model weights — re-exported so callers don't need to import from
 * @huggingface/transformers directly. See DATA_TYPES in that package for the full list
 * (includes quantization schemes like "q4", "bnb4"); the scoring path must use "fp32". */
export type TransformersDType = DataType;

// `ScoredLogProb`/`ScoredLogProbProvenance` moved to `./scored-log-prob-types` in Task 5, to
// let `template-scoring.ts` depend on them without a circular import; re-exported here so
// existing `import { type ScoredLogProb } from "./transformers-inference"` sites keep working.
export type { ScoredLogProb, ScoredLogProbProvenance } from "./scored-log-prob-types";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveTransformersVersion(): Promise<string> {
  try {
    // v4's package.json declares a strict `exports` map with no "./package.json" subpath
    // (unlike v2's), so `require("@huggingface/transformers/package.json")` throws
    // ERR_PACKAGE_PATH_NOT_EXPORTED — surfaced while fixing Messmotor-Sanierung Task 4's
    // onnxruntimeVersion provenance gap, where this exact function was silently returning
    // "unknown" on every real run. `env.version` is v4's own documented public API for this
    // and isn't subject to the exports map at all.
    const { env } = await import("@huggingface/transformers");
    return env.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Resolve the tokenizer's BOS token id, aborting with a speaking error if undefined.
 *
 * @huggingface/transformers v4 exposes `bos_token` / `bos_token_id` directly as typed
 * properties on `PreTrainedTokenizer` — the v2 lookup dance (`getToken("bos_token")` then
 * `tokenizer.model.tokens_to_ids.get(...)`) is gone; deleting transformers.d.ts surfaced
 * this (Messmotor-Sanierung Task 4, trap 3).
 */
function resolveBosTokenId(tokenizer: PreTrainedTokenizer, modelId: string): number {
  const bosToken = tokenizer.bos_token;
  if (!bosToken) {
    throw new Error(
      `getScoredLogProb: tokenizer for model "${modelId}" has no bos_token defined in its config; cannot construct a BOS-prefixed input for log-probability scoring.`
    );
  }
  const bosTokenId = tokenizer.bos_token_id;
  if (bosTokenId === undefined || bosTokenId === null) {
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
    await import("@huggingface/transformers");
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
  private model: PreTrainedModel | null = null;
  private tokenizer: PreTrainedTokenizer | null = null;
  private loadingPromise: Promise<void> | null = null;
  private loadError: Error | null = null;
  private statusCallback: ((status: string) => void) | null = null;
  private readonly revision: string;
  /**
   * Public (not private) so callers building their own provenance/artifact records (e.g.
   * the CLI's `run-bias-test.ts`) can read the CONFIGURED weight precision actually used to
   * measure, instead of duplicating it as a separate hardcoded literal that could silently
   * drift out of sync with the constructor argument (Messmotor-Sanierung Task 5 review
   * finding).
   */
  public readonly dtype: TransformersDType;
  /**
   * Selected from the loaded TOKENIZER's chat template (`hasChatTemplate`), never from the
   * model's architecture name and never from `modelId` — see `hasChatTemplate`
   * (Messmotor-Sanierung Task 6c; supersedes the architecture-keyed detection from Task 5,
   * which missed instruction-tuned `*ForCausalLM` models). `true` routes `getScoredLogProb`
   * through the template-mode scorer instead of the Task 1 base (bare-sentence) mode.
   *
   * Independent of `loadTemplateMode`/`loadBaseMode` below, which pick the LOADER
   * (AutoProcessor+Gemma4ForConditionalGeneration vs. AutoTokenizer+AutoModelForCausalLM)
   * and stay keyed on architecture — a CausalLM-architecture instruction model (e.g.
   * Llama-3.2-1B-Instruct) uses the base-mode loader but the template-mode scorer.
   */
  private isTemplateMode = false;

  constructor(
    modelId = "Xenova/distilgpt2",
    statusCallback: ((status: string) => void) | null = null,
    options: { revision?: string; dtype?: TransformersDType } = {}
  ) {
    this.modelId = modelId;
    this.statusCallback = statusCallback;
    this.revision = options.revision ?? "main";
    // Default "q8" preserves the prior effective behavior for browser generation
    // (smaller/faster; the v2 default was `quantized: true`, which loaded 8-bit
    // weights). Log-probability scoring for bias measurement must pass `dtype: "fp32"`
    // explicitly (full precision) to avoid quantization noise in the measurement
    // itself — see run-bias-test.ts and the golden integration test.
    this.dtype = options.dtype ?? "q8";
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

  private notifyStatus(status: string): void {
    if (this.statusCallback) this.statusCallback(status);
  }

  private async resolveDevice(): Promise<"webgpu" | "wasm" | "cpu"> {
    const hasWebGPU = await checkWebGPU();
    // v4 device names: Node's CPU backend is "cpu"; the browser's non-GPU backend is
    // "wasm" (there is no "cpu" device in a browser). checkWebGPU() always resolves to
    // false under Node, so this only matters for the (typeof window !== "undefined")
    // branch — Messmotor-Sanierung Task 4, trap 2.
    const isBrowserEnv = typeof window !== "undefined";
    return hasWebGPU ? "webgpu" : isBrowserEnv ? "wasm" : "cpu";
  }

  /**
   * Conditional-generation/multimodal architecture (e.g. Gemma-4): AutoProcessor +
   * Gemma4ForConditionalGeneration, per Task 5. `Gemma4ForConditionalGeneration` is
   * exported directly by @huggingface/transformers@4.2.0 under that exact name (the ONNX
   * repo's own example script uses the same pair) — no fallback to AutoModelForCausalLM is
   * used or needed for this architecture.
   */
  private async loadTemplateMode(
    transformers: Pick<
      Awaited<typeof import("@huggingface/transformers")>,
      "AutoTokenizer" | "AutoProcessor" | "Gemma4ForConditionalGeneration"
    >,
    device: "webgpu" | "wasm" | "cpu"
  ): Promise<void> {
    const { AutoTokenizer, AutoProcessor, Gemma4ForConditionalGeneration } = transformers;

    this.notifyStatus("loading-processor");
    const processor = await AutoProcessor.from_pretrained(this.modelId, {
      revision: this.revision,
    });
    this.tokenizer =
      processor.tokenizer ??
      (await AutoTokenizer.from_pretrained(this.modelId, { revision: this.revision }));

    this.notifyStatus("loading-model");
    this.model = await Gemma4ForConditionalGeneration.from_pretrained(this.modelId, {
      device,
      dtype: this.dtype,
      revision: this.revision,
    });
  }

  /** Base mode (Task 1): classic causal LM, unchanged behavior. */
  private async loadBaseMode(
    transformers: Pick<
      Awaited<typeof import("@huggingface/transformers")>,
      "AutoTokenizer" | "AutoModelForCausalLM"
    >,
    device: "webgpu" | "wasm" | "cpu"
  ): Promise<void> {
    const { AutoTokenizer, AutoModelForCausalLM } = transformers;

    this.notifyStatus("loading-tokenizer");
    this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId, {
      revision: this.revision,
    });

    this.notifyStatus("loading-model");
    this.model = await AutoModelForCausalLM.from_pretrained(this.modelId, {
      device,
      dtype: this.dtype,
      revision: this.revision,
    });
  }

  private async performLoad() {
    this.notifyStatus("loading");

    try {
      const transformers = await import("@huggingface/transformers");

      // LOADER selection is from the loaded CONFIG (`architectures`), never from `modelId`
      // — see `isConditionalGenerationConfig` (Messmotor-Sanierung Task 5, ambiguity
      // resolution 1). This is a loader decision only (which `from_pretrained` class pair
      // to call); the SCORING MODE is decided separately below, from the tokenizer's chat
      // template (Task 6c) — the two must not be conflated. This one extra
      // `AutoConfig.from_pretrained` call runs for every model (base mode included); it
      // hits the same on-disk cache as the tokenizer/model downloads, so the added cost is
      // negligible next to those.
      this.notifyStatus("loading-config");
      const config = await transformers.AutoConfig.from_pretrained(this.modelId, {
        revision: this.revision,
      });
      const useConditionalGenerationLoader = isConditionalGenerationConfig(
        config as unknown as MinimalModelConfig
      );

      const device = await this.resolveDevice();

      if (useConditionalGenerationLoader) {
        await this.loadTemplateMode(transformers, device);
      } else {
        await this.loadBaseMode(transformers, device);
      }

      if (!this.tokenizer) {
        throw new Error(
          `performLoad: tokenizer missing after load for model "${this.modelId}" — cannot determine scoring mode.`
        );
      }
      // SCORING MODE selection (Messmotor-Sanierung Task 6c): keyed on the loaded
      // tokenizer's chat template, independent of the loader chosen above — see
      // `hasChatTemplate`.
      this.isTemplateMode = hasChatTemplate(
        this.tokenizer as unknown as MinimalChatTemplateTokenizer
      );

      this.notifyStatus("ready");
    } catch (err) {
      this.loadError = err instanceof Error ? err : new Error(String(err));
      this.notifyStatus("error");
      throw this.loadError;
    }
  }

  /**
   * Generate text.
   *
   * v4 note: previously this called a `pipeline("text-generation", ...)` built from the
   * already-loaded model/tokenizer, which transformers.js re-resolves/re-loads internally
   * — effectively a second model load that `getScoredLogProb`/`getLogProb` never used
   * (Messmotor-Sanierung Task 4, trap 4). Calling `model.generate()` directly avoids that.
   */
  async generate(prompt: string, maxTokens = 50): Promise<string> {
    await this.load();

    if (!this.tokenizer || !this.model) {
      throw new Error("Model not loaded");
    }

    const tokenizer = this.tokenizer;
    const model = this.model;

    const { input_ids, attention_mask } = tokenizer(prompt, { return_tensor: true });
    const outputs = await model.generate({
      inputs: input_ids,
      attention_mask,
      max_new_tokens: maxTokens,
      temperature: 0.7,
      do_sample: true,
    });

    // model.generate()'s declared return type is `ModelOutput | Tensor`, but for causal LM
    // decoding (no encoder-decoder, no streamer) it is always a plain Tensor of token ids —
    // narrow via `unknown` rather than `any` since the union has no discriminant we can check.
    const decoded = tokenizer.batch_decode(outputs as unknown as Tensor, {
      skip_special_tokens: true,
    });
    return decoded[0] ?? "";
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

    if (this.isTemplateMode) {
      const libraryVersion = await resolveTransformersVersion();
      return scoreTemplateContinuation(
        {
          tokenizer: this.tokenizer as unknown as TemplateTokenizer,
          model: this.model as unknown as TemplateModel,
          modelId: this.modelId,
          libraryVersion,
          dtype: this.dtype,
        },
        text
      );
    }

    const tokenizer = this.tokenizer;
    const model = this.model;

    const bosTokenId = resolveBosTokenId(tokenizer, this.modelId);

    // v4 renamed the tokenizer call's tensor-output option from `return_tensors: "pt"`
    // (a v2 backend-name string) to `return_tensor: true` (a plain boolean) — surfaced by
    // deleting transformers.d.ts; `return_tensors: "pt"` is not a recognized v4 option and
    // would silently fail to type-check (Messmotor-Sanierung Task 4).
    const encoded = tokenizer(text, { return_tensor: true, add_special_tokens: false });
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

    const { Tensor } = await import("@huggingface/transformers");
    const newLen = finalTokenIds.length;
    const newInputIds = new Tensor("int64", BigInt64Array.from(finalTokenIds.map(BigInt)), [
      1,
      newLen,
    ]);
    const newAttentionMask = new Tensor("int64", BigInt64Array.from(new Array(newLen).fill(1n)), [
      1,
      newLen,
    ]);

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
        dtype: this.dtype,
        logitsDtype: String((logits as unknown as { type?: string }).type ?? "unknown"),
        backend: "node-onnx",
        libraryVersion,
        templateStrategy: "none",
      },
      method: "sequence_logprob_sum",
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
