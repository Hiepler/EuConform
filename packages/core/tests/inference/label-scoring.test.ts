import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_THINK_BLOCK,
  type GreedyScoringDeps,
  type LabelScoringDeps,
  type LabelTokenizer,
  firstStandaloneLetter,
  generateGreedyAnswer,
  scoreNextTokenLabels,
  scoreOptionWords,
} from "../../src/inference/label-scoring";

/**
 * Offline tests for the label scorer: a character-level fake tokenizer (id = char code, so
 * "A" is one token and " A" is two) and fake logits that are known by construction, so
 * every expectation below is a hand calculation, not a snapshot of the code under test.
 */

const VOCAB = 128;
const SESSION = { intraOpNumThreads: 4, interOpNumThreads: 1 };

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

const PLAIN_TEMPLATE = "PLAIN {{messages}}";
const QWEN3_LIKE_TEMPLATE = "QWEN3-LIKE enable_thinking {{messages}}";

type Render = (user: string, kwargs: Record<string, unknown>) => string;

const plainRender: Render = (user) => `<u>${user}</u><a>`;
// A Qwen3-style template: the empty think block is rendered by the template itself when
// `enable_thinking === false`.
const qwen3Render: Render = (user, kwargs) =>
  `<u>${user}</u><a>${kwargs.enable_thinking === false ? EMPTY_THINK_BLOCK : ""}`;

function makeTokenizer(render: Render, template = PLAIN_TEMPLATE) {
  const applyChatTemplate = vi.fn(
    (
      conversation: { role: string; content: string }[],
      options: { add_generation_prompt: boolean; tokenize: false } & Record<string, unknown>
    ) => {
      const { add_generation_prompt, tokenize, ...kwargs } = options;
      expect(add_generation_prompt).toBe(true);
      expect(tokenize).toBe(false);
      return render(conversation[0]?.content ?? "", kwargs);
    }
  );
  const encode = vi.fn((text: string, options?: { add_special_tokens?: boolean }) => {
    expect(options).toEqual({ add_special_tokens: false });
    return Array.from(text, (c) => c.charCodeAt(0));
  });
  const decode = (ids: number[]) => String.fromCharCode(...ids);
  const tokenizer = {
    apply_chat_template: applyChatTemplate,
    encode,
    decode,
    chat_template: template,
  };
  return {
    tokenizer: tokenizer as LabelTokenizer & { decode: typeof decode },
    applyChatTemplate,
    encode,
  };
}

/** Logits row used at every position: logit[c] = rowLogits(c). */
function constantLogitsModel(rowLogits: (token: number) => number) {
  const seen: number[][] = [];
  const model = async (inputs: { input_ids: unknown }) => {
    const ids = Array.from((inputs.input_ids as { data: BigInt64Array }).data, Number);
    seen.push(ids);
    const data = new Float64Array(ids.length * VOCAB);
    for (let p = 0; p < ids.length; p++) {
      for (let v = 0; v < VOCAB; v++) data[p * VOCAB + v] = rowLogits(v);
    }
    return { logits: { data, dims: [1, ids.length, VOCAB], type: "float32" } };
  };
  return { model, seen };
}

function makeDeps(render: Render, rowLogits: (token: number) => number, template?: string) {
  const { tokenizer, applyChatTemplate, encode } = makeTokenizer(render, template);
  const { model, seen } = constantLogitsModel(rowLogits);
  const deps: LabelScoringDeps = {
    tokenizer,
    model,
    modelId: "fake/model",
    libraryVersion: "9.9.9",
    dtype: "fp32",
    sessionOptions: SESSION,
  };
  return { deps, seen, applyChatTemplate, encode };
}

const A = "A".charCodeAt(0);
const B = "B".charCodeAt(0);

