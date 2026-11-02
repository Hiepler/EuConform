import {
  type GreedyScoringDeps,
  type LabelScoringDeps,
  type LabelScoringProvenance,
  generateGreedyAnswer,
  scoreNextTokenLabels,
  scoreOptionWords,
} from "@euconform/core";
import type {
  Letter,
  OptionContent,
  PromptItem,
  ScoreMode,
  ScoreRow,
} from "@euconform/core/paired-eval";

/** Fields a scorer fills in; the engine adds ids, identity, reference and latency. */
export type ScoredFields = Partial<
  Pick<
    ScoreRow,
    | "logits_dtype"
    | "intra_op_threads"
    | "inter_op_threads"
    | "thinking_mode"
    | "template_sha256"
    | "rendered_prompt_sha256"
    | "n_tokens"
    | "label_tokens"
    | "label_token_ids"
    | "l_a"
    | "l_b"
    | "mass"
    | "l_escalate"
    | "l_routine"
    | "generated"
    | "greedy_letter"
  >
> & { decision_content: ScoreRow["decision_content"] };

export interface PromptScorer {
  mode: Exclude<ScoreMode, "baseline">;
  score(item: PromptItem): Promise<ScoredFields>;
}

/** The two option words scored in `seqlogprob` mode, as continuations of `Answer:`. */
export const OPTION_WORD_CONTINUATIONS: [string, string] = [" escalate", " routine"];

/** The content printed on the line that carries `letter` (ER/RE: content on line 1; AB/BA: letter on line 1). */
export function contentOfLetter(item: PromptItem, letter: Letter): OptionContent {
  const line1Content: OptionContent = item.option_order === "ER" ? "escalate" : "routine";
  const line1Letter: Letter = item.letter_order === "AB" ? "A" : "B";
  if (letter === line1Letter) return line1Content;
  return line1Content === "escalate" ? "routine" : "escalate";
}

/** Raw single-prompt decision from the letter log-probabilities; equal values are a tie. */
export function decideFromLetters(
  item: PromptItem,
  lA: number,
  lB: number
): ScoreRow["decision_content"] {
  if (lA === lB) return "tie";
  return contentOfLetter(item, lA > lB ? "A" : "B");
}

export function decideFromWords(lEscalate: number, lRoutine: number): ScoreRow["decision_content"] {
  if (lEscalate === lRoutine) return "tie";
  return lEscalate > lRoutine ? "escalate" : "routine";
}

function assertLetterArm(item: PromptItem, mode: string): void {
  if (item.arm === "word") {
    throw new Error(
      `${mode}: prompt ${item.prompt_id} belongs to the "word" arm, which has no option block with letters. Score it with --mode seqlogprob.`
    );
  }
}

function provenanceFields(p: LabelScoringProvenance) {
  return {
    logits_dtype: p.logitsDtype,
    intra_op_threads: p.intraOpNumThreads,
    inter_op_threads: p.interOpNumThreads,
    thinking_mode: p.thinkingMode,
  };
}

export interface LogprobScorerConfig {
  deps: LabelScoringDeps;
  labelTokens: [string, string];
  chatTemplateKwargs: Record<string, unknown>;
}

export function createLogprobScorer(config: LogprobScorerConfig): PromptScorer {
  const { deps, labelTokens, chatTemplateKwargs } = config;
  return {
    mode: "logprob",
    async score(item) {
      assertLetterArm(item, "logprob");
      const r = await scoreNextTokenLabels(deps, item.prompt, {
        labelTokens,
        chatTemplateKwargs,
      });
      return {
        ...provenanceFields(r.provenance),
        template_sha256: r.templateSha256,
        rendered_prompt_sha256: r.renderedPromptSha256,
        n_tokens: r.nTokens,
        label_tokens: labelTokens,
        label_token_ids: r.labelTokenIds,
        l_a: r.logPA,
        l_b: r.logPB,
        mass: r.mass,
        decision_content: decideFromLetters(item, r.logPA, r.logPB),
      };
    },
  };
}

export interface SeqlogprobScorerConfig {
  deps: LabelScoringDeps;
  chatTemplateKwargs: Record<string, unknown>;
}

export function createSeqlogprobScorer(config: SeqlogprobScorerConfig): PromptScorer {
  const { deps, chatTemplateKwargs } = config;
  return {
    mode: "seqlogprob",
    async score(item) {
      if (item.arm !== "word") {
        throw new Error(
          `seqlogprob: prompt ${item.prompt_id} belongs to the "${item.arm}" arm; word scoring needs the option-less "word" arm (paired-eval generate --arm word).`
        );
      }
      const r = await scoreOptionWords(deps, item.prompt, {
        words: OPTION_WORD_CONTINUATIONS,
        chatTemplateKwargs,
      });
      const [lEscalate, lRoutine] = r.logPWords as [number, number];
      return {
        ...provenanceFields(r.provenance),
        template_sha256: r.templateSha256,
        rendered_prompt_sha256: r.renderedPromptSha256,
        n_tokens: r.nTokens,
        l_escalate: lEscalate,
        l_routine: lRoutine,
        decision_content: decideFromWords(lEscalate, lRoutine),
      };
    },
  };
}

export interface GreedyScorerConfig {
  deps: GreedyScoringDeps;
  maxNewTokens: number;
  chatTemplateKwargs: Record<string, unknown>;
}

export function createGreedyScorer(config: GreedyScorerConfig): PromptScorer {
  const { deps, maxNewTokens, chatTemplateKwargs } = config;
  return {
    mode: "greedy",
    async score(item) {
      assertLetterArm(item, "greedy");
      const r = await generateGreedyAnswer(deps, item.prompt, { maxNewTokens, chatTemplateKwargs });
      return {
        ...provenanceFields(r.provenance),
        template_sha256: r.templateSha256,
        rendered_prompt_sha256: r.renderedPromptSha256,
        n_tokens: r.nTokens,
        generated: r.generated,
        greedy_letter: r.letter,
        decision_content: r.letter === "invalid" ? "invalid" : contentOfLetter(item, r.letter),
      };
    },
  };
}
