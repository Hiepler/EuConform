/**
 * Label scoring for the paired decision eval: log-probabilities of the NEXT token after an
 * assistant prefix such as `Answer:`, read from the FULL log-softmax of the last position
 * (no renormalisation over the two labels, so the label mass `M` stays observable), plus
 * the two other read-outs of the robustness arm: summed sequence log-probability of option
 * words (`scoreOptionWords`) and greedy generation (`generateGreedyAnswer`).
 *
 * Like `template-scoring.ts` this module is exercised offline through injected fakes. It
 * never calls `apply_chat_template` with `tokenize: true` (see the FALLE note in
 * `template-scoring.ts`): the template is rendered to a string and tokenized with `encode`.
 * Unlike `template-scoring.ts` it encodes with `add_special_tokens: false`, because the
 * rendered chat template already carries its special tokens (`<|begin_of_text|>`, `<bos>`);
 * encoding with the default would stack a second BOS on tokenizers whose post-processor
 * adds one. This mirrors what `apply_chat_template({ tokenize: true })` does itself.
 */

import type { ScoredLogProbProvenance } from "./scored-log-prob-types";
import type { LogitsTensorLike, Span } from "./sequence-logprob";
import { sumSequenceLogProb } from "./sequence-logprob";
import { assertPrefixIdentity } from "./template-scoring";
import type { TemplateChatMessage, TemplateModel } from "./template-scoring";

export const DEFAULT_ASSISTANT_PREFIX = "Answer:";

/** The empty reasoning block Qwen3's template emits when `enable_thinking` is false. */
export const EMPTY_THINK_BLOCK = "<think>\n\n</think>\n\n";
const EMPTY_THINK_TAIL = /<think>\s*<\/think>\s*$/;

/** The thread settings that were actually handed to `from_pretrained({ session_options })`. */
export interface SessionThreadSettings {
  intraOpNumThreads: number;
  interOpNumThreads: number;
}

export interface LabelTokenizer {
  apply_chat_template(
    conversation: TemplateChatMessage[],
    options: { add_generation_prompt: boolean; tokenize: false } & Record<string, unknown>
  ): string;
  encode(text: string, options?: { add_special_tokens?: boolean }): number[];
  /** The raw Jinja chat template; hashed into the provenance. */
  chat_template?: string | null;
}

export interface LabelScoringDeps {
  tokenizer: LabelTokenizer;
  model: TemplateModel;
  modelId: string;
  libraryVersion: string;
  /** The configured weight precision, same meaning as in `TemplateScoringDeps.dtype`. */
  dtype: string;
  /** The values passed to the model loader; recorded verbatim, never re-derived. */
  sessionOptions: SessionThreadSettings;
}

/**
 * How the reasoning block of the prompt was handled:
 * - `default`: no thinking-related kwarg was requested, the template ran as it is.
 * - `template_kwarg`: `enable_thinking: false` reached the template and it rendered the
 *   empty think block itself.
 * - `manual_empty_block`: the template ignored the kwarg, so the empty block was appended
 *   before the assistant prefix.
 */
export type ThinkingMode = "default" | "template_kwarg" | "manual_empty_block";

export interface LabelScoringOptions {
  /** Appended after the rendered template (and after any manual think block). */
  assistantPrefix?: string;
  /** Exactly two single-token labels, e.g. `["A", "B"]` or `[" A", " B"]`. */
  labelTokens: [string, string];
  /** Extra variables for the Jinja chat template, e.g. `{ enable_thinking: false }`. */
  chatTemplateKwargs?: Record<string, unknown>;
}

export interface LabelScoringProvenance extends ScoredLogProbProvenance {
  intraOpNumThreads: number;
  interOpNumThreads: number;
  thinkingMode: ThinkingMode;
  chatTemplateKwargs: Record<string, unknown>;
}

