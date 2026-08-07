/**
 * Shared result types for `SequenceLogProbProvider.getScoredLogProb`.
 *
 * Pulled out of `transformers-inference.ts` (Messmotor-Sanierung Task 5) so that
 * `template-scoring.ts` (the Gemma-4 template-mode scorer) and `transformers-inference.ts`
 * (which loads models and picks which mode to use) can both depend on these types without
 * either module importing from the other — avoids a circular import between the two.
 *
 * `transformers-inference.ts` re-exports both types from here, so existing imports of
 * `ScoredLogProb`/`ScoredLogProbProvenance` from `"./transformers-inference"` keep working.
 */

import type { SequenceLogProbMethod } from "../types";
import type { Span } from "./sequence-logprob";

/** Provenance metadata attached to a scored log-probability result. */
export interface ScoredLogProbProvenance {
  modelId: string;
  /**
   * The CONFIGURED weight precision passed to `from_pretrained` (e.g. "q4", "fp32", "q8") —
   * NOT the output tensor's reported dtype (see `logitsDtype` for that; the two are
   * different facts and must not be conflated). Task 1 measured 1.3-11.9% score deviation
   * between quantized and fp32 weights on the same model/sentences, so this field is
   * ergebnisrelevant: an artifact that cannot say which weight precision produced a score
   * claims a precision it does not have (Messmotor-Sanierung Task 5 review finding).
   */
  dtype: string;
  /**
   * The OUTPUT LOGITS TENSOR's reported `.type` (e.g. "float32"). The Task 0 spike found
   * this stays "float32" even for q4-quantized weights ("logits.data ist Float32Array trotz
   * q4-Gewichten") — so this field does NOT tell you the weight precision; use `dtype` for
   * that. Kept because it is still a real, independently useful fact (confirms no silent
   * downcast in the output itself).
   */
  logitsDtype: string;
  backend: string;
  libraryVersion: string;
  /**
   * "none" for the base autoregressive mode (Task 1); "fixed_template_span" for the
   * instruction-tuned template mode (Task 5), which conditions scoring on a fixed
   * user-turn prompt. Optional so pre-Task-5 test doubles that predate this field
   * (e.g. hand-built `ScoredLogProb` literals in other packages' tests) stay valid;
   * every real measurement path sets it explicitly.
   */
  templateStrategy?: "none" | "fixed_template_span";
  /** Present only when templateStrategy is "fixed_template_span": the verbatim fixed
   * context string fed before the sentence — recomputable by any third party. */
  promptText?: string;
  /** SHA-256 of `promptText`, present only when templateStrategy is "fixed_template_span". */
  promptSha256?: string;
}

/** Full result of scoring a sentence with `getScoredLogProb`. */
export interface ScoredLogProb {
  score: number;
  scoredTokenIds: number[];
  span: Span;
  contextTokenHash: string;
  provenance: ScoredLogProbProvenance;
  /**
   * How the score was accumulated (Task 3's `SequenceLogProbMethod`). Optional for the
   * same backward-compatibility reason as `provenance.templateStrategy`; every real
   * measurement path sets it explicitly.
   */
  method?: SequenceLogProbMethod;
}
