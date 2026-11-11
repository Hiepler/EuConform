import { appendFile, mkdir, readFile, truncate, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PromptItem, ScoreMode, ScoreRow } from "@euconform/core/paired-eval";
import type { LabelTokenConfig } from "./run-config";
import type { PromptScorer, ScoredFields } from "./run-scorers";

export const RUN_SCHEMA = "euconform.paired-eval.run/v1";

export type RunStatus = "running" | "complete" | "aborted";

/** `run.json`: everything that identifies the run, written at start and rewritten at the end. */
export interface RunMeta {
  schema: typeof RUN_SCHEMA;
  status: RunStatus;
  /** ISO timestamps; `started_at` stays that of the first segment, each `--resume` appends to `resumed_at`. */
  started_at: string;
  ended_at: string | null;
  resumed_at: string[];
  machine: {
    cpu: string | null;
    ram_bytes: number;
    os: string;
    arch: string;
    node_version: string;
  };
  versions: { transformers_js: string; onnxruntime_node: string };
  threads: { intra_op: number; inter_op: number };
  model: { id: string; revision: string; dtype: string };
  mode: Exclude<ScoreMode, "baseline">;
  max_new_tokens: number | null;
  input: { name: string; sha256: string; n_items: number; limit: number | null };
  /** Null for modes that do not read letters (`seqlogprob`). */
  label_tokens: LabelTokenConfig | null;
  chat_template_kwargs: Record<string, unknown>;
  /** Observed on the scored rows; null until the first row is scored. */
  thinking_mode: string | null;
  template_sha256: string | null;
  n_scored: number;
  errors: number;
  error_message: string | null;
}

/** Fields that must be identical between the original run and a `--resume`. */
type RunIdentityMeta = Pick<
  RunMeta,
  | "machine"
  | "versions"
  | "threads"
  | "model"
  | "mode"
  | "max_new_tokens"
  | "input"
  | "label_tokens"
  | "chat_template_kwargs"
>;

export interface RunIdentity extends RunIdentityMeta {}

export interface RunRequest {
  items: PromptItem[];
  outDir: string;
  resume: boolean;
  scorer: PromptScorer;
  identity: RunIdentity;
  /** Injected for tests. */
  now?: () => Date;
  clock?: () => number;
  onProgress?: (done: number, total: number) => void;
}

export interface RunSummary {
  meta: RunMeta;
  scoresPath: string;
  runJsonPath: string;
  scoredNow: number;
  skipped: number;
}

