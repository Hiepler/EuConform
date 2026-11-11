#!/usr/bin/env node
// Stand-in for `euconform paired-eval ...` used by sim-run-p0-pilot.sh, no model needed.
//   generate, baseline: forwarded to the real CLI (REAL_CLI, e.g. "tsx packages/cli/src/index.ts")
//   run: writes run.json and scores.jsonl in the exact formats of run-engine.ts (RunMeta, ScoreRow)
//        with deterministic synthetic scores, and mimics --resume and the fail-closed abort.
// Fault injection through the environment (matched against the --out path of the run):
//   FAKE_KILL_AFTER=<n>[:<substring>]   SIGKILL after n rows written in this process (run.json stays "running")
//   FAKE_ABORT_AFTER=<n>[:<substring>]  scorer error after n rows (run.json "aborted", exit 1)
//   FAKE_LATENCY_MS=<ms>                latency_ms of every row (default 120)
//   FAKE_RETEST_NOISE=1                 rows of a run whose --out ends in "retest" deviate from the first run
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
if (argv[0] !== "paired-eval") {
  console.error("fake-cli: only 'paired-eval' is supported");
  process.exit(64);
}
if (argv[1] !== "run") {
  const [bin, ...pre] = process.env.REAL_CLI.split(" ");
  const res = spawnSync(bin, [...pre, ...argv], { stdio: "inherit" });
  process.exit(res.status ?? 1);
}

const args = {};
for (let i = 2; i < argv.length; i++) {
  if (!argv[i].startsWith("--")) continue;
  const key = argv[i].slice(2);
  const next = argv[i + 1];
  if (next === undefined || next.startsWith("--")) args[key] = true;
  else {
    args[key] = next;
    i++;
  }
}
for (const req of ["model", "dtype", "set", "out"]) {
  if (typeof args[req] !== "string") {
    console.error(`fake-cli: missing --${req}`);
    process.exit(1);
  }
}
const mode = args.mode ?? "logprob";
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const unit = (s) => Number.parseInt(sha256(s).slice(0, 8), 16) / 0xffffffff;

const LABELS = { plain: ["A", "B"], space: [" A", " B"] };
let labelTokens = null;
if (mode !== "seqlogprob") {
  let frozen = null;
  if (args.config) {
    const cfg = JSON.parse(readFileSync(args.config, "utf-8"));
    frozen = cfg.models?.[args.model]?.label_tokens ?? null;
    if (!frozen && !args["label-variant"]) {
      console.error(`fake-cli: no frozen label tokens for ${args.model} in ${args.config}`);
      process.exit(1);
    }
  }
  const flag = args["label-variant"] ? LABELS[args["label-variant"]] : null;
  if (frozen && flag && frozen.join("|") !== flag.join("|")) {
    console.error("fake-cli: --label-variant contradicts the frozen label tokens");
    process.exit(1);
  }
  const tokens = frozen ?? flag;
  if (!tokens) {
    console.error("fake-cli: neither --config nor --label-variant");
    process.exit(1);
  }
  labelTokens = {
    tokens,
    source: frozen ? "config" : "flag",
    config_sha256: frozen ? sha256(readFileSync(args.config, "utf-8")) : null,
  };
}

const text = readFileSync(args.set, "utf-8");
let items = text
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));
if (args.limit) items = items.slice(0, Number(args.limit));
const out = args.out;
const runPath = join(out, "run.json");
const scoresPath = join(out, "scores.jsonl");
const now = () => new Date().toISOString();

const identity = {
  machine: { cpu: "fake", ram_bytes: 1, os: "fake", arch: "x64", node_version: process.version },
  versions: { transformers_js: "0", onnxruntime_node: "0" },
  threads: { intra_op: 1, inter_op: 1 },
  model: { id: args.model, revision: args.revision ?? "0".repeat(40), dtype: args.dtype },
  mode,
  max_new_tokens: mode === "greedy" ? Number(args["max-new-tokens"] ?? 8) : null,
  input: {
    name: args.set.split("/").slice(-2).join("/"),
    sha256: sha256(text),
    n_items: items.length,
    limit: args.limit ? Number(args.limit) : null,
  },
  label_tokens: labelTokens,
  chat_template_kwargs: {},
};

