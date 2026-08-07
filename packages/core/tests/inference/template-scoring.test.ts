import { describe, expect, it, vi } from "vitest";

/**
 * Offline, standard-suite tests for the Gemma-4 template-mode scorer
 * (`scoreTemplateContinuation` / `isConditionalGenerationConfig`, Messmotor-Sanierung
 * Task 5). All dependencies (tokenizer, model) are injected fakes — no real model, no
 * network I/O, no files written. `@huggingface/transformers` is mocked only for `Tensor`,
 * which `scoreTemplateContinuation` dynamically imports to build the model's input tensors
 * (mirroring `transformers-inference.ts`'s own base-mode pattern).
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

vi.mock("@huggingface/transformers", () => ({ Tensor: FakeTensor }));

const CONTEXT_TEXT =
  "<bos><|turn>user\nSchreibe einen kurzen Satz auf Deutsch.<turn|>\n<|turn>model\n";
// Disjoint id range from sentence tokens below, so any accidental overlap in scoredTokenIds
// is easy to catch.
const CONTEXT_TOKEN_IDS = [200, 201, 202, 203];
const VOCAB_SIZE = 20;

/** Sentence -> sentence-only token ids (never overlapping CONTEXT_TOKEN_IDS's range). */
const SENTENCE_TOKENS: Record<string, number[]> = {
  "Die Bäckerin öffnet früh.": [1, 2, 3],
  "Die Bäckerin öffnet spät.": [1, 2, 4],
  "Männer sind stark.": [5, 6],
  "Emoji-Satz: 😀 Bäume.": [7, 8, 9],
};

function makeFakeTokenizer(
  overrides: {
    contextTokenIds?: number[];
    combinedOverride?: (contextIds: number[], sentence: string) => number[];
  } = {}
) {
  const contextTokenIds = overrides.contextTokenIds ?? CONTEXT_TOKEN_IDS;
  const encode = vi.fn((text: string) => {
    if (text === CONTEXT_TEXT) return contextTokenIds;
    const sentence = text.slice(CONTEXT_TEXT.length);
    if (overrides.combinedOverride) {
      return overrides.combinedOverride(contextTokenIds, sentence);
    }
    const tail = SENTENCE_TOKENS[sentence];
    if (!tail) throw new Error(`test double: unknown sentence "${sentence}"`);
    return [...contextTokenIds, ...tail];
  });
  const apply_chat_template = vi.fn(() => CONTEXT_TEXT);
  return { apply_chat_template, encode };
}

/** Deterministic, finite logits: row i's target-ish slot is higher than the rest. */
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

async function loadModule() {
  return import("../../src/inference/template-scoring");
}

describe("isConditionalGenerationConfig", () => {
  it("detects a ForConditionalGeneration architecture", async () => {
    const { isConditionalGenerationConfig } = await loadModule();
    expect(
      isConditionalGenerationConfig({ architectures: ["Gemma4ForConditionalGeneration"] })
    ).toBe(true);
  });

  it("does not detect a plain causal-LM architecture", async () => {
    const { isConditionalGenerationConfig } = await loadModule();
    expect(isConditionalGenerationConfig({ architectures: ["GPT2LMHeadModel"] })).toBe(false);
  });

  it("does not detect from model_type or missing architectures — config only, no name guessing", async () => {
    const { isConditionalGenerationConfig } = await loadModule();
    expect(isConditionalGenerationConfig({ model_type: "gemma4" })).toBe(false);
    expect(isConditionalGenerationConfig({})).toBe(false);
  });
});

describe("hasChatTemplate", () => {
  it("detects a non-empty chat template string", async () => {
    const { hasChatTemplate } = await loadModule();
    expect(hasChatTemplate({ chat_template: "{{ bos_token }}..." })).toBe(true);
  });

  it("does not detect a null chat template (e.g. Xenova/gpt2, Xenova/llama2.c-stories15M)", async () => {
    const { hasChatTemplate } = await loadModule();
    expect(hasChatTemplate({ chat_template: null })).toBe(false);
  });

  it("does not detect a missing chat_template field or an empty string", async () => {
    const { hasChatTemplate } = await loadModule();
    expect(hasChatTemplate({})).toBe(false);
    expect(hasChatTemplate({ chat_template: "" })).toBe(false);
  });
});

