/**
 * Paired decision eval: shared data contract.
 *
 * Every stage of the instrument (generator, baselines, label scorer, runner, Python
 * analysis) talks through two JSONL formats defined here:
 *
 * - `PromptItem`: one line per prompt in the generated set (`generate` output).
 * - `ScoreRow`: one line per scored prompt in `scores.jsonl` (`run` and `baseline` output).
 *
 * Field names are snake_case on purpose: the files are read by `scripts/paired-eval/*.py`
 * as well, and a single spelling avoids a translation layer that could drift.
 */

/** The two option contents. The reference is always one of these, never a letter. */
export type OptionContent = "escalate" | "routine";

/** Which content sits on line 1 of the option block (ER: escalate first, RE: routine first). */
export type OptionOrder = "ER" | "RE";

/** Which letter sits on line 1 (AB in the primary design, BA only in the `decomp` arm). */
export type LetterOrder = "AB" | "BA";

export type Letter = "A" | "B";

/**
 * - `main`: all 12 variants under ER and RE, letters AB.
 * - `decomp`: placement decomposition, base and decisive only, letters BA under ER and RE
 *   (the AB prompts of the same items come from `main`).
 * - `word`: robustness arm, base and decisive only, ER only, no option block; the answer is
 *   the option word itself.
 */
export type Arm = "main" | "decomp" | "word";

export type Split = "dev" | "pilot" | "test" | "test2";

export type Stratum = "near" | "mid" | "far";

export type NameGroup = "de" | "tr";

export type NameGender = "f" | "m";

export type Insurance = "statutory" | "private";

export type Ward = "North" | "South";

export const VARIANTS = [
  "base",
  "decisive",
  "irr-gender",
  "placebo-gender",
  "irr-origin",
  "placebo-origin",
  "irr-insurance",
  "placebo-insurance",
  "irr-order",
  "placebo-order",
  "para1",
  "para2",
] as const;

export type Variant = (typeof VARIANTS)[number];

/** Invariance axes; each has an `irr-<axis>` and a matched `placebo-<axis>` variant. */
export const AXES = ["gender", "origin", "insurance", "order"] as const;
export type Axis = (typeof AXES)[number];

/** One measured value as it appears in the case text, in prompt order. */
export interface CaseValue {
  /** Variable key, e.g. `potassium`, `heart_rate`, `dose`. */
  var: string;
  /** Display label in the prompt, e.g. `Serum potassium`. */
  label: string;
  value: number;
  /** Unit as printed, or null when the family prints the value without a unit (T8). */
  unit: string | null;
  /** Exact text fragment in the prompt, e.g. `Serum potassium 6.2 mmol/L`. */
  text: string;
}

/** One line of the generated JSONL. */
export interface PromptItem {
  prompt_id: string;
  item_id: string;
  family: string;
  split: Split;
  stratum: Stratum;
  /** d = |v - threshold| / scale of the decisive variable in the BASE case. */
  distance: number;
  /** Reference content of THIS prompt's case (decisive flips it, everything else keeps it). */
  reference_content: OptionContent;
  variant: Variant;
  option_order: OptionOrder;
  letter_order: LetterOrder;
  arm: Arm;
  /** Letter on the line that carries the reference content; null in the `word` arm. */
  reference_letter: Letter | null;
  /** Frame wording ids for S1, S2, S3, e.g. `["S1.w0", "S2.w0", "S3.w0"]`. */
  frame_ids: [string, string, string];
  decisive_var: string;
  /** Value of the decisive variable in THIS prompt's case. */
  decisive_value: number;
  name_group: NameGroup;
  name_gender: NameGender;
  first: string;
  last: string;
  age: number;
  insurance: Insurance;
  ward: Ward;
  /** Variable keys in prompt order. */
  value_order: string[];
  /** All values in prompt order (superset of `value_order`, carries numbers and units). */
  values: CaseValue[];
  prompt: string;
  prompt_sha256: string;
}

export type ScoreMode = "logprob" | "seqlogprob" | "greedy" | "baseline";

/**
 * One line of `scores.jsonl`.
 *
 * `l_a`/`l_b` are the log-probabilities of the LETTER tokens A and B (not of line 1/2 and
 * not of the contents); mapping letters to contents is the analysis's job via the item's
 * `option_order` and `letter_order`. Baselines write the same shape with log 0.9 / log 0.1.
 */
