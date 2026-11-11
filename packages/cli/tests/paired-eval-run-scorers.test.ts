import type { PromptItem } from "@euconform/core/paired-eval";
import { describe, expect, it, vi } from "vitest";
import {
  LABEL_VARIANTS,
  parsePairedEvalConfig,
  resolveChatTemplateKwargs,
  resolveLabelTokens,
} from "../src/paired-eval/run-config";
import {
  contentOfLetter,
  createGreedyScorer,
  createLogprobScorer,
  createSeqlogprobScorer,
  decideFromLetters,
} from "../src/paired-eval/run-scorers";

const VOCAB = 128;
const SESSION = { intraOpNumThreads: 4, interOpNumThreads: 1 };
const code = (c: string) => c.charCodeAt(0);

function item(over: Partial<PromptItem> = {}): PromptItem {
  return {
    prompt_id: "p1",
    prompt: "Case?",
    arm: "main",
    option_order: "ER",
    letter_order: "AB",
    reference_content: "escalate",
    ...over,
  } as PromptItem;
}

function tokenizer() {
  return {
    apply_chat_template: (conv: { content: string }[]) => `<u>${conv[0]?.content}</u><a>`,
    encode: (text: string) => Array.from(text, code),
    decode: (ids: number[]) => String.fromCharCode(...ids),
    chat_template: "PLAIN",
  };
}

/** Logits keyed by the CURRENT last token, so continuation scoring is hand-computable. */
function model(logitFor: (lastToken: number, v: number) => number) {
  return async (inputs: { input_ids: unknown }) => {
    const ids = Array.from((inputs.input_ids as { data: BigInt64Array }).data, Number);
    const data = new Float64Array(ids.length * VOCAB);
    for (let p = 0; p < ids.length; p++) {
      for (let v = 0; v < VOCAB; v++) data[p * VOCAB + v] = logitFor(ids[p] as number, v);
    }
    return { logits: { data, dims: [1, ids.length, VOCAB], type: "float32" } };
  };
}

const baseDeps = (m: ReturnType<typeof model>) => ({
  tokenizer: tokenizer(),
  model: m,
  modelId: "fake/model",
  libraryVersion: "9.9.9",
  dtype: "fp32",
  sessionOptions: SESSION,
});

describe("letter mapping", () => {
  it("maps letters to contents for all four layouts", () => {
    expect(contentOfLetter(item({ option_order: "ER", letter_order: "AB" }), "A")).toBe("escalate");
    expect(contentOfLetter(item({ option_order: "ER", letter_order: "BA" }), "A")).toBe("routine");
    expect(contentOfLetter(item({ option_order: "RE", letter_order: "AB" }), "A")).toBe("routine");
    expect(contentOfLetter(item({ option_order: "RE", letter_order: "BA" }), "B")).toBe("routine");
  });

  it("decides on the larger log-prob and reports ties", () => {
    const it1 = item({ option_order: "ER", letter_order: "AB" });
    expect(decideFromLetters(it1, -1, -2)).toBe("escalate");
    expect(decideFromLetters(it1, -2, -1)).toBe("routine");
    expect(decideFromLetters(it1, -1, -1)).toBe("tie");
  });
});

describe("AP5.1 logprob scorer", () => {
  it("fills the letter fields and decides by content", async () => {
    // A is more likely than B at every position.
    const m = model((_l, v) => (v === code("A") ? 2 : v === code("B") ? 1 : 0));
    const scorer = createLogprobScorer({
      deps: baseDeps(m),
      labelTokens: ["A", "B"],
      chatTemplateKwargs: {},
    });
    const out = await scorer.score(item({ option_order: "RE", letter_order: "AB" }));
    expect(out.l_a).toBeGreaterThan(out.l_b as number);
    expect(out.label_tokens).toEqual(["A", "B"]);
    expect(out.label_token_ids).toEqual([65, 66]);
    expect(out.decision_content).toBe("routine"); // letter A sits on the routine line in RE
    expect(out.intra_op_threads).toBe(4);
  });

  it("refuses prompts of the word arm", async () => {
    const scorer = createLogprobScorer({
      deps: baseDeps(model(() => 0)),
      labelTokens: ["A", "B"],
      chatTemplateKwargs: {},
    });
    await expect(scorer.score(item({ arm: "word" }))).rejects.toThrow("word");
  });
});

