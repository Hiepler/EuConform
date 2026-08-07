import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Offline regression test for `TransformersInference`'s config-based loader selection
 * (Messmotor-Sanierung Task 5, "Umsetzung" item 1): a conditional-generation architecture
 * (e.g. Gemma-4) must load via `AutoProcessor` + `Gemma4ForConditionalGeneration` and score
 * via the template mode; a classic causal-LM architecture must keep using
 * `AutoTokenizer` + `AutoModelForCausalLM` and the Task 1 base mode — selection is driven by
 * the loaded CONFIG's `architectures`, never by `modelId`.
 */

class FakeTensor {
  type: string;
  data: BigInt64Array | Float32Array;
  dims: number[];
  constructor(type: string, data: BigInt64Array | Float32Array, dims: number[]) {
    this.type = type;
    this.data = data;
    this.dims = dims;
  }
}

const VOCAB_SIZE = 10;
const CONTEXT_TEXT =
  "<bos><|turn>user\nSchreibe einen kurzen Satz auf Deutsch.<turn|>\n<|turn>model\n";
const CONTEXT_TOKEN_IDS = [50, 51, 52];
const SENTENCE_TOKEN_IDS = [1, 2];

const gemma4ForConditionalGenerationSpy = vi.fn();
const autoModelForCausalLmSpy = vi.fn();
const autoProcessorSpy = vi.fn();
const autoTokenizerSpy = vi.fn();

function makeFakeModel() {
  return vi.fn(async (inputs: { input_ids: FakeTensor; attention_mask: FakeTensor }) => {
    const seqLen = inputs.input_ids.dims[1] as number;
    const data = new Float32Array(seqLen * VOCAB_SIZE);
    for (let i = 0; i < seqLen; i++) {
      for (let v = 0; v < VOCAB_SIZE; v++) {
        data[i * VOCAB_SIZE + v] = v === (i % VOCAB_SIZE) + 1 ? 3 : 0;
      }
    }
    return { logits: new FakeTensor("float32", data, [1, seqLen, VOCAB_SIZE]) };
  });
}

vi.mock("@huggingface/transformers", () => {
  const causalTokenizerFn = vi.fn((_text: string, _opts: unknown) => ({
    input_ids: new FakeTensor("int64", BigInt64Array.from(SENTENCE_TOKEN_IDS.map(BigInt)), [
      1,
      SENTENCE_TOKEN_IDS.length,
    ]),
  })) as unknown as {
    (text: string, opts: unknown): { input_ids: FakeTensor };
    bos_token: string;
    bos_token_id: number;
  };
  causalTokenizerFn.bos_token = "<|bos|>";
  causalTokenizerFn.bos_token_id = 4;

  const gemmaTokenizer = {
    apply_chat_template: vi.fn(() => CONTEXT_TEXT),
    encode: vi.fn((text: string) => {
      if (text === CONTEXT_TEXT) return CONTEXT_TOKEN_IDS;
      const sentence = text.slice(CONTEXT_TEXT.length);
      if (sentence !== "Ein Satz.") throw new Error(`unexpected sentence: ${sentence}`);
      return [...CONTEXT_TOKEN_IDS, ...SENTENCE_TOKEN_IDS];
    }),
  };

  return {
    AutoConfig: {
      from_pretrained: vi.fn(async (modelId: string) => {
        if (modelId === "test/gemma4-like") {
          return { model_type: "gemma4", architectures: ["Gemma4ForConditionalGeneration"] };
        }
        return { model_type: "gpt2", architectures: ["GPT2LMHeadModel"] };
      }),
    },
    AutoTokenizer: {
      from_pretrained: vi.fn(async () => {
        autoTokenizerSpy();
        return causalTokenizerFn;
      }),
    },
    AutoModelForCausalLM: {
      from_pretrained: vi.fn(async () => {
        autoModelForCausalLmSpy();
        return makeFakeModel();
      }),
    },
    AutoProcessor: {
      from_pretrained: vi.fn(async () => {
        autoProcessorSpy();
        return { tokenizer: gemmaTokenizer };
      }),
    },
    Gemma4ForConditionalGeneration: {
      from_pretrained: vi.fn(async () => {
        gemma4ForConditionalGenerationSpy();
        return makeFakeModel();
      }),
    },
    Tensor: FakeTensor,
  };
});

async function loadTransformersInference() {
  const mod = await import("../../src/inference/transformers-inference");
  return mod.TransformersInference;
}

describe("TransformersInference config-based loader selection (Task 5)", () => {
  beforeEach(() => {
    gemma4ForConditionalGenerationSpy.mockClear();
    autoModelForCausalLmSpy.mockClear();
    autoProcessorSpy.mockClear();
    autoTokenizerSpy.mockClear();
  });

  it("routes a conditional-generation architecture through AutoProcessor + Gemma4ForConditionalGeneration and the template mode", async () => {
    const TransformersInference = await loadTransformersInference();
    const engine = new TransformersInference("test/gemma4-like");

    const result = await engine.getScoredLogProb("Ein Satz.");

    expect(autoProcessorSpy).toHaveBeenCalledTimes(1);
    expect(gemma4ForConditionalGenerationSpy).toHaveBeenCalledTimes(1);
    expect(autoModelForCausalLmSpy).not.toHaveBeenCalled();

    expect(result.method).toBe("conditional_sequence_logprob_sum");
    expect(result.provenance.templateStrategy).toBe("fixed_template_span");
    expect(result.scoredTokenIds).toEqual(SENTENCE_TOKEN_IDS);
  });

  it("keeps a classic causal-LM architecture on AutoTokenizer + AutoModelForCausalLM and the base mode", async () => {
    const TransformersInference = await loadTransformersInference();
    const engine = new TransformersInference("test/gpt2-like");

    const result = await engine.getScoredLogProb("Hi there");

    expect(autoTokenizerSpy).toHaveBeenCalledTimes(1);
    expect(autoModelForCausalLmSpy).toHaveBeenCalledTimes(1);
    expect(autoProcessorSpy).not.toHaveBeenCalled();
    expect(gemma4ForConditionalGenerationSpy).not.toHaveBeenCalled();

    expect(result.method).toBe("sequence_logprob_sum");
    expect(result.provenance.templateStrategy).toBe("none");
  });
});