export interface ScoreRow {
  prompt_id: string;
  mode: ScoreMode;
  model_id: string;
  revision: string | null;
  dtype: string | null;
  logits_dtype: string | null;
  onnxruntime_version: string | null;
  transformers_version: string | null;
  intra_op_threads: number | null;
  inter_op_threads: number | null;
  thinking_mode: string | null;
  template_sha256: string | null;
  rendered_prompt_sha256: string | null;
  /** Token count of the rendered prompt including the assistant prefix. */
  n_tokens: number | null;
  label_tokens: [string, string] | null;
  label_token_ids: [number, number] | null;
  /** logprob / baseline mode: full log-softmax value of the letter tokens. */
  l_a: number | null;
  l_b: number | null;
  /** e^l_a + e^l_b. */
  mass: number | null;
  /** seqlogprob mode (`word` arm): summed sequence log-probability of each option word. */
  l_escalate: number | null;
  l_routine: number | null;
  /** greedy mode: decoded text and the first standalone A/B, or "invalid". */
  generated: string | null;
  greedy_letter: Letter | "invalid" | null;
  /** Raw decision of this single prompt (no permutation averaging). */
  decision_content: OptionContent | "tie" | "invalid";
  reference_content: OptionContent;
  latency_ms: number;
  cpu: string | null;
  ram_bytes: number | null;
  os: string | null;
}

/** Rule family definition as stored in `families.json`. */
export interface FamilyVariable {
  var: string;
  label: string;
  unit: string | null;
  /** Escalate condition for this variable alone. */
  op: ">" | "<" | ">=" | "<=" | "outside";
  threshold: number;
  /** Second threshold for the band logic (T3: low and high bound). */
  threshold_high?: number;
  scale: number;
  coarse_step: number;
  decimals: number;
  /** Plausible range of the printed value; draws whose value or mirror fall outside are redrawn. */
  range?: [number, number];
}

export type FamilyLogic =
  | "above"
  | "below"
  | "band"
  | "and"
  | "or"
  | "ratio"
  | "window"
  | "unitless";

export interface Family {
  id: string;
  split: "dev" | "test";
  logic: FamilyLogic;
  /** Rule variables; ratio families describe the ratio here and the raw inputs in `inputs`. */
  variables: FamilyVariable[];
  /** Ratio families only: the two printed inputs (numerator first). */
  inputs?: [FamilyInput, FamilyInput];
  /** Keys into `FamiliesFile.distractor_pool`. */
  distractors: [string, string];
  rule_text: string;
}

/** A printed input of a ratio family; the denominator carries the range it is drawn from. */
export interface FamilyInput {
  var: string;
  label: string;
  unit: string;
  decimals: number;
  range?: [number, number];
}

/** A distractor value: named by no rule of its family, drawn from a normal range. */
export interface DistractorDef {
  label: string;
  unit: string;
  decimals: number;
  range: [number, number];
  /** Blood pressure only: the diastolic range; the value is printed as systolic/diastolic. */
  range_diastolic?: [number, number];
}

export interface FamiliesFile {
  note: string;
  distractor_pool: Record<string, DistractorDef>;
  families: Family[];
}

/** `frames.json`: three wordings per frame part plus the canonical choice. */
export interface FramesFile {
  note: string;
  canonical: { S1: string; S2: string; S3: string; S3word: string };
  S1: { id: string; ER: string; RE: string }[];
  S2: { id: string; text: string }[];
  S3: { id: string; head: string; tail: string }[];
  S3word: { id: string; text: string }[];
}

export interface NameList {
  source_url: string;
  source: string;
  retrieved: string;
  names: string[];
}

export interface NamesFile {
  note: string;
  first: Record<NameGroup, Record<NameGender, NameList>>;
  last: Record<NameGroup, NameList>;
}

/** `manifest.json` written next to the generated JSONL. */
export interface GenerateManifest {
  generator: "paired-eval";
  generator_version: string | null;
  split: Split;
  seed: string;
  arm: Arm;
  per_family: number;
  /** Base cases in the robustness subset (decomp and word arms); null for main. */
  robust_n: number | null;
  robust_n_requested: number | null;
  count: number;
  items_sha256: string;
  /** SHA-256 of `JSON.stringify(frames.json)` (key order as in the file). */
  frames_sha256: string;
  canonical_frame_ids: FramesFile["canonical"];
  families: string[];
  /** Base cases per family and cell `<stratum>|<label>|<group>|<gender>`. */
  cell_balance: Record<string, Record<string, number>>;
}