describe("scoreNextTokenLabels", () => {
  // logit[A] = 2, logit[B] = 1, every other token 0 -> full softmax over 128 tokens.
  const rowLogits = (t: number) => (t === A ? 2 : t === B ? 1 : 0);
  const logZ = Math.log(126 + Math.exp(2) + Math.exp(1));

  it("AP3.1: l_A, l_B and M match the hand calculation to 1e-12 (full softmax, no renormalisation)", async () => {
    const { deps, seen } = makeDeps(plainRender, rowLogits);
    const result = await scoreNextTokenLabels(deps, "Case?", { labelTokens: ["A", "B"] });

    expect(Math.abs(result.logPA - (2 - logZ))).toBeLessThan(1e-12);
    expect(Math.abs(result.logPB - (1 - logZ))).toBeLessThan(1e-12);
    const mass = (Math.exp(2) + Math.exp(1)) / (126 + Math.exp(2) + Math.exp(1));
    expect(Math.abs(result.mass - mass)).toBeLessThan(1e-12);
    // Not renormalised over {A, B}: the mass is well below 1.
    expect(result.mass).toBeLessThan(0.1);
    expect(result.labelTokenIds).toEqual([A, B]);

    const rendered = "<u>Case?</u><a>Answer:";
    expect(result.nTokens).toBe(rendered.length);
    expect(seen).toHaveLength(1);
    expect(String.fromCharCode(...(seen[0] ?? []))).toBe(rendered);
    expect(result.templateSha256).toBe(sha256(PLAIN_TEMPLATE));
    expect(result.renderedPromptSha256).toBe(sha256(rendered));
    expect(result.thinkingMode).toBe("default");
  });

  it("AP3.1: reads the LAST position, not an earlier one", async () => {
    const model = async (inputs: { input_ids: unknown }) => {
      const n = (inputs.input_ids as { data: BigInt64Array }).data.length;
      const data = new Float64Array(n * VOCAB);
      // Earlier rows strongly prefer B; only the last row prefers A.
      for (let p = 0; p < n; p++) data[p * VOCAB + (p === n - 1 ? A : B)] = 10;
      return { logits: { data, dims: [1, n, VOCAB] } };
    };
    const { deps } = makeDeps(plainRender, () => 0);
    const result = await scoreNextTokenLabels({ ...deps, model }, "x", { labelTokens: ["A", "B"] });
    expect(result.logPA).toBeGreaterThan(result.logPB);
  });

  it("AP3.1: a label that is two tokens aborts with model, label and token ids", async () => {
    const { deps } = makeDeps(plainRender, rowLogits);
    await expect(scoreNextTokenLabels(deps, "x", { labelTokens: [" A", "B"] })).rejects.toThrow(
      /" A".*fake\/model.*\[32, 65\]/s
    );
  });

  it("aborts when both labels map to the same token", async () => {
    const { deps } = makeDeps(plainRender, rowLogits);
    await expect(scoreNextTokenLabels(deps, "x", { labelTokens: ["A", "A"] })).rejects.toThrow(
      /same token id 65/
    );
  });

  it("aborts without a chat template instead of scoring a bare prompt", async () => {
    const { deps } = makeDeps(plainRender, rowLogits);
    await expect(
      scoreNextTokenLabels(
        { ...deps, tokenizer: { ...deps.tokenizer, chat_template: null } },
        "x",
        { labelTokens: ["A", "B"] }
      )
    ).rejects.toThrow(/no chat template/);
  });

  it("aborts on non-finite logits", async () => {
    const { deps } = makeDeps(plainRender, () => Number.NaN);
    await expect(scoreNextTokenLabels(deps, "x", { labelTokens: ["A", "B"] })).rejects.toThrow(
      /non-finite logit/
    );
  });

  it("records the thread settings it was given and the library facts", async () => {
    const { deps } = makeDeps(plainRender, rowLogits);
    const { provenance } = await scoreNextTokenLabels(deps, "x", { labelTokens: ["A", "B"] });
    expect(provenance).toMatchObject({
      modelId: "fake/model",
      dtype: "fp32",
      logitsDtype: "float32",
      libraryVersion: "9.9.9",
      intraOpNumThreads: 4,
      interOpNumThreads: 1,
    });
  });

  it("honours a custom assistant prefix", async () => {
    const { deps, seen } = makeDeps(plainRender, rowLogits);
    await scoreNextTokenLabels(deps, "x", { assistantPrefix: "Reply:", labelTokens: ["A", "B"] });
    expect(String.fromCharCode(...(seen[0] ?? []))).toBe("<u>x</u><a>Reply:");
  });
});