const REQUIRED_META_KEYS: (keyof RunMeta)[] = [
  "schema",
  "status",
  "started_at",
  "ended_at",
  "resumed_at",
  "machine",
  "versions",
  "threads",
  "model",
  "mode",
  "max_new_tokens",
  "input",
  "label_tokens",
  "chat_template_kwargs",
  "thinking_mode",
  "template_sha256",
  "n_scored",
  "errors",
  "error_message",
];

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Structural check of a `run.json` object; returns the list of problems (empty = valid). */
export function validateRunMeta(value: unknown): string[] {
  const problems: string[] = [];
  if (typeof value !== "object" || value === null) return ["run.json is not an object"];
  const meta = value as Record<string, unknown>;
  for (const key of REQUIRED_META_KEYS) {
    if (!(key in meta)) problems.push(`missing field "${key}"`);
  }
  if (problems.length > 0) return problems;
  const m = meta as unknown as RunMeta;
  if (m.schema !== RUN_SCHEMA) problems.push(`schema must be "${RUN_SCHEMA}"`);
  if (!["running", "complete", "aborted"].includes(m.status)) problems.push("invalid status");
  if (!ISO.test(m.started_at)) problems.push("started_at is not an ISO timestamp");
  if (m.ended_at !== null && !ISO.test(m.ended_at))
    problems.push("ended_at is not an ISO timestamp");
  if (!Array.isArray(m.resumed_at) || !m.resumed_at.every((t) => ISO.test(t))) {
    problems.push("resumed_at must be a list of ISO timestamps");
  }
  if (typeof m.machine?.os !== "string" || typeof m.machine?.ram_bytes !== "number") {
    problems.push("machine needs os and ram_bytes");
  }
  if (
    typeof m.versions?.transformers_js !== "string" ||
    typeof m.versions?.onnxruntime_node !== "string"
  ) {
    problems.push("versions needs transformers_js and onnxruntime_node");
  }
  if (!Number.isInteger(m.threads?.intra_op) || !Number.isInteger(m.threads?.inter_op)) {
    problems.push("threads needs integer intra_op and inter_op");
  }
  if (!m.model?.id || !m.model?.revision || !m.model?.dtype)
    problems.push("model needs id, revision, dtype");
  if (!["logprob", "seqlogprob", "greedy"].includes(m.mode)) problems.push("invalid mode");
  if (!/^[0-9a-f]{64}$/.test(m.input?.sha256 ?? ""))
    problems.push("input.sha256 must be 64 hex chars");
  if (!Number.isInteger(m.input?.n_items)) problems.push("input.n_items must be an integer");
  if (m.mode === "seqlogprob" ? m.label_tokens !== null : m.label_tokens === null) {
    problems.push("label_tokens must be set exactly for the letter modes");
  }
  if (!Number.isInteger(m.errors) || !Number.isInteger(m.n_scored))
    problems.push("errors and n_scored must be integers");
  if (m.status === "complete" && m.errors !== 0) problems.push("a complete run cannot have errors");
  if (m.status === "aborted" && m.error_message === null)
    problems.push("an aborted run needs error_message");
  return problems;
}

/** Row skeleton: every `ScoreRow` key present, null where a mode does not fill it. */
function emptyFields(): Omit<
  ScoreRow,
  | "prompt_id"
  | "mode"
  | "model_id"
  | "revision"
  | "dtype"
  | "onnxruntime_version"
  | "transformers_version"
  | "reference_content"
  | "latency_ms"
  | "cpu"
  | "ram_bytes"
  | "os"
  | "decision_content"
> {
  return {
    logits_dtype: null,
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
    mass: null,
    l_escalate: null,
    l_routine: null,
    generated: null,
    greedy_letter: null,
  };
}

export function buildScoreRow(
  item: PromptItem,
  fields: ScoredFields,
  identity: RunIdentity,
  latencyMs: number
): ScoreRow {
  const { decision_content, ...rest } = fields;
  const filled = { ...emptyFields(), ...rest };
  return {
    prompt_id: item.prompt_id,
    mode: identity.mode,
    model_id: identity.model.id,
    revision: identity.model.revision,
    dtype: identity.model.dtype,
    logits_dtype: filled.logits_dtype,
    onnxruntime_version: identity.versions.onnxruntime_node,
    transformers_version: identity.versions.transformers_js,
    intra_op_threads: filled.intra_op_threads ?? identity.threads.intra_op,
    inter_op_threads: filled.inter_op_threads ?? identity.threads.inter_op,
    thinking_mode: filled.thinking_mode,
    template_sha256: filled.template_sha256,
    rendered_prompt_sha256: filled.rendered_prompt_sha256,
    n_tokens: filled.n_tokens,
    label_tokens: filled.label_tokens,
    label_token_ids: filled.label_token_ids,
    l_a: filled.l_a,
    l_b: filled.l_b,
    mass: filled.mass,
    l_escalate: filled.l_escalate,
    l_routine: filled.l_routine,
    generated: filled.generated,
    greedy_letter: filled.greedy_letter,
    decision_content,
    reference_content: item.reference_content,
    latency_ms: latencyMs,
    cpu: identity.machine.cpu,
    ram_bytes: identity.machine.ram_bytes,
    os: identity.machine.os,
  };
}

