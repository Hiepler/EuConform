import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for the BOS fix in `BrowserInference.getScoredLogProb` / `getLogProb`.
 *
 * The underlying log-softmax math is already anchored by the offline synthetic test
 * (tests/inference/synthetic-logits.test.ts), so mocking the tokenizer/model here is
 * the right call: this test only needs to prove the WIRING is correct — that BOS is
 * prepended, that BOS itself is never scored, and that every sentence token (including
 * the first one) IS scored.
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

const BOS_TOKEN = "<|bos|>";
const BOS_TOKEN_ID = 4;
// Sentence "Hi there" tokenizes (without special tokens) to ids [1, 2] (within vocab).
const SENTENCE_TOKEN_IDS = [1, 2];
const VOCAB_SIZE = 5;

const modelCallSpy = vi.fn();

vi.mock("@huggingface/transformers", () => {
  const tokenizerFn = vi.fn((_text: string, _opts: unknown) => ({
    input_ids: new FakeTensor("int64", BigInt64Array.from(SENTENCE_TOKEN_IDS.map(BigInt)), [
      1,
      SENTENCE_TOKEN_IDS.length,
    ]),
  })) as unknown as {
    (text: string, opts: unknown): { input_ids: FakeTensor };
    bos_token: string;
    bos_token_id: number;
  };
  tokenizerFn.bos_token = BOS_TOKEN;
  tokenizerFn.bos_token_id = BOS_TOKEN_ID;

  const modelFn = vi.fn(async (inputs: { input_ids: FakeTensor; attention_mask: FakeTensor }) => {
    modelCallSpy(inputs);
    const seqLen = inputs.input_ids.dims[1];
    // Deterministic, finite logits: row i has the target id-th slot slightly higher.
    const data = new Float32Array(seqLen * VOCAB_SIZE);
    for (let i = 0; i < seqLen; i++) {
      for (let v = 0; v < VOCAB_SIZE; v++) {
        data[i * VOCAB_SIZE + v] = v === (i % VOCAB_SIZE) + 1 ? 2 : 0;
      }
    }
    return { logits: new FakeTensor("float32", data, [1, seqLen, VOCAB_SIZE]) };
  });

  return {
    AutoTokenizer: { from_pretrained: vi.fn(async () => tokenizerFn) },
    AutoModelForCausalLM: { from_pretrained: vi.fn(async () => modelFn) },
    Tensor: FakeTensor,
  };
});

async function loadBrowserInference() {
  const mod = await import("../../src/inference/browser-inference");
  return mod.BrowserInference;
}

describe("BrowserInference.getScoredLogProb (BOS fix regression)", () => {
  beforeEach(() => {
    modelCallSpy.mockClear();
  });

  it("prepends BOS, never scores it, and scores every sentence token including the first", async () => {
    const BrowserInference = await loadBrowserInference();
    const engine = new BrowserInference("Xenova/gpt2");

    const result = await engine.getScoredLogProb("Hi there");

    // scoredTokenIds must equal the tokenizer's sentence output (BOS excluded).
    expect(result.scoredTokenIds).toEqual(SENTENCE_TOKEN_IDS);

    // Span is [1, n+1) over the BOS-prefixed sequence: BOS at position 0 (never
    // scored), sentence tokens at positions 1..n.
    expect(result.span).toEqual({ start: 1, end: SENTENCE_TOKEN_IDS.length + 1 });

    // The model must have been called with BOS prepended to input_ids and a matching
    // all-ones attention_mask of the same new length.
    expect(modelCallSpy).toHaveBeenCalledTimes(1);
    const callArgs = modelCallSpy.mock.calls[0][0] as {
      input_ids: FakeTensor;
      attention_mask: FakeTensor;
    };
    expect(Array.from(callArgs.input_ids.data as BigInt64Array)).toEqual(
      [BOS_TOKEN_ID, ...SENTENCE_TOKEN_IDS].map(BigInt)
    );
    expect(Array.from(callArgs.attention_mask.data as BigInt64Array)).toEqual(
      new Array(SENTENCE_TOKEN_IDS.length + 1).fill(1n)
    );

    // Score must be finite (real computation via sumSequenceLogProb, not a stub).
    expect(Number.isFinite(result.score)).toBe(true);

    // Provenance carries model id and backend.
    expect(result.provenance.modelId).toBe("Xenova/gpt2");
    expect(result.provenance.backend).toBe("node-onnx");
  });

  it("contextTokenHash is the SHA-256 of the compact JSON array of context token ids ([BOS])", async () => {
    const BrowserInference = await loadBrowserInference();
    const engine = new BrowserInference("Xenova/gpt2");

    const result = await engine.getScoredLogProb("Hi there");

    const expectedBytes = new TextEncoder().encode(JSON.stringify([BOS_TOKEN_ID]));
    const expectedDigest = await globalThis.crypto.subtle.digest("SHA-256", expectedBytes);
    const expectedHex = Array.from(new Uint8Array(expectedDigest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(result.contextTokenHash).toBe(expectedHex);
  });

  it("getLogProb is a thin wrapper returning only the score", async () => {
    const BrowserInference = await loadBrowserInference();
    const engine = new BrowserInference("Xenova/gpt2");

    const scored = await engine.getScoredLogProb("Hi there");
    const scoreOnly = await engine.getLogProb("Hi there");

    expect(scoreOnly).toBeCloseTo(scored.score, 9);
  });

  it("aborts with a speaking error when the tokenizer has no bos_token", async () => {
    const BrowserInference = await loadBrowserInference();
    const engine = new BrowserInference("Xenova/gpt2");
    await engine.load();

    // Simulate a tokenizer without a defined bos_token.
    // biome-ignore lint/suspicious/noExplicitAny: reaching into private test double
    (engine as any).tokenizer.bos_token = "";

    await expect(engine.getScoredLogProb("Hi there")).rejects.toThrow(/has no bos_token defined/);
  });
});