describe("Qwen3-style thinking handling (AP3.2)", () => {
  const rowLogits = (t: number) => (t === A ? 1 : 0);
  const asText = (ids: number[] | undefined) => String.fromCharCode(...(ids ?? []));

  it("template honours enable_thinking: the model sees one empty think block and the prompt ends on Answer:", async () => {
    const { deps, seen, applyChatTemplate } = makeDeps(qwen3Render, rowLogits, QWEN3_LIKE_TEMPLATE);
    const result = await scoreNextTokenLabels(deps, "q", {
      labelTokens: ["A", "B"],
      chatTemplateKwargs: { enable_thinking: false },
    });
    const prompt = asText(seen[0]);
    expect(prompt).toBe(`<u>q</u><a>${EMPTY_THINK_BLOCK}Answer:`);
    expect(prompt.split("<think>")).toHaveLength(2);
    expect(prompt.endsWith("Answer:")).toBe(true);
    expect(result.thinkingMode).toBe("template_kwarg");
    expect(applyChatTemplate).toHaveBeenCalledWith(expect.anything(), {
      add_generation_prompt: true,
      tokenize: false,
      enable_thinking: false,
    });
  });

  it("template ignores the kwarg: the empty block is appended manually, exactly once", async () => {
    const { deps, seen } = makeDeps(plainRender, rowLogits, QWEN3_LIKE_TEMPLATE);
    const result = await scoreNextTokenLabels(deps, "q", {
      labelTokens: ["A", "B"],
      chatTemplateKwargs: { enable_thinking: false },
    });
    const prompt = asText(seen[0]);
    expect(prompt).toBe(`<u>q</u><a>${EMPTY_THINK_BLOCK}Answer:`);
    expect(result.thinkingMode).toBe("manual_empty_block");
    expect(result.provenance.thinkingMode).toBe("manual_empty_block");
    expect(result.renderedPromptSha256).toBe(sha256(prompt));
  });

  it("without the kwarg nothing is added", async () => {
    const { deps, seen } = makeDeps(qwen3Render, rowLogits, QWEN3_LIKE_TEMPLATE);
    const result = await scoreNextTokenLabels(deps, "q", { labelTokens: ["A", "B"] });
    expect(asText(seen[0])).toBe("<u>q</u><a>Answer:");
    expect(result.thinkingMode).toBe("default");
  });
});