/** Existing prompt ids of a `scores.jsonl`; a torn last line (killed mid-write) is cut off. */
async function readExistingIds(scoresPath: string): Promise<Set<string>> {
  let text: string;
  try {
    text = await readFile(scoresPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Set();
    throw error;
  }
  if (text.length > 0 && !text.endsWith("\n")) {
    const keep = text.lastIndexOf("\n") + 1;
    await truncate(scoresPath, Buffer.byteLength(text.slice(0, keep), "utf8"));
    text = text.slice(0, keep);
  }
  const ids = new Set<string>();
  for (const [index, line] of text.split("\n").entries()) {
    if (line === "") continue;
    let row: { prompt_id?: unknown };
    try {
      row = JSON.parse(line);
    } catch {
      throw new Error(
        `${scoresPath} line ${index + 1} is not valid JSON; refusing to resume over a corrupt file.`
      );
    }
    if (typeof row.prompt_id !== "string") {
      throw new Error(`${scoresPath} line ${index + 1} has no prompt_id; refusing to resume.`);
    }
    if (ids.has(row.prompt_id)) {
      throw new Error(
        `${scoresPath} contains prompt_id ${row.prompt_id} twice; refusing to resume.`
      );
    }
    ids.add(row.prompt_id);
  }
  return ids;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A resumed run must be the same measurement: compare every identity field except the machine clock. */
function assertResumable(previous: RunMeta, identity: RunIdentity): void {
  for (const key of Object.keys(identity) as (keyof RunIdentity)[]) {
    // Wall-clock-independent machine facts must match too: a different CPU or RAM is a
    // different measurement environment, so it aborts as well.
    if (!sameJson(previous[key], identity[key])) {
      throw new Error(
        `Cannot resume: "${key}" differs from the original run (was ${JSON.stringify(previous[key])}, now ${JSON.stringify(identity[key])}). Start a new --out directory instead.`
      );
    }
  }
}

async function readRunMeta(path: string): Promise<RunMeta | null> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf-8"));
    const problems = validateRunMeta(parsed);
    if (problems.length > 0) throw new Error(`${path} is invalid: ${problems.join("; ")}`);
    return parsed as RunMeta;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function assertUniqueIds(items: PromptItem[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.prompt_id)) {
      throw new Error(`Input set contains prompt_id ${item.prompt_id} twice.`);
    }
    seen.add(item.prompt_id);
  }
}

async function prepareRun(request: RunRequest, now: () => Date) {
  const { items, outDir, resume, identity } = request;
  await mkdir(outDir, { recursive: true });
  const scoresPath = join(outDir, "scores.jsonl");
  const runJsonPath = join(outDir, "run.json");

  const previous = await readRunMeta(runJsonPath);
  const doneIds = await readExistingIds(scoresPath);
  let meta: RunMeta;
  if (resume) {
    if (previous === null && doneIds.size > 0) {
      throw new Error(`${scoresPath} exists without a run.json; cannot verify what produced it.`);
    }
    if (previous !== null) assertResumable(previous, identity);
    meta = previous
      ? {
          ...previous,
          status: "running",
          ended_at: null,
          errors: 0,
          error_message: null,
          resumed_at: [...previous.resumed_at, now().toISOString()],
        }
      : newMeta(identity, now());
  } else {
    if (previous !== null || doneIds.size > 0) {
      throw new Error(
        `${outDir} already holds a run (scores.jsonl or run.json). Pass --resume to continue it or choose an empty --out.`
      );
    }
    meta = newMeta(identity, now());
  }
  const knownIds = new Set(items.map((item) => item.prompt_id));
  for (const id of doneIds) {
    if (!knownIds.has(id)) {
      throw new Error(
        `scores.jsonl holds prompt_id ${id}, which is not in the input set; wrong --set for this --out?`
      );
    }
  }
  meta.n_scored = doneIds.size;
  await writeFile(runJsonPath, `${JSON.stringify(meta, null, 2)}\n`);
  return { meta, doneIds, scoresPath, runJsonPath };
}