describe("AP5.1 seqlogprob scorer", () => {
  it("scores both option words and decides by the larger sequence log-prob", async () => {
    // Boost the characters of " escalate" so it beats " routine".
    const boosted = new Set(Array.from(" escalate", code));
    const m = model((_l, v) => (boosted.has(v) ? 3 : 0));
    const scorer = createSeqlogprobScorer({ deps: baseDeps(m), chatTemplateKwargs: {} });
    const out = await scorer.score(item({ arm: "word" }));
    expect(out.l_escalate).toBeGreaterThan(out.l_routine as number);
    expect(out.decision_content).toBe("escalate");
    expect(out.l_a).toBeUndefined();
  });

  it("refuses prompts that are not in the word arm", async () => {
    const scorer = createSeqlogprobScorer({
      deps: baseDeps(model(() => 0)),
      chatTemplateKwargs: {},
    });
    await expect(scorer.score(item({ arm: "main" }))).rejects.toThrow("word");
  });
});

describe("AP5.1 greedy scorer", () => {
  function greedyDeps(newText: string) {
    const generate = vi.fn(async (args: { input_ids: unknown; max_new_tokens: number }) => {
      const promptIds = Array.from((args.input_ids as { data: BigInt64Array }).data, Number);
      const out = [...promptIds, ...Array.from(newText, code)];
      return { data: BigInt64Array.from(out.map(BigInt)), dims: [1, out.length] };
    });
    return {
      deps: {
        tokenizer: tokenizer(),
        generate,
        modelId: "fake/model",
        libraryVersion: "9.9.9",
        dtype: "fp32",
        sessionOptions: SESSION,
      },
      generate,
    };
  }

  it("parses the first standalone letter and maps it to content", async () => {
    const { deps, generate } = greedyDeps(" B)");
    const scorer = createGreedyScorer({ deps, maxNewTokens: 8, chatTemplateKwargs: {} });
    const out = await scorer.score(item({ option_order: "ER", letter_order: "AB" }));
    expect(out.generated).toBe(" B)");
    expect(out.greedy_letter).toBe("B");
    expect(out.decision_content).toBe("routine");
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ max_new_tokens: 8, do_sample: false })
    );
  });

  it("marks unparsable output as invalid", async () => {
    const { deps } = greedyDeps(" escalate");
    const scorer = createGreedyScorer({ deps, maxNewTokens: 8, chatTemplateKwargs: {} });
    const out = await scorer.score(item());
    expect(out.greedy_letter).toBe("invalid");
    expect(out.decision_content).toBe("invalid");
  });

  it("refuses the word arm", async () => {
    const { deps } = greedyDeps("A");
    const scorer = createGreedyScorer({ deps, maxNewTokens: 8, chatTemplateKwargs: {} });
    await expect(scorer.score(item({ arm: "word" }))).rejects.toThrow("word");
  });
});

describe("label token config", () => {
  const cfg = {
    config: parsePairedEvalConfig('{"models":{"m/x":{"label_tokens":[" A"," B"]}}}'),
    sha256: "f".repeat(64),
  };

  it("uses the frozen entry and records its source", () => {
    expect(resolveLabelTokens({ modelId: "m/x", config: cfg })).toEqual({
      tokens: [" A", " B"],
      source: "config",
      config_sha256: "f".repeat(64),
    });
  });

  it("aborts for a model without an entry and without flag (fail-closed)", () => {
    expect(() => resolveLabelTokens({ modelId: "m/y", config: cfg })).toThrow("No label tokens");
    expect(() => resolveLabelTokens({ modelId: "m/y", config: null })).toThrow("No label tokens");
  });

  it("takes the flag only for unfrozen models and rejects contradictions", () => {
    expect(resolveLabelTokens({ modelId: "m/y", config: null, flag: "plain" })).toEqual({
      tokens: LABEL_VARIANTS.plain,
      source: "flag",
      config_sha256: null,
    });
    expect(() => resolveLabelTokens({ modelId: "m/x", config: cfg, flag: "plain" })).toThrow(
      "contradicts"
    );
  });

  it("rejects malformed configs", () => {
    expect(() => parsePairedEvalConfig("{}")).toThrow("models");
    expect(() => parsePairedEvalConfig('{"models":{"m":{"label_tokens":["A"]}}}')).toThrow("pair");
  });

  it("sets enable_thinking:false only for templates that mention it", () => {
    expect(resolveChatTemplateKwargs("... enable_thinking ...")).toEqual({
      enable_thinking: false,
    });
    expect(resolveChatTemplateKwargs("plain")).toEqual({});
    expect(resolveChatTemplateKwargs(null)).toEqual({});
  });
});
