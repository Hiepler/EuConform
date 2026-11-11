import { createRequire } from "node:module";
import type { GreedyScoringDeps, LabelScoringDeps, SessionThreadSettings } from "@euconform/core";

/** Thread settings of the measurement: fixed, passed to the loader and recorded verbatim. */
export const SESSION_THREADS: SessionThreadSettings = {
  intraOpNumThreads: 4,
  interOpNumThreads: 1,
};

export type RunDtype = "fp32" | "q8" | "q4";

export interface LoadedModel {
  deps: LabelScoringDeps;
  greedyDeps: GreedyScoringDeps;
  chatTemplate: string | null;
  libraryVersion: string;
  onnxruntimeVersion: string;
}

export function resolveOnnxRuntimeVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("onnxruntime-node/package.json") as { version?: string };
  if (!pkg.version) {
    throw new Error(
      "Could not resolve the installed onnxruntime-node version; refusing to run without it."
    );
  }
  return pkg.version;
}

/**
 * Load tokenizer and model on CPU at an exact revision, with explicit session threads.
 * Gemma-4 style conditional-generation checkpoints use the processor/Gemma4 loader pair,
 * everything else AutoModelForCausalLM; the choice comes from the config, never the model id.
 */
export async function loadModel(args: {
  modelId: string;
  revision: string;
  dtype: RunDtype;
}): Promise<LoadedModel> {
  const transformers = await import("@huggingface/transformers");
  const {
    AutoConfig,
    AutoTokenizer,
    AutoProcessor,
    AutoModelForCausalLM,
    Gemma4ForConditionalGeneration,
  } = transformers;
  const common = { revision: args.revision };
  const config = (await AutoConfig.from_pretrained(args.modelId, common)) as unknown as {
    architectures?: string[];
  };
  const conditional = (config.architectures ?? []).some((a) => a.includes("ConditionalGeneration"));

  let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
  let model: { generate: unknown } & Record<string, unknown>;
  const modelOptions = {
    ...common,
    device: "cpu" as const,
    dtype: args.dtype,
    session_options: { ...SESSION_THREADS },
  };
  if (conditional) {
    const processor = await AutoProcessor.from_pretrained(args.modelId, common);
    tokenizer = processor.tokenizer ?? (await AutoTokenizer.from_pretrained(args.modelId, common));
    model = (await Gemma4ForConditionalGeneration.from_pretrained(
      args.modelId,
      modelOptions
    )) as never;
  } else {
    tokenizer = await AutoTokenizer.from_pretrained(args.modelId, common);
    model = (await AutoModelForCausalLM.from_pretrained(args.modelId, modelOptions)) as never;
  }

  const libraryVersion = transformers.env.version ?? "unknown";
  const shared = {
    modelId: args.modelId,
    libraryVersion,
    dtype: args.dtype,
    sessionOptions: { ...SESSION_THREADS },
  };
  const m = model as unknown as {
    generate: (a: Record<string, unknown>) => Promise<never>;
  };
  return {
    deps: { ...shared, tokenizer: tokenizer as never, model: model as never },
    greedyDeps: {
      ...shared,
      tokenizer: tokenizer as never,
      generate: ((a: unknown) => m.generate(a as Record<string, unknown>)) as never,
    },
    chatTemplate: (tokenizer as unknown as { chat_template?: string | null }).chat_template ?? null,
    libraryVersion,
    onnxruntimeVersion: resolveOnnxRuntimeVersion(),
  };
}
