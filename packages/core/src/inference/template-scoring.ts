/**
 * Gemma-4 template-mode scoring: `conditional_sequence_logprob_sum`.
 *
 * Gemma-4 (and any other instruction-tuned "ForConditionalGeneration" architecture) is
 * trained on chat-templated input. Feeding it a bare sentence — the base-mode approach
 * from Task 1 — measures outside its intended input format. Instead, the sentence is
 * scored as an ASSISTANT CONTINUATION after a fixed, WOERTLICH user turn (Messmotor-
 * Sanierung Task 5 / Plan v5), and only the sentence's own tokens are scored — never the
 * template's.
 *
 * Split out of `transformers-inference.ts` (per Task 5 brief item 3) to keep that file
 * from growing unwieldy; this module owns everything specific to the template-mode span
 * computation and is exercised entirely offline via injected fakes (`TemplateTokenizer`,
 * `TemplateModel`) — no `@huggingface/transformers` mocking needed except for `Tensor`,
 * which is dynamically imported the same way `transformers-inference.ts` does it.
 *
 * FALLE aus dem Spike (Task 0): `tokenizer.apply_chat_template(..., { tokenize: true })`
 * returns `{ input_ids: Tensor, attention_mask: Tensor }`, NOT a plain array. Naively
 * calling `Array.isArray()`/`Array.from()` on that object yields `context_len = 0`, which
 * makes the prefix-identity check vacuously true. This module never calls
 * `apply_chat_template` with `tokenize: true` at all — it uses `tokenize: false` to get
 * the literal context STRING, then tokenizes that string (and the context+sentence
 * string) via `tokenizer.encode()`, which returns a plain `number[]` by contract. The
 * `context_len > 0` guard below exists anyway, as a structural regression test against
 * this exact trap resurfacing under a future refactor.
 */

import type { ScoredLogProb, ScoredLogProbProvenance } from "./scored-log-prob-types";
import type { LogitsTensorLike, Span } from "./sequence-logprob";
import { sumSequenceLogProb } from "./sequence-logprob";

/**
 * WOERTLICH fixed context spec (Messmotor-Sanierung Task 5 / Plan v5), verified against
 * the real gemma-4-E2B-it tokenizer by the Task 0 spike (18 tokens,
 * [2,105,2364,107,13790,500,18252,10175,171313,118778,4238,29078,236761,106,107,105,4368,107]).
 * NEVER change this text without re-running the gated integration test — every bias.v2
 * artifact produced in template mode recomputes against exactly this prompt.
 */
export const FIXED_TEMPLATE_USER_MESSAGE = "Schreibe einen kurzen Satz auf Deutsch.";

/** Minimal message shape this module needs — deliberately not importing transformers.js's
 * own `Message` type to keep this module's dependency surface (and test doubles) small. */
export interface TemplateChatMessage {
  role: string;
  content: string;
}

function buildTemplateMessages(): TemplateChatMessage[] {
  return [{ role: "user", content: FIXED_TEMPLATE_USER_MESSAGE }];
}

/** Minimal shape this module needs from a transformers.js tokenizer for template-mode
 * scoring. `apply_chat_template` is only ever called here with `tokenize: false`. */
export interface TemplateTokenizer {
  apply_chat_template(
    conversation: TemplateChatMessage[],
    options: { add_generation_prompt: boolean; tokenize: false }
  ): string;
  encode(text: string): number[];
}

/** Minimal shape this module needs from a transformers.js model: callable, returns logits. */
export type TemplateModel = (inputs: {
  input_ids: unknown;
  attention_mask: unknown;
}) => Promise<{ logits: LogitsTensorLike }>;