export interface LabelScoreResult {
  logPA: number;
  logPB: number;
  mass: number;
  labelTokenIds: [number, number];
  templateSha256: string;
  renderedPromptSha256: string;
  nTokens: number;
  thinkingMode: ThinkingMode;
  provenance: LabelScoringProvenance;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodeRaw(tokenizer: LabelTokenizer, text: string): number[] {
  return Array.from(tokenizer.encode(text, { add_special_tokens: false }), Number);
}

interface RenderedPrompt {
  /** Template output plus manual think block plus assistant prefix. */
  text: string;
  templateSha256: string;
  thinkingMode: ThinkingMode;
}

async function renderPrompt(
  deps: LabelScoringDeps,
  userText: string,
  assistantPrefix: string,
  chatTemplateKwargs: Record<string, unknown>
): Promise<RenderedPrompt> {
  const { tokenizer, modelId } = deps;
  const template = tokenizer.chat_template;
  if (typeof template !== "string" || template.length === 0) {
    throw new Error(
      `scoreNextTokenLabels: model "${modelId}" has no chat template. The template hash is a mandatory provenance field, and a bare prompt would measure outside the model format.`
    );
  }

  let text = tokenizer.apply_chat_template([{ role: "user", content: userText }], {
    add_generation_prompt: true,
    tokenize: false,
    ...chatTemplateKwargs,
  });

  let thinkingMode: ThinkingMode = "default";
  if (chatTemplateKwargs.enable_thinking === false) {
    if (EMPTY_THINK_TAIL.test(text)) {
      thinkingMode = "template_kwarg";
    } else {
      text += EMPTY_THINK_BLOCK;
      thinkingMode = "manual_empty_block";
    }
  }
  text += assistantPrefix;

  return { text, templateSha256: await sha256Hex(template), thinkingMode };
}

function assertLogitsShape(logits: LogitsTensorLike, position: number, context: string): number {
  const { data, dims } = logits;
  if (!(data instanceof Float32Array) && !(data instanceof Float64Array)) {
    throw new Error(`${context}: unsupported logits dtype, expected Float32Array or Float64Array`);
  }
  if (dims.length !== 3 || dims[0] !== 1) {
    throw new Error(
      `${context}: expected logits dims [1, seqLen, vocabSize], got [${dims.join(", ")}]`
    );
  }
  const seqLen = dims[1] ?? 0;
  if (position < 0 || position >= seqLen) {
    throw new Error(`${context}: position ${position} outside logits seqLen ${seqLen}`);
  }
  return dims[2] ?? 0;
}

/** Full log-softmax of one row of a [1, seqLen, vocab] logits tensor, read at `tokenIds`. */
function logProbsAtPosition(
  logits: LogitsTensorLike,
  position: number,
  tokenIds: readonly number[],
  context: string
): number[] {
  const vocabSize = assertLogitsShape(logits, position, context);
  const { data } = logits;
  const rowStart = position * vocabSize;
  let maxLogit = Number.NEGATIVE_INFINITY;
  for (let v = 0; v < vocabSize; v++) {
    const val = data[rowStart + v] ?? Number.NaN;
    if (!Number.isFinite(val)) {
      throw new Error(`${context}: non-finite logit at vocab index ${v} (value: ${val})`);
    }
    if (val > maxLogit) maxLogit = val;
  }
  let sumExp = 0;
  for (let v = 0; v < vocabSize; v++) {
    sumExp += Math.exp((data[rowStart + v] ?? Number.NaN) - maxLogit);
  }
  const logSumExp = maxLogit + Math.log(sumExp);
  return tokenIds.map((id) => {
    if (!Number.isInteger(id) || id < 0 || id >= vocabSize) {
      throw new Error(`${context}: token id ${id} out of vocab range [0, ${vocabSize})`);
    }
    return (data[rowStart + id] ?? Number.NaN) - logSumExp;
  });
}

async function forwardLogits(
  model: TemplateModel,
  tokenIds: readonly number[]
): Promise<LogitsTensorLike> {
  const { Tensor } = await import("@huggingface/transformers");
  const seqLen = tokenIds.length;
  const inputIds = new Tensor("int64", BigInt64Array.from(tokenIds.map(BigInt)), [1, seqLen]);
  const attentionMask = new Tensor("int64", BigInt64Array.from(new Array(seqLen).fill(1n)), [
    1,
    seqLen,
  ]);
  const outputs = await model({ input_ids: inputIds, attention_mask: attentionMask });
  return outputs.logits;
}

function resolveLabelTokenIds(
  tokenizer: LabelTokenizer,
  modelId: string,
  labelTokens: [string, string]
): [number, number] {
  const ids = labelTokens.map((label) => {
    const encoded = encodeRaw(tokenizer, label);
    if (encoded.length !== 1) {
      throw new Error(
        `scoreNextTokenLabels: label ${JSON.stringify(label)} is not exactly one token on model ` +
          `"${modelId}" (token ids: [${encoded.join(", ")}]). Pick a different label variant.`
      );
    }
    return encoded[0] as number;
  });
  const [a, b] = ids as [number, number];
  if (a === b) {
    throw new Error(
      `scoreNextTokenLabels: labels ${JSON.stringify(labelTokens[0])} and ${JSON.stringify(labelTokens[1])} ` +
        `map to the same token id ${a} on model "${modelId}".`
    );
  }
  return [a, b];
}

/**
 * Score the two label tokens as the next token after `assistantPrefix`.
 *
 * `logPA`/`logPB` belong to `labelTokens[0]`/`labelTokens[1]` and come from the full
 * log-softmax of the last position; `mass = e^logPA + e^logPB`.
 */
export async function scoreNextTokenLabels(
  deps: LabelScoringDeps,
  userText: string,
  opts: LabelScoringOptions
): Promise<LabelScoreResult> {
  const { tokenizer, model, modelId, libraryVersion, dtype, sessionOptions } = deps;
  const assistantPrefix = opts.assistantPrefix ?? DEFAULT_ASSISTANT_PREFIX;
  const kwargs = opts.chatTemplateKwargs ?? {};

  const labelTokenIds = resolveLabelTokenIds(tokenizer, modelId, opts.labelTokens);
  const rendered = await renderPrompt(deps, userText, assistantPrefix, kwargs);

  const tokenIds = encodeRaw(tokenizer, rendered.text);
  if (tokenIds.length === 0) {
    throw new Error(
      `scoreNextTokenLabels: rendered prompt tokenized to 0 tokens on model "${modelId}".`
    );
  }

  const logits = await forwardLogits(model, tokenIds);
  const [logPA, logPB] = logProbsAtPosition(
    logits,
    tokenIds.length - 1,
    labelTokenIds,
    "scoreNextTokenLabels"
  ) as [number, number];

  const renderedPromptSha256 = await sha256Hex(rendered.text);
  return {
    logPA,
    logPB,
    mass: Math.exp(logPA) + Math.exp(logPB),
    labelTokenIds,
    templateSha256: rendered.templateSha256,
    renderedPromptSha256,
    nTokens: tokenIds.length,
    thinkingMode: rendered.thinkingMode,
    provenance: {
      modelId,
      dtype,
      logitsDtype: String((logits as unknown as { type?: string }).type ?? "unknown"),
      backend: "node-onnx",
      libraryVersion,
      promptText: rendered.text,
      promptSha256: renderedPromptSha256,
      intraOpNumThreads: sessionOptions.intraOpNumThreads,
      interOpNumThreads: sessionOptions.interOpNumThreads,
      thinkingMode: rendered.thinkingMode,
      chatTemplateKwargs: kwargs,
    },
  };
}

export interface OptionWordScoringOptions {
  assistantPrefix?: string;
  /** Continuations scored after the prefix, verbatim (include the leading space if wanted). */
  words: [string, string];
  chatTemplateKwargs?: Record<string, unknown>;
}

export interface OptionWordScoreResult {
  /** Summed sequence log-probability of `words[0]` and `words[1]`. */
  logPWords: [number, number];
  /** Token ids of each continuation. */
  wordTokenIds: [number[], number[]];
  templateSha256: string;
  /** Hash of the rendered prefix (template + assistant prefix), without the word. */
  renderedPromptSha256: string;
  /** Token count of the rendered prefix. */
  nTokens: number;
  thinkingMode: ThinkingMode;
  provenance: LabelScoringProvenance;
}

/**
 * Robustness arm (a): score each option word as the continuation of `assistantPrefix` with
 * `sumSequenceLogProb`. One forward pass per word; a tokenizer merge across the
 * prefix/word boundary aborts, as in template-mode scoring.
 */
export async function scoreOptionWords(
  deps: LabelScoringDeps,
  userText: string,
  opts: OptionWordScoringOptions
): Promise<OptionWordScoreResult> {
  const { tokenizer, model, modelId, libraryVersion, dtype, sessionOptions } = deps;
  const assistantPrefix = opts.assistantPrefix ?? DEFAULT_ASSISTANT_PREFIX;
  const kwargs = opts.chatTemplateKwargs ?? {};

  const rendered = await renderPrompt(deps, userText, assistantPrefix, kwargs);
  const contextIds = encodeRaw(tokenizer, rendered.text);
  if (contextIds.length === 0) {
    throw new Error(
      `scoreOptionWords: rendered prompt tokenized to 0 tokens on model "${modelId}".`
    );
  }

  const scores: number[] = [];
  const wordTokenIds: number[][] = [];
  let logitsType = "unknown";
  for (const word of opts.words) {
    const combined = encodeRaw(tokenizer, rendered.text + word);
    assertPrefixIdentity(contextIds, combined, modelId, word);
    const span: Span = { start: contextIds.length, end: combined.length };
    if (span.start >= span.end) {
      throw new Error(
        `scoreOptionWords: word ${JSON.stringify(word)} contributed zero tokens on model "${modelId}".`
      );
    }
    const logits = await forwardLogits(model, combined);
    logitsType = String((logits as unknown as { type?: string }).type ?? "unknown");
    scores.push(sumSequenceLogProb(logits, combined, span));
    wordTokenIds.push(combined.slice(span.start));
  }

  const renderedPromptSha256 = await sha256Hex(rendered.text);
  return {
    logPWords: scores as [number, number],
    wordTokenIds: wordTokenIds as [number[], number[]],
    templateSha256: rendered.templateSha256,
    renderedPromptSha256,
    nTokens: contextIds.length,
    thinkingMode: rendered.thinkingMode,
    provenance: {
      modelId,
      dtype,
      logitsDtype: logitsType,
      backend: "node-onnx",
      libraryVersion,
      promptText: rendered.text,
      promptSha256: renderedPromptSha256,
      intraOpNumThreads: sessionOptions.intraOpNumThreads,
      interOpNumThreads: sessionOptions.interOpNumThreads,
      thinkingMode: rendered.thinkingMode,
      chatTemplateKwargs: kwargs,
    },
  };
}

/** Minimal shape of the Tensor `generate` returns for a batch of one. */
export interface GeneratedSequenceLike {
  data: ArrayLike<bigint | number>;
  dims: readonly number[];
}

export interface GreedyTokenizer extends LabelTokenizer {
  decode(tokenIds: number[], options?: { skip_special_tokens?: boolean }): string;
}

export type GreedyModel = (args: {
  input_ids: unknown;
  attention_mask: unknown;
  max_new_tokens: number;
  do_sample: false;
  repetition_penalty: number;
}) => Promise<GeneratedSequenceLike>;

export interface GreedyScoringDeps {
  tokenizer: GreedyTokenizer;
  generate: GreedyModel;
  modelId: string;
  libraryVersion: string;
  dtype: string;
  sessionOptions: SessionThreadSettings;
}

export interface GreedyAnswerResult {
  generated: string;
  letter: "A" | "B" | "invalid";
  templateSha256: string;
  renderedPromptSha256: string;
  nTokens: number;
  thinkingMode: ThinkingMode;
  provenance: LabelScoringProvenance;
}

/** First `A` or `B` that is not part of a longer word or number, else `invalid`. */
export function firstStandaloneLetter(text: string): "A" | "B" | "invalid" {
  const match = /(?<![\p{L}\p{N}])([AB])(?![\p{L}\p{N}])/u.exec(text);
  return match ? (match[1] as "A" | "B") : "invalid";
}

/**
 * Robustness arm (b): greedy generation (no sampling, no repetition penalty) of at most
 * `maxNewTokens` tokens after `assistantPrefix`; the first standalone `A` or `B` counts.
 */
export async function generateGreedyAnswer(
  deps: GreedyScoringDeps,
  userText: string,
  opts: {
    assistantPrefix?: string;
    maxNewTokens: number;
    chatTemplateKwargs?: Record<string, unknown>;
  }
): Promise<GreedyAnswerResult> {
  const { tokenizer, generate, modelId, libraryVersion, dtype, sessionOptions } = deps;
  if (!Number.isInteger(opts.maxNewTokens) || opts.maxNewTokens < 1) {
    throw new Error(
      `generateGreedyAnswer: maxNewTokens must be a positive integer, got ${opts.maxNewTokens}`
    );
  }
  const assistantPrefix = opts.assistantPrefix ?? DEFAULT_ASSISTANT_PREFIX;
  const kwargs = opts.chatTemplateKwargs ?? {};

  const rendered = await renderPrompt(deps, userText, assistantPrefix, kwargs);
  const promptIds = encodeRaw(tokenizer, rendered.text);
  if (promptIds.length === 0) {
    throw new Error(
      `generateGreedyAnswer: rendered prompt tokenized to 0 tokens on model "${modelId}".`
    );
  }

  const { Tensor } = await import("@huggingface/transformers");
  const inputIds = new Tensor("int64", BigInt64Array.from(promptIds.map(BigInt)), [
    1,
    promptIds.length,
  ]);
  const attentionMask = new Tensor(
    "int64",
    BigInt64Array.from(new Array(promptIds.length).fill(1n)),
    [1, promptIds.length]
  );
  const sequence = await generate({
    input_ids: inputIds,
    attention_mask: attentionMask,
    max_new_tokens: opts.maxNewTokens,
    do_sample: false,
    // Qwen2.5 ships repetition_penalty 1.05 in its generation_config; greedy means argmax.
    repetition_penalty: 1,
  });
  if (sequence.dims.length !== 2 || sequence.dims[0] !== 1) {
    throw new Error(
      `generateGreedyAnswer: expected generated sequence dims [1, n], got [${sequence.dims.join(", ")}]`
    );
  }
  const all = Array.from(sequence.data, Number);
  for (let i = 0; i < promptIds.length; i++) {
    if (all[i] !== promptIds[i]) {
      throw new Error(
        `generateGreedyAnswer: generated sequence does not start with the prompt tokens (position ${i}) on model "${modelId}".`
      );
    }
  }
  const newIds = all.slice(promptIds.length, promptIds.length + opts.maxNewTokens);
  const generated =
    newIds.length === 0 ? "" : tokenizer.decode(newIds, { skip_special_tokens: true });

  const renderedPromptSha256 = await sha256Hex(rendered.text);
  return {
    generated,
    letter: firstStandaloneLetter(generated),
    templateSha256: rendered.templateSha256,
    renderedPromptSha256,
    nTokens: promptIds.length,
    thinkingMode: rendered.thinkingMode,
    provenance: {
      modelId,
      dtype,
      logitsDtype: "n/a",
      backend: "node-onnx",
      libraryVersion,
      promptText: rendered.text,
      promptSha256: renderedPromptSha256,
      intraOpNumThreads: sessionOptions.intraOpNumThreads,
      interOpNumThreads: sessionOptions.interOpNumThreads,
      thinkingMode: rendered.thinkingMode,
      chatTemplateKwargs: kwargs,
    },
  };
}
