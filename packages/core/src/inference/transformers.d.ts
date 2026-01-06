/**
 * Type declarations for @xenova/transformers (optional dependency)
 *
 * This package is only needed for browser-based inference.
 * If not installed, browser inference will gracefully fall back.
 */

declare module "@xenova/transformers" {
  export function pipeline(
    task: "text-generation",
    model: string,
    options?: {
      device?: "webgpu" | "cpu";
    }
  ): Promise<TextGenerationPipeline>;

  export type TextGenerationPipeline = (
    text: string,
    options?: {
      max_new_tokens?: number;
      temperature?: number;
      do_sample?: boolean;
    }
  ) => Promise<Array<{ generated_text: string }>>;

  export interface Tensor {
    data: Float32Array;
    dims: number[];
  }

  export interface ModelOutput {
    logits: Tensor;
  }

  export interface TokenizerOutput {
    input_ids: Tensor;
  }

  export interface AutoTokenizer {
    (text: string, options?: { return_tensors?: string }): Promise<TokenizerOutput>;
    from_pretrained(modelId: string): Promise<AutoTokenizer>;
  }

  export interface AutoModelForCausalLM {
    (inputs: TokenizerOutput): Promise<ModelOutput>;
    from_pretrained(
      modelId: string,
      options?: { device?: string; dtype?: string }
    ): Promise<AutoModelForCausalLM>;
  }

  export const AutoTokenizer: {
    from_pretrained(modelId: string): Promise<AutoTokenizer>;
  };

  export const AutoModelForCausalLM: {
    from_pretrained(
      modelId: string,
      options?: { device?: string; dtype?: string }
    ): Promise<AutoModelForCausalLM>;
  };
}