let meta;
const done = new Set();
if (args.resume) {
  if (!existsSync(runPath)) {
    console.error(`${out}: nothing to resume (no run.json)`);
    process.exit(1);
  }
  const prev = JSON.parse(readFileSync(runPath, "utf-8"));
  for (const k of Object.keys(identity)) {
    if (k === "machine" || k === "versions") continue;
    if (JSON.stringify(prev[k]) !== JSON.stringify(identity[k])) {
      console.error(`Cannot resume: "${k}" differs from the original run`);
      process.exit(1);
    }
  }
  if (existsSync(scoresPath)) {
    const lines = readFileSync(scoresPath, "utf-8").split("\n");
    for (const l of lines) {
      if (!l.trim()) continue;
      try {
        done.add(JSON.parse(l).prompt_id);
      } catch {
        /* torn last line */
      }
    }
  }
  meta = { ...prev, status: "running", resumed_at: [...prev.resumed_at, now()] };
} else {
  if (existsSync(scoresPath) || existsSync(runPath)) {
    console.error(
      `${out} already holds a run. Pass --resume to continue it or choose an empty --out.`
    );
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  meta = {
    schema: "euconform.paired-eval.run/v1",
    status: "running",
    started_at: now(),
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
const write = () => writeFileSync(runPath, `${JSON.stringify(meta, null, 2)}\n`);
write();

const faultN = (name) => {
  const v = process.env[name];
  if (!v) return null;
  const [n, sub] = v.split(":");
  return !sub || out.includes(sub) ? Number(n) : null;
};
const killAfter = faultN("FAKE_KILL_AFTER");
const abortAfter = faultN("FAKE_ABORT_AFTER");
const latency = Number(process.env.FAKE_LATENCY_MS ?? 120);
const retestNoise = process.env.FAKE_RETEST_NOISE === "1" && out.endsWith("retest");

const ACC = args.model.includes("Qwen3") ? 0.9 : 0.8;
const MASS = (variant) =>
  args.model.includes("Qwen3")
    ? variant === "space"
      ? 0.95
      : 0.9
    : variant === "space"
      ? 0.8
      : 0.9;

function score(item) {
  const variantName = labelTokens && labelTokens.tokens[0] === " A" ? "space" : "plain";
  const opt1 = item.option_order[0] === "E" ? "escalate" : "routine";
  const x1 = item.letter_order[0];
  const letterOf = (c) => (c === opt1 ? x1 : x1 === "A" ? "B" : "A");
  const wrong = item.reference_content === "escalate" ? "routine" : "escalate";
  const content =
    unit(`${args.model}|${item.item_id}|${item.variant}`) < ACC ? item.reference_content : wrong;
  const sign = content === "escalate" ? 1 : -1;
  // margin on the escalate side, plus a place effect that cancels over the permutations
  let m = sign * 2 + (item.letter_order === "AB" ? 0.05 : -0.05);
  if (retestNoise) m += 1e-2;
  const dLetter = letterOf("escalate") === "A" ? m : -m; // l_a - l_b
  const s = 1 / (1 + Math.exp(-dLetter));
  const mass = MASS(variantName);
  const row = {
    prompt_id: item.prompt_id,
    mode,
    model_id: args.model,
    revision: identity.model.revision,
    dtype: args.dtype,
    logits_dtype: null,
    onnxruntime_version: "0",
    transformers_version: "0",
    intra_op_threads: 1,
    inter_op_threads: 1,
    thinking_mode: null,
    template_sha256: null,
    rendered_prompt_sha256: null,
    n_tokens: 100,
    label_tokens: null,
    label_token_ids: null,
    l_a: null,
    l_b: null,
    mass: null,
    l_escalate: null,
    l_routine: null,
    generated: null,
    greedy_letter: null,
    decision_content: content,
    reference_content: item.reference_content,
    latency_ms: latency,
    cpu: "fake",
    ram_bytes: 1,
    os: "fake",
  };
  if (mode === "logprob") {
    Object.assign(row, {
      label_tokens: labelTokens.tokens,
      label_token_ids: [1, 2],
      l_a: Math.log(mass * s),
      l_b: Math.log(mass * (1 - s)),
      mass,
    });
  } else if (mode === "seqlogprob") {
    Object.assign(row, { l_escalate: -10 + m / 2, l_routine: -10 - m / 2, n_tokens: 100 });
  } else {
    const letter = dLetter > 0 ? "A" : "B";
    Object.assign(row, {
      label_tokens: labelTokens.tokens,
      generated: letter,
      greedy_letter: letter,
    });
  }
  return row;
}

let written = 0;
for (const item of items) {
  if (done.has(item.prompt_id)) continue;
  if (abortAfter !== null && written >= abortAfter) {
    meta.status = "aborted";
    meta.errors = 1;
    meta.error_message = "fake scorer error";
    meta.ended_at = now();
    write();
    console.error("fake scorer error");
    process.exit(1);
  }
  appendFileSync(scoresPath, `${JSON.stringify(score(item))}\n`);
  meta.n_scored = done.size + ++written;
  if (killAfter !== null && written >= killAfter) process.kill(process.pid, "SIGKILL");
}
meta.status = "complete";
meta.ended_at = now();
write();
console.log(`${out}: ${meta.n_scored} rows`);
