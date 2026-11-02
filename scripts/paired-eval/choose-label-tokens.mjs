#!/usr/bin/env node
// P0 label-token choice (messplan v2.1, AP3): per model, the variant ("A" vs " A") with the higher
// median label mass on dev, over ER and RE together. Reads finished `paired-eval run` directories
// (run.json + scores.jsonl), prints the medians and the median latency, and writes or updates
// paired-eval.config.json. Ties keep "plain" (assumption; the plan names no tie rule).
//
//   node scripts/paired-eval/choose-label-tokens.mjs --out <config.json> <run-dir>...

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const VARIANT_NAMES = { "A|B": "plain", " A| B": "space" };

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return Number.NaN;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function readRunDir(dir) {
  const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf-8"));
  if (run.status !== "complete")
    throw new Error(`${dir}: run.json status is ${run.status}, expected complete.`);
  if (run.mode !== "logprob") throw new Error(`${dir}: mode ${run.mode}, expected logprob.`);
  const tokens = run.label_tokens?.tokens;
  const variant = VARIANT_NAMES[tokens?.join("|")];
  if (!variant) throw new Error(`${dir}: unknown label tokens ${JSON.stringify(tokens)}.`);
  const rows = readFileSync(join(dir, "scores.jsonl"), "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
  const order = (row) => row.prompt_id.split(":")[2];
  return {
    dir,
    modelId: run.model.id,
    variant,
    tokens,
    n: rows.length,
    mass: median(rows.map((r) => r.mass)),
    massER: median(rows.filter((r) => order(r) === "ER").map((r) => r.mass)),
    massRE: median(rows.filter((r) => order(r) === "RE").map((r) => r.mass)),
    latencyMs: median(rows.map((r) => r.latency_ms)),
  };
}

export function chooseLabelTokens(runs) {
  const byModel = new Map();
  for (const r of runs) {
    const entry = byModel.get(r.modelId) ?? {};
    if (entry[r.variant])
      throw new Error(`Two ${r.variant} runs for ${r.modelId}: ${entry[r.variant].dir}, ${r.dir}.`);
    entry[r.variant] = r;
    byModel.set(r.modelId, entry);
  }
  const choices = {};
  for (const [modelId, entry] of byModel) {
    if (!entry.plain || !entry.space)
      throw new Error(`${modelId}: need one plain and one space run.`);
    if (entry.plain.n !== entry.space.n)
      throw new Error(`${modelId}: plain and space runs differ in size.`);
    const pick = entry.space.mass > entry.plain.mass ? entry.space : entry.plain;
    choices[modelId] = {
      variant: pick.variant,
      tokens: pick.tokens,
      plain: entry.plain,
      space: entry.space,
    };
  }
  return choices;
}

function main(argv) {
  const outIdx = argv.indexOf("--out");
  if (outIdx < 0 || !argv[outIdx + 1])
    throw new Error("usage: choose-label-tokens.mjs --out <config.json> <run-dir>...");
  const out = argv[outIdx + 1];
  const dirs = argv.filter((_, i) => i !== outIdx && i !== outIdx + 1);
  const choices = chooseLabelTokens(dirs.map(readRunDir));
  const config = existsSync(out) ? JSON.parse(readFileSync(out, "utf-8")) : { models: {} };
  config.models ??= {};
  const f = (x) => (Number.isFinite(x) ? x.toFixed(4) : "nan");
  console.log("| model | variant | median mass (ER, RE) | median latency ms |");
  console.log("|---|---|---|---|");
  for (const [modelId, c] of Object.entries(choices)) {
    for (const r of [c.plain, c.space]) {
      const mark = r.variant === c.variant ? " (chosen)" : "";
      console.log(
        `| ${modelId} | ${r.variant}${mark} | ${f(r.mass)} (${f(r.massER)}, ${f(r.massRE)}) | ${Math.round(r.latencyMs)} |`
      );
    }
    config.models[modelId] = { label_tokens: c.tokens };
  }
  // Token pairs on one line, as the repo formatter (biome) writes them, so the file hash is stable.
  const text = JSON.stringify(config, null, 2).replace(
    /\[\n\s+("[^"]*"),\n\s+("[^"]*")\n\s+\]/g,
    "[$1, $2]"
  );
  writeFileSync(out, `${text}\n`);
  console.log(`wrote ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