describe("scoreTemplateContinuation", () => {
  it("span excludes ALL template/context tokens — scoredTokenIds contains none of them", async () => {
    const { scoreTemplateContinuation } = await loadModule();
    const tokenizer = makeFakeTokenizer();
    const model = makeFakeModel();

    const result = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "Die Bäckerin öffnet früh."
    );

    expect(result.scoredTokenIds).toEqual([1, 2, 3]);
    for (const contextId of CONTEXT_TOKEN_IDS) {
      expect(result.scoredTokenIds).not.toContain(contextId);
    }
    expect(result.span).toEqual({
      start: CONTEXT_TOKEN_IDS.length,
      end: CONTEXT_TOKEN_IDS.length + 3,
    });
    expect(result.method).toBe("conditional_sequence_logprob_sum");
    expect(result.provenance.templateStrategy).toBe("fixed_template_span");
    expect(result.provenance.promptText).toBe(CONTEXT_TEXT);
  });

  it("regression: aborts if the context tokenizes to 0 tokens (the Task 0 spike's false-pass trap)", async () => {
    const { scoreTemplateContinuation } = await loadModule();
    // Simulate the exact bug: apply_chat_template(tokenize:true) unwrapped incorrectly
    // would yield context_len = 0. Any code path landing here with an empty context must
    // abort loudly rather than let the (vacuously true) prefix check pass silently.
    const tokenizer = makeFakeTokenizer({ contextTokenIds: [] });
    const model = makeFakeModel();

    await expect(
      scoreTemplateContinuation(
        { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
        "Die Bäckerin öffnet früh."
      )
    ).rejects.toThrow(/tokenized to 0 tokens/);
  });

  it("both pair halves produce a byte-identical context string and identical context token ids", async () => {
    const { scoreTemplateContinuation } = await loadModule();
    const tokenizer = makeFakeTokenizer();
    const model = makeFakeModel();

    const a = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "Die Bäckerin öffnet früh."
    );
    const b = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "Die Bäckerin öffnet spät."
    );

    expect(a.provenance.promptText).toBe(b.provenance.promptText);
    expect(a.contextTokenHash).toBe(b.contextTokenHash);
  });

  it("aborts on prefix-token identity violation (constructed token-merge case) — no separator fallback", async () => {
    const { scoreTemplateContinuation } = await loadModule();
    // Simulate a token merge at the context/sentence boundary: the combined tokenization's
    // last context-position id differs from the standalone context tokenization.
    const tokenizer = makeFakeTokenizer({
      combinedOverride: (contextIds) => {
        const merged = [...contextIds];
        merged[merged.length - 1] = 999; // diverges from the standalone context tokenization
        return [...merged, 1, 2, 3];
      },
    });
    const model = makeFakeModel();

    await expect(
      scoreTemplateContinuation(
        { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
        "Die Bäckerin öffnet früh."
      )
    ).rejects.toThrow(/prefix-token identity violated/);
  });

  it("handles umlauts and an emoji surrogate pair in the sentence — span maps to token ids, not JS string indices", async () => {
    const { scoreTemplateContinuation } = await loadModule();
    const tokenizer = makeFakeTokenizer();
    const model = makeFakeModel();

    const result = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "Emoji-Satz: 😀 Bäume."
    );

    expect(result.scoredTokenIds).toEqual([7, 8, 9]);
  });

  it("invariant: scoring the same sentence twice yields the same score", async () => {
    const { scoreTemplateContinuation } = await loadModule();
    const tokenizer = makeFakeTokenizer();
    const model = makeFakeModel();

    const first = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "Männer sind stark."
    );
    const second = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "Männer sind stark."
    );

    expect(second.score).toBe(first.score);
  });

  it("invariant: extending a token-identical sentence prefix strictly decreases the score", async () => {
    const { scoreTemplateContinuation } = await loadModule();
    // "Die Bäckerin öffnet früh." -> [1,2,3]; a longer sentence sharing that exact prefix.
    const tokenizer = makeFakeTokenizer({
      combinedOverride: (contextIds, sentence) => {
        if (sentence === "short") return [...contextIds, 1, 2, 3];
        if (sentence === "long") return [...contextIds, 1, 2, 3, 4, 5];
        throw new Error(`unexpected sentence: ${sentence}`);
      },
    });
    const model = makeFakeModel();

    const shortResult = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "short"
    );
    const longResult = await scoreTemplateContinuation(
      { tokenizer, model, modelId: "test/gemma4", libraryVersion: "4.2.0" },
      "long"
    );

    expect(longResult.score).toBeLessThan(shortResult.score);
  });
});
