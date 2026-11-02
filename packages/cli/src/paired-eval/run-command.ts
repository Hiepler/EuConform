import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import os from "node:os";
import { basename } from "node:path";
import { defineCommand } from "citty";
import consola from "consola";
import { resolveModelRevisionSha } from "../bias/resolve-model-revision";
import { exitWithError } from "../utils/exit";
import { type RunDtype, SESSION_THREADS, loadModel } from "./load-model";
import {
  LABEL_VARIANTS,
  type LabelTokenConfig,
  type LabelVariant,
  readPairedEvalConfig,
  resolveChatTemplateKwargs,
  resolveLabelTokens,
} from "./run-config";
import { type RunIdentity, parseItemsJsonl, runScoring } from "./run-engine";
import {
  type PromptScorer,
  createGreedyScorer,
  createLogprobScorer,
  createSeqlogprobScorer,
} from "./run-scorers";

const DTYPES = ["fp32", "q8", "q4"] as const;
const MODES = ["logprob", "seqlogprob", "greedy"] as const;
const SHA = /^[0-9a-f]{40}$/i;

export default defineCommand({
  meta: {
    name: "run",
    description: "Score a generated prompt set with a model (fail-closed, resumable)",
  },
  args: {
    model: { type: "string", description: "Hugging Face model id", required: true },
    revision: {
      type: "string",
      description: "40-hex commit sha; resolved from the Hub when omitted",
    },
    dtype: { type: "string", description: "fp32 | q8 | q4", required: true },
    set: {
      type: "string",
      description: "Prompt set (items.jsonl from paired-eval generate)",
      required: true,
    },
    out: {
      type: "string",
      description: "Output directory (scores.jsonl, run.json)",
      required: true,
    },
    resume: {
      type: "boolean",
      description: "Continue an interrupted run in --out",
      default: false,
    },
    limit: { type: "string", description: "Score only the first n prompts" },
    mode: { type: "string", description: "logprob | seqlogprob | greedy", default: "logprob" },
    "max-new-tokens": {
      type: "string",
      description: "Greedy mode: generation budget",
      default: "8",
    },
    "label-variant": {
      type: "string",
      description: "plain | space (exploration; frozen per model in the config)",
    },
    config: {
      type: "string",
      description: "paired-eval.config.json with frozen label tokens per model",
    },
  },
  async run({ args }) {
    try {
      await execute(args);
    } catch (error) {
      exitWithError(error instanceof Error ? error.message : String(error));
    }
  },
});

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  flag: string
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(
      `--${flag} must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)}).`
    );
  }
  return value as T;
}

function positiveInt(value: string | undefined, flag: string): number {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`--${flag} must be a positive integer (got ${JSON.stringify(value)}).`);
  }
  return Number(value);
}

async function execute(args: Record<string, unknown>): Promise<void> {
  const modelId = String(args.model);
  const dtype = oneOf(args.dtype as string | undefined, DTYPES, "dtype") as RunDtype;
  const mode = oneOf(args.mode as string | undefined, MODES, "mode");
  const limit = args.limit === undefined ? null : positiveInt(args.limit as string, "limit");
  const maxNewTokens = positiveInt(args["max-new-tokens"] as string | undefined, "max-new-tokens");
  const flagVariant =
    args["label-variant"] === undefined
      ? undefined
      : oneOf(
          args["label-variant"] as string,
          Object.keys(LABEL_VARIANTS) as LabelVariant[],
          "label-variant"
        );
  if (modelId.toLowerCase().includes("gemma-4") && dtype === "q4") {
    throw new Error("Gemma-4 at q4 is not supported for this measurement; use fp32 or q8.");
  }

  const text = await readFile(String(args.set), "utf-8");
  const all = parseItemsJsonl(text);
  const items = limit === null ? all : all.slice(0, limit);
  const input = {
    name: basename(String(args.set)),
    sha256: createHash("sha256").update(text, "utf8").digest("hex"),
    n_items: items.length,
    limit,
  };

  let labels: LabelTokenConfig | null = null;
  if (mode !== "seqlogprob") {
    const config = args.config ? await readPairedEvalConfig(String(args.config)) : null;
    labels = resolveLabelTokens({ modelId, config, flag: flagVariant });
  }

  const revision =
    typeof args.revision === "string" && args.revision !== ""
      ? args.revision
      : await resolveModelRevisionSha(modelId);
  if (!SHA.test(revision)) throw new Error("--revision must be a 40-char commit sha.");

  const loaded = await loadModel({ modelId, revision, dtype });
  const kwargs = resolveChatTemplateKwargs(loaded.chatTemplate);
  let scorer: PromptScorer;
  if (mode === "logprob") {
    scorer = createLogprobScorer({
      deps: loaded.deps,
      labelTokens: (labels as LabelTokenConfig).tokens,
      chatTemplateKwargs: kwargs,
    });
  } else if (mode === "seqlogprob") {
    scorer = createSeqlogprobScorer({ deps: loaded.deps, chatTemplateKwargs: kwargs });
  } else {
    scorer = createGreedyScorer({
      deps: loaded.greedyDeps,
      maxNewTokens,
      chatTemplateKwargs: kwargs,
    });
  }

  const identity: RunIdentity = {
    machine: {
      cpu: os.cpus()[0]?.model ?? null,
      ram_bytes: os.totalmem(),
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      node_version: process.version,
    },
    versions: {
      transformers_js: loaded.libraryVersion,
      onnxruntime_node: loaded.onnxruntimeVersion,
    },
    threads: {
      intra_op: SESSION_THREADS.intraOpNumThreads,
      inter_op: SESSION_THREADS.interOpNumThreads,
    },
    model: { id: modelId, revision, dtype },
    mode,
    max_new_tokens: mode === "greedy" ? maxNewTokens : null,
    input,
    label_tokens: labels,
    chat_template_kwargs: kwargs,
  };

  const summary = await runScoring({
    items,
    outDir: String(args.out),
    resume: Boolean(args.resume),
    scorer,
    identity,
    onProgress: (done, total) => {
      if (done % 10 === 0 || done === total) consola.info(`${done}/${total}`);
    },
  });
  consola.success(
    `Scored ${summary.scoredNow} prompts (${summary.skipped} already present) -> ${summary.scoresPath}`
  );
}
