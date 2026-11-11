/**
 * Paired decision eval: LLM-free baselines (spec section 3, AP2).
 *
 * Every baseline writes the same `ScoreRow` shape as a model run: the chosen option gets
 * log 0.9 and the other log 0.1 (mass 1), so baselines go through exactly the same
 * permutation averaging and analysis as models.
 */
import { FAMILIES, createRng, letterOf, lettersFor, optionContents } from "./generate";
import {
  conditionHolds,
  referenceContent,
  requireInputs,
  requireVariable,
  roundTo,
} from "./reference";
import type { Family, Letter, OptionContent, PromptItem, ScoreRow } from "./types";

export const BASELINES = [
  "oracle",
  "constant_a",
  "constant_first",
  "constant_routine",
  "coarse",
  "random",
] as const;

export type BaselineName = (typeof BASELINES)[number];

export const LOG_CHOSEN = Math.log(0.9);
export const LOG_OTHER = Math.log(0.1);

/** Seed of the `random` baseline (spec: seed 0). */
export const RANDOM_BASELINE_SEED = "0";

type Choice = { kind: "letter"; letter: Letter } | { kind: "content"; content: OptionContent };

export function isBaselineName(name: string): name is BaselineName {
  return (BASELINES as readonly string[]).includes(name);
}

function familyOf(item: PromptItem, families: Family[]): Family {
  const family = families.find((entry) => entry.id === item.family);
  if (!family) throw new Error(`Unknown family ${item.family} in ${item.prompt_id}.`);
  return family;
}

function printedValues(item: PromptItem): Record<string, number> {
  return Object.fromEntries(item.values.map((value) => [value.var, value.value]));
}

/**
 * Coarse estimator: reads the deciding value at the family's `coarse_step` resolution (for
 * ratio families the ratio of the printed inputs) and applies the rule; a rounded value that
 * lands on a threshold counts as a tie and gives routine.
 */
export function coarseDecision(
  item: PromptItem,
  families: Family[] = FAMILIES.families
): OptionContent {
  const family = familyOf(item, families);
  const printed = printedValues(item);
  const coarse = (value: number, step: number) => roundTo(Math.round(value / step) * step, 10);

  if (family.logic === "ratio") {
    const variable = requireVariable(family, 0);
    const [numerator, denominator] = requireInputs(family);
    const ratio = (printed[numerator.var] as number) / (printed[denominator.var] as number);
    const rounded = coarse(ratio, variable.coarse_step);
    if (rounded === variable.threshold) return "routine";
    return conditionHolds(variable, rounded) ? "escalate" : "routine";
  }

  const variable = family.variables.find((entry) => entry.var === item.decisive_var);
  if (!variable) throw new Error(`Family ${family.id} has no rule variable ${item.decisive_var}.`);
  const rounded = coarse(item.decisive_value, variable.coarse_step);
  if (rounded === variable.threshold || rounded === variable.threshold_high) return "routine";
  return referenceContent(family, { ...printed, [variable.var]: rounded });
}

function choose(name: BaselineName, item: PromptItem, families: Family[]): Choice {
  switch (name) {
    case "oracle":
      return { kind: "content", content: item.reference_content };
    case "constant_a":
      return { kind: "letter", letter: "A" };
    case "constant_first":
      return { kind: "letter", letter: lettersFor(item.letter_order)[0] };
    case "constant_routine":
      return { kind: "content", content: "routine" };
    case "coarse":
      return { kind: "content", content: coarseDecision(item, families) };
    case "random": {
      // One content per (base case, variant), kept across option orders: otherwise m* would
      // be 0 in half the cases and Acc ~0.25 instead of ~0.5 (assumption, see PR).
      const rng = createRng(`${RANDOM_BASELINE_SEED}|${item.item_id}|${item.variant}`);
      return { kind: "content", content: rng.next() < 0.5 ? "escalate" : "routine" };
    }
  }
}

function contentOfLetter(item: PromptItem, letter: Letter): OptionContent {
  const [opt1, opt2] = optionContents(item.option_order);
  const [x1] = lettersFor(item.letter_order);
  return letter === x1 ? opt1 : opt2;
}

export function baselineRow(
  name: BaselineName,
  item: PromptItem,
  families: Family[] = FAMILIES.families
): ScoreRow {
  const choice = choose(name, item, families);
  const row: ScoreRow = {
    prompt_id: item.prompt_id,
    mode: "baseline",
    model_id: `baseline:${name}`,
    revision: null,
    dtype: null,
    logits_dtype: null,
    onnxruntime_version: null,
    transformers_version: null,
    intra_op_threads: null,
    inter_op_threads: null,
    thinking_mode: null,
    template_sha256: null,
    rendered_prompt_sha256: null,
    n_tokens: null,
    label_tokens: null,
    label_token_ids: null,
    l_a: null,
    l_b: null,
    mass: 1,
    l_escalate: null,
    l_routine: null,
    generated: null,
    greedy_letter: null,
    decision_content: "invalid",
    reference_content: item.reference_content,
    latency_ms: 0,
    cpu: null,
    ram_bytes: null,
    os: null,
  };

  if (item.arm === "word") {
    // No letters in the word arm: letter baselines pick the first-named word (ER: escalate).
    const content =
      choice.kind === "content" ? choice.content : optionContents(item.option_order)[0];
    row.l_escalate = content === "escalate" ? LOG_CHOSEN : LOG_OTHER;
    row.l_routine = content === "routine" ? LOG_CHOSEN : LOG_OTHER;
    row.decision_content = content;
    return row;
  }

  const letter =
    choice.kind === "letter"
      ? choice.letter
      : letterOf(choice.content, item.option_order, item.letter_order);
  row.l_a = letter === "A" ? LOG_CHOSEN : LOG_OTHER;
  row.l_b = letter === "B" ? LOG_CHOSEN : LOG_OTHER;
  row.decision_content = contentOfLetter(item, letter);
  return row;
}

export function scoreBaseline(name: BaselineName, items: PromptItem[]): ScoreRow[] {
  return items.map((item) => baselineRow(name, item));
}
