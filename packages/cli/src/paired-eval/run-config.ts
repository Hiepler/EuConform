import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export type LabelVariant = "plain" | "space";

export const LABEL_VARIANTS: Record<LabelVariant, [string, string]> = {
  plain: ["A", "B"],
  space: [" A", " B"],
};

export interface LabelTokenConfig {
  tokens: [string, string];
  /** Where the choice came from: the frozen config file or the explicit exploration flag. */
  source: "config" | "flag";
  /** SHA-256 of the config file when it was read, else null. */
  config_sha256: string | null;
}

export interface PairedEvalConfig {
  models: Record<string, { label_tokens: [string, string] }>;
}

function isTokenPair(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((v) => typeof v === "string" && v.length > 0)
  );
}

/** Parse `paired-eval.config.json`; the label-token variant per model id is frozen there in P0. */
export function parsePairedEvalConfig(text: string): PairedEvalConfig {
  const raw = JSON.parse(text) as { models?: Record<string, { label_tokens?: unknown }> };
  if (!raw || typeof raw !== "object" || typeof raw.models !== "object" || raw.models === null) {
    throw new Error('paired-eval config: expected an object with a "models" map.');
  }
  const models: PairedEvalConfig["models"] = {};
  for (const [id, entry] of Object.entries(raw.models)) {
    if (!isTokenPair(entry?.label_tokens)) {
      throw new Error(
        `paired-eval config: models["${id}"].label_tokens must be a pair of non-empty strings, e.g. ["A", "B"] or [" A", " B"].`
      );
    }
    models[id] = { label_tokens: entry.label_tokens };
  }
  return { models };
}

export async function readPairedEvalConfig(
  path: string
): Promise<{ config: PairedEvalConfig; sha256: string }> {
  const text = await readFile(path, "utf-8");
  return {
    config: parsePairedEvalConfig(text),
    sha256: createHash("sha256").update(text, "utf8").digest("hex"),
  };
}

/**
 * Decide the label tokens of a run, fail-closed.
 *
 * The variant ("A" vs " A") is an analysis choice frozen per model in P0, so a model without
 * an entry aborts instead of silently falling back to a default. `--label-variant` exists for
 * exploring the choice (P0 itself); it is recorded as `source: "flag"` and may not contradict
 * a frozen config entry.
 */
export function resolveLabelTokens(args: {
  modelId: string;
  config: { config: PairedEvalConfig; sha256: string } | null;
  flag?: LabelVariant;
}): LabelTokenConfig {
  const entry = args.config?.config.models[args.modelId];
  const flagTokens = args.flag ? LABEL_VARIANTS[args.flag] : undefined;
  if (entry && flagTokens) {
    if (entry.label_tokens[0] !== flagTokens[0] || entry.label_tokens[1] !== flagTokens[1]) {
      throw new Error(
        `--label-variant ${args.flag} contradicts the frozen label tokens ${JSON.stringify(entry.label_tokens)} for "${args.modelId}" in the config. Remove the flag or change the config deliberately.`
      );
    }
  }
  if (entry) {
    return {
      tokens: entry.label_tokens,
      source: "config",
      config_sha256: args.config?.sha256 ?? null,
    };
  }
  if (flagTokens) return { tokens: flagTokens, source: "flag", config_sha256: null };
  throw new Error(
    `No label tokens for "${args.modelId}": it has no entry in paired-eval.config.json and no --label-variant plain|space was given. The variant is frozen per model in P0; refusing to pick a default.`
  );
}

/**
 * Qwen3-style templates switch reasoning off through a Jinja variable. Detected from the
 * template text, never from the model id, so a renamed repo with the same template behaves
 * the same.
 */
export function resolveChatTemplateKwargs(
  chatTemplate: string | null | undefined
): Record<string, unknown> {
  return typeof chatTemplate === "string" && chatTemplate.includes("enable_thinking")
    ? { enable_thinking: false }
    : {};
}
