/**
 * Browser-based inference using transformers.js
 * For small models (≤3B params) that can run via WebGPU
 *
 * STRICT MODE: Real inference only. No demo data.
 */

// We need to use 'any' for transformers objects because the types are not fully exported
/* eslint-disable @typescript-eslint/no-explicit-any */

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
 * Browser inference engine using transformers.js
 * STRICT MODE: Throws error if package not installed.
 */
export class BrowserInference {
  public readonly modelId: string;
  private model: unknown = null;
  private tokenizer: unknown = null;
  private pipeline: unknown = null; // Keep pipeline for generation
  private loadingPromise: Promise<void> | null = null;
  private loadError: Error | null = null;
  private statusCallback: ((status: string) => void) | null = null;

  constructor(
    modelId = "Xenova/distilgpt2",
    statusCallback: ((status: string) => void) | null = null
  ) {
    this.modelId = modelId;
    this.statusCallback = statusCallback;
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
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);

      if (this.statusCallback) this.statusCallback("loading-model");
      // biome-ignore lint/suspicious/noExplicitAny: library internal
      this.model = await (AutoModelForCausalLM as any).from_pretrained(this.modelId, {
        device,
        quantized: true,
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
   * Calculate Log-Probability for a given text
   * This is the "Gold Standard" for bias testing.
   * We calculate the loss (negative log likelihood) of the text.
   */
  async getLogProb(text: string): Promise<number> {
    await this.load();

    if (!this.tokenizer || !this.model) {
      throw new Error("Model not loaded");
    }

    // biome-ignore lint/suspicious/noExplicitAny: internal transformers.js types
    const inputs = await (this.tokenizer as any)(text, { return_tensors: "pt" });
    const inputIds = inputs.input_ids;

    // biome-ignore lint/suspicious/noExplicitAny: internal transformers.js types
    const outputs = await (this.model as any)(inputs);
    const logits = outputs.logits;

    // 3. Compute Log Likelihood
    // We want to calculate P(text) = P(t1) * P(t2|t1) * ...
    // LogProb = sum( log( P(ti | t_<i) ) )

    // logits shape: [batch_size, seq_len, vocab_size]
    // inputIds shape: [batch_size, seq_len]
    // We are interested in the probability of the *next* token given previous tokens.
    // So we look at logits[0, i, :] to predict inputIds[0, i+1]

    const data = logits.data; // Float32Array
    const dims = logits.dims; // [batch, seq, vocab]
    const vocabSize = dims[2];
    const seqLen = dims[1];

    let totalLogProb = 0;

    // Helper to get logit value
    const getLogit = (seqIdx: number, vocabIdx: number) => {
      return data[seqIdx * vocabSize + vocabIdx];
    };

    // Helper for softmax/logsoftmax
    // We only need the log_prob of the target token
    // log_softmax(x_i) = x_i - log(sum(exp(x_j)))
    // To avoid overflow: x_i - max(x) - log(sum(exp(x_j - max(x))))

    for (let i = 0; i < seqLen - 1; i++) {
      const targetTokenId = Number(inputIds.data[i + 1]);

      // Calculate max logit for numerical stability
      let maxLogit = Number.NEGATIVE_INFINITY;
      for (let j = 0; j < vocabSize; j++) {
        const val = getLogit(i, j);
        if (val > maxLogit) maxLogit = val;
      }

      // Calculate sum of exp
      let sumExp = 0;
      for (let j = 0; j < vocabSize; j++) {
        sumExp += Math.exp(getLogit(i, j) - maxLogit);
      }

      const logSumExp = maxLogit + Math.log(sumExp);
      const targetLogit = getLogit(i, targetTokenId);

      const logProb = targetLogit - logSumExp;
      totalLogProb += logProb;
    }

    return totalLogProb;
  }

  /**
   * Get list of supported browser models
   */
  static getSupportedModels(): BrowserModel[] {
    return BROWSER_MODELS.filter((m) => m.supported);
  }
}