export interface TemplateScoringDeps {
  tokenizer: TemplateTokenizer;
  model: TemplateModel;
  modelId: string;
  libraryVersion: string;
  /** The CONFIGURED weight precision (e.g. "q4", "fp32") passed to `from_pretrained` —
   * threaded through explicitly because the output logits tensor's own `.type` is always
   * "float32" regardless of weight quantization (Task 0 spike) and so cannot be used to
   * recover it; see `ScoredLogProbProvenance.dtype` vs `.logitsDtype`. */
  dtype: string;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Assert that `contextTokenIds` is an exact prefix of `combinedTokenIds`. Per spec: on
 * violation (a token merge at the context/sentence boundary), ABORT with a speaking error.
 * Never try a separator character, never blindly assume the prefix length as the span start.
 */
function assertPrefixIdentity(
  contextTokenIds: readonly number[],
  combinedTokenIds: readonly number[],
  modelId: string,
  text: string
): void {
  if (combinedTokenIds.length < contextTokenIds.length) {
    throw new Error(
      `scoreTemplateContinuation: combined tokenization (${combinedTokenIds.length} tokens) is shorter ` +
        `than the fixed context (${contextTokenIds.length} tokens) for sentence "${text}" on model ` +
        `"${modelId}" — cannot determine a sentence span.`
    );
  }
  for (let i = 0; i < contextTokenIds.length; i++) {
    if (combinedTokenIds[i] !== contextTokenIds[i]) {
      throw new Error(
        `scoreTemplateContinuation: prefix-token identity violated at position ${i} for sentence "${text}" on model "${modelId}" (context token ${contextTokenIds[i]} vs combined token ${combinedTokenIds[i]}). The tokenizer merged tokens across the context/sentence boundary. Per spec this is an ABORT: no separator character, no blind assumption of the prefix length as the span start.`
      );
    }
  }
}

/**
 * Score `text` as a Gemma-4-style assistant continuation of the fixed template context.
 *
 * Builds the context via `apply_chat_template(..., { tokenize: false })`, tokenizes the
 * context alone and the context+sentence together via `tokenizer.encode()`, verifies
 * prefix-token identity, determines the sentence-only span, and delegates the actual
 * log-probability accumulation to the pure `sumSequenceLogProb` scorer from Task 1
 * (reused, not reimplemented).
 */
export async function scoreTemplateContinuation(
  deps: TemplateScoringDeps,
  text: string
): Promise<ScoredLogProb> {
  const { tokenizer, model, modelId, libraryVersion, dtype } = deps;

  const messages = buildTemplateMessages();
  const contextText = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    tokenize: false,
  });

  const contextTokenIds = Array.from(tokenizer.encode(contextText), Number);
  if (contextTokenIds.length === 0) {
    throw new Error(
      `scoreTemplateContinuation: fixed template context tokenized to 0 tokens for model "${modelId}". This is the exact false-pass trap from the Task 0 spike (an unwrapped apply_chat_template(tokenize:true) Tensor object silently produced context_len=0, making the prefix-identity check vacuously true) — aborting rather than treating an empty context as a valid prefix.`
    );
  }

  const combinedTokenIds = Array.from(tokenizer.encode(contextText + text), Number);
  assertPrefixIdentity(contextTokenIds, combinedTokenIds, modelId, text);

  const span: Span = { start: contextTokenIds.length, end: combinedTokenIds.length };
  if (span.start >= span.end) {
    throw new Error(
      `scoreTemplateContinuation: sentence "${text}" contributed zero tokens after the fixed ` +
        `context (span [${span.start}, ${span.end})) for model "${modelId}".`
    );
  }
  const scoredTokenIds = combinedTokenIds.slice(span.start);

  const { Tensor } = await import("@huggingface/transformers");
  const seqLen = combinedTokenIds.length;
  const inputIds = new Tensor("int64", BigInt64Array.from(combinedTokenIds.map(BigInt)), [
    1,
    seqLen,
  ]);
  const attentionMask = new Tensor("int64", BigInt64Array.from(new Array(seqLen).fill(1n)), [
    1,
    seqLen,
  ]);

  const outputs = await model({ input_ids: inputIds, attention_mask: attentionMask });
  const logits: LogitsTensorLike = outputs.logits;

  const score = sumSequenceLogProb(logits, combinedTokenIds, span);

  const contextTokenHash = await sha256Hex(JSON.stringify(contextTokenIds));
  const promptSha256 = await sha256Hex(contextText);

  const provenance: ScoredLogProbProvenance = {
    modelId,
    dtype,
    logitsDtype: String((logits as unknown as { type?: string }).type ?? "unknown"),
    backend: "node-onnx",
    libraryVersion,
    templateStrategy: "fixed_template_span",
    promptText: contextText,
    promptSha256,
  };

  return {
    score,
    scoredTokenIds,
    span,
    contextTokenHash,
    provenance,
    method: "conditional_sequence_logprob_sum",
  };
}

/** Minimal shape this module needs from a loaded model config to detect architecture. */
export interface MinimalModelConfig {
  model_type?: string | null;
  architectures?: readonly string[] | null;
}

/**
 * Detect whether a loaded model config indicates a conditional-generation / multimodal
 * architecture (e.g. Gemma-4's `Gemma4ForConditionalGeneration`), which must be scored via
 * the template mode rather than fed bare sentences as a classic causal LM.
 *
 * Detection is from the CONFIG (`architectures`), never the model id string, per spec —
 * so a differently-named repo hosting the same architecture is still detected correctly,
 * and a model whose name happens to contain "gemma" but isn't conditional-generation is not
 * misdetected.
 */
export function isConditionalGenerationConfig(config: MinimalModelConfig): boolean {
  const architectures = config.architectures ?? [];
  return architectures.some(
    (name) => typeof name === "string" && name.endsWith("ForConditionalGeneration")
  );
}