describe("scoreOptionWords (AP5, seqlogprob)", () => {
  // Same logits row at every position: logit[c] = (c % 7) / 2.
  const rowLogits = (t: number) => (t % 7) / 2;
  const logZ = Math.log(
    Array.from({ length: VOCAB }, (_, v) => Math.exp(rowLogits(v))).reduce((a, b) => a + b)
  );
  const handSum = (word: string) =>
    Array.from(word, (c) => rowLogits(c.charCodeAt(0)) - logZ).reduce((a, b) => a + b, 0);

  it("sums the log-probabilities of every word token as a continuation of the prefix", async () => {
    const { deps, seen } = makeDeps(plainRender, rowLogits);
    const result = await scoreOptionWords(deps, "x", { words: [" escalate", " routine"] });

    expect(Math.abs((result.logPWords[0] ?? 0) - handSum(" escalate"))).toBeLessThan(1e-12);
    expect(Math.abs((result.logPWords[1] ?? 0) - handSum(" routine"))).toBeLessThan(1e-12);
    expect(result.wordTokenIds[0]).toEqual(Array.from(" escalate", (c) => c.charCodeAt(0)));
    expect(result.nTokens).toBe("<u>x</u><a>Answer:".length);
    expect(seen.map((ids) => String.fromCharCode(...ids))).toEqual([
      "<u>x</u><a>Answer: escalate",
      "<u>x</u><a>Answer: routine",
    ]);
    expect(result.provenance.intraOpNumThreads).toBe(4);
  });

  it("aborts when the tokenizer merges across the prefix/word boundary", async () => {
    const { deps } = makeDeps(plainRender, rowLogits);
    const merging: LabelTokenizer = {
      ...deps.tokenizer,
      // The prefix ends in ":"; a merged ":e" token breaks the prefix identity.
      encode: (text) =>
        text.endsWith("Answer:")
          ? Array.from(text, (c) => c.charCodeAt(0))
          : [...Array.from(text.slice(0, "<u>x</u><a>Answer".length), (c) => c.charCodeAt(0)), 99],
    };
    await expect(
      scoreOptionWords({ ...deps, tokenizer: merging }, "x", { words: [" escalate", " routine"] })
    ).rejects.toThrow(/prefix-token identity violated/);
  });
});

describe("firstStandaloneLetter", () => {
  it.each([
    ["A", "A"],
    [" B)", "B"],
    ["(A)", "A"],
    ["B\nA", "B"],
    ["ABC", "invalid"],
    ["Bob", "invalid"],
    ["1A", "invalid"],
    ["escalate", "invalid"],
    ["", "invalid"],
  ])("%j -> %s", (text, expected) => {
    expect(firstStandaloneLetter(text)).toBe(expected);
  });
});

describe("generateGreedyAnswer (AP5, greedy)", () => {
  function makeGreedy(newText: string) {
    const { tokenizer } = makeTokenizer(plainRender);
    const generate = vi.fn(async (args: { input_ids: unknown; max_new_tokens: number }) => {
      const promptIds = Array.from((args.input_ids as { data: BigInt64Array }).data, Number);
      const out = [...promptIds, ...Array.from(newText, (c) => c.charCodeAt(0))];
      return { data: BigInt64Array.from(out.map(BigInt)), dims: [1, out.length] };
    });
    const deps: GreedyScoringDeps = {
      tokenizer,
      generate,
      modelId: "fake/model",
      libraryVersion: "9.9.9",
      dtype: "fp32",
      sessionOptions: SESSION,
    };
    return { deps, generate };
  }

  it("decodes only the new tokens and takes the first standalone letter", async () => {
    const { deps, generate } = makeGreedy(" B)");
    const result = await generateGreedyAnswer(deps, "x", { maxNewTokens: 8 });
    expect(result.generated).toBe(" B)");
    expect(result.letter).toBe("B");
    expect(result.nTokens).toBe("<u>x</u><a>Answer:".length);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_new_tokens: 8,
        do_sample: false,
        repetition_penalty: 1,
      })
    );
  });

  it("reports invalid when no standalone A or B appears", async () => {
    const { deps } = makeGreedy(" escalate");
    const result = await generateGreedyAnswer(deps, "x", { maxNewTokens: 8 });
    expect(result.letter).toBe("invalid");
  });

  it("aborts when the generated sequence does not start with the prompt", async () => {
    const { deps } = makeGreedy("A");
    const broken: GreedyScoringDeps = {
      ...deps,
      generate: async () => ({ data: BigInt64Array.from([1n, 2n, 3n]), dims: [1, 3] }),
    };
    await expect(generateGreedyAnswer(broken, "x", { maxNewTokens: 8 })).rejects.toThrow(
      /does not start with the prompt/
    );
  });

  it("rejects a non-positive token budget", async () => {
    const { deps } = makeGreedy("A");
    await expect(generateGreedyAnswer(deps, "x", { maxNewTokens: 0 })).rejects.toThrow(
      /positive integer/
    );
  });
});
