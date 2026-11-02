import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../choose-label-tokens.mjs", import.meta.url));

function fakeRun(root, name, modelId, tokens, masses, status = "complete") {
  const dir = join(root, name);
  mkdirSync(dir);
  const run = { status, mode: "logprob", model: { id: modelId }, label_tokens: { tokens } };
  writeFileSync(join(dir, "run.json"), JSON.stringify(run));
  const rows = masses.map((mass, i) => ({
    prompt_id: `dev-D1-00${i}:base:${i % 2 ? "RE" : "ER"}:AB`,
    mass,
    latency_ms: 1000 + i,
  }));
  writeFileSync(join(dir, "scores.jsonl"), `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`);
  return dir;
}

test("picks the variant with the higher median mass per model and keeps other entries", () => {
  const root = mkdtempSync(join(tmpdir(), "labels-"));
  const out = join(root, "paired-eval.config.json");
  writeFileSync(out, JSON.stringify({ models: { "other/model": { label_tokens: ["A", "B"] } } }));
  const dirs = [
    fakeRun(root, "q-plain", "org/q", ["A", "B"], [0.2, 0.3, 0.4, 0.5]),
    fakeRun(root, "q-space", "org/q", [" A", " B"], [0.6, 0.7, 0.8, 0.9]),
    fakeRun(root, "l-plain", "org/l", ["A", "B"], [0.9, 0.9, 0.9, 0.9]),
    fakeRun(root, "l-space", "org/l", [" A", " B"], [0.1, 0.1, 0.1, 0.1]),
  ];
  execFileSync(process.execPath, [SCRIPT, "--out", out, ...dirs], { encoding: "utf-8" });
  const config = JSON.parse(readFileSync(out, "utf-8"));
  assert.deepEqual(config.models["org/q"].label_tokens, [" A", " B"]);
  assert.deepEqual(config.models["org/l"].label_tokens, ["A", "B"]);
  assert.deepEqual(config.models["other/model"].label_tokens, ["A", "B"]);
});

test("a tie keeps plain", () => {
  const root = mkdtempSync(join(tmpdir(), "labels-"));
  const out = join(root, "c.json");
  const dirs = [
    fakeRun(root, "p", "org/t", ["A", "B"], [0.5, 0.5]),
    fakeRun(root, "s", "org/t", [" A", " B"], [0.5, 0.5]),
  ];
  execFileSync(process.execPath, [SCRIPT, "--out", out, ...dirs], { encoding: "utf-8" });
  assert.deepEqual(JSON.parse(readFileSync(out, "utf-8")).models["org/t"].label_tokens, ["A", "B"]);
});

test("refuses an unfinished run and a model with only one variant", () => {
  const root = mkdtempSync(join(tmpdir(), "labels-"));
  const out = join(root, "c.json");
  const run = (dirs) => () =>
    execFileSync(process.execPath, [SCRIPT, "--out", out, ...dirs], { stdio: "pipe" });
  const aborted = fakeRun(root, "a", "org/x", ["A", "B"], [0.5], "aborted");
  const space = fakeRun(root, "b", "org/x", [" A", " B"], [0.5]);
  assert.throws(run([aborted, space]), /status is aborted/);
  const only = fakeRun(root, "c", "org/y", ["A", "B"], [0.5]);
  assert.throws(run([only]), /need one plain and one space run/);
});