/**
 * Score `items` one by one and append each row to `scores.jsonl`.
 *
 * Fail-closed: a scorer error aborts the run (the rows written so far stay), `run.json` is
 * rewritten with `status: "aborted"` and the error, and the error is rethrown. There is no
 * skip-and-continue. `resume` skips prompt ids already present, so an aborted run continues
 * where it stopped and yields the same rows an uninterrupted run would (latency aside).
 */
export async function runScoring(request: RunRequest): Promise<RunSummary> {
  const { items, scorer, identity } = request;
  const now = request.now ?? (() => new Date());
  const clock = request.clock ?? (() => performance.now());
  assertUniqueIds(items);

  const { meta, doneIds, scoresPath, runJsonPath } = await prepareRun(request, now);

  let scoredNow = 0;
  let current: PromptItem | null = null;
  try {
    for (const item of items) {
      if (doneIds.has(item.prompt_id)) continue;
      current = item;
      const start = clock();
      const fields = await scorer.score(item);
      const latency = Math.round((clock() - start) * 1000) / 1000;
      const row = buildScoreRow(item, fields, identity, latency);
      assertConsistentTemplate(meta, row);
      await appendFile(scoresPath, `${JSON.stringify(row)}\n`);
      meta.thinking_mode = row.thinking_mode;
      meta.template_sha256 = row.template_sha256;
      scoredNow += 1;
      meta.n_scored += 1;
      request.onProgress?.(meta.n_scored, items.length);
    }
    meta.status = "complete";
    meta.ended_at = now().toISOString();
    await writeFile(runJsonPath, `${JSON.stringify(meta, null, 2)}\n`);
  } catch (error) {
    meta.status = "aborted";
    meta.ended_at = now().toISOString();
    meta.errors = 1;
    const message = error instanceof Error ? error.message : String(error);
    meta.error_message = current ? `prompt ${current.prompt_id}: ${message}` : message;
    await writeFile(runJsonPath, `${JSON.stringify(meta, null, 2)}\n`);
    throw error;
  }
  return { meta, scoresPath, runJsonPath, scoredNow, skipped: doneIds.size };
}

function newMeta(identity: RunIdentity, startedAt: Date): RunMeta {
  return {
    schema: RUN_SCHEMA,
    status: "running",
    started_at: startedAt.toISOString(),
    ended_at: null,
    resumed_at: [],
    ...identity,
    thinking_mode: null,
    template_sha256: null,
    n_scored: 0,
    errors: 0,
    error_message: null,
  };
}

/** One run, one template and one thinking handling: a row that deviates is a bug, not data. */
function assertConsistentTemplate(meta: RunMeta, row: ScoreRow): void {
  if (meta.template_sha256 !== null && row.template_sha256 !== meta.template_sha256) {
    throw new Error(
      `template hash changed within the run (${meta.template_sha256} -> ${row.template_sha256}).`
    );
  }
  if (meta.thinking_mode !== null && row.thinking_mode !== meta.thinking_mode) {
    throw new Error(
      `thinking_mode changed within the run (${meta.thinking_mode} -> ${row.thinking_mode}).`
    );
  }
}

/** Parse a generated items JSONL; every line must be a JSON object with the fields the runner reads. */
export function parseItemsJsonl(text: string): PromptItem[] {
  const items: PromptItem[] = [];
  for (const [index, line] of text.split("\n").entries()) {
    if (line.trim() === "") continue;
    let value: Partial<PromptItem>;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`items line ${index + 1} is not valid JSON.`);
    }
    for (const key of [
      "prompt_id",
      "prompt",
      "arm",
      "option_order",
      "letter_order",
      "reference_content",
    ] as const) {
      if (typeof value[key] !== "string" || value[key] === "") {
        throw new Error(`items line ${index + 1}: field "${key}" is missing or not a string.`);
      }
    }
    items.push(value as PromptItem);
  }
  if (items.length === 0) throw new Error("items file contains no prompts.");
  return items;
}
