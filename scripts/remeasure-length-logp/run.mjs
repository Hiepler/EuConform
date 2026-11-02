#!/usr/bin/env node
/**
 * Re-measure r(sentence length, logP) for the deprecated Ollama path and the transformers
 * sentence path (AP-R, messplan v2 section 9). A real run writes
 * docs/measurements/2026-11-length-logp/; --dry-run only prints the sample.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { register } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "../..");
const OUT = "docs/measurements/2026-11-length-logp";
const SEED = 20261102;
const BOOTSTRAP = 10000;
const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const REVISION = "22942cb7d7ba4cc81bb4673549ca4d4614469b5e";
const OLLAMA = "qwen2.5:0.5b";
const OLLAMA_URL = "http://localhost:11434";
const SENTENCE_HEADER = "sentenceId,pairId,variant,text,charLength,tokenLength";
const RESULT_HEADER =
  "sentenceId,pairId,variant,branch,logprob,logprobSum,logprobMean,tokenLength,charLength,method,ok,error";
register(join(ROOT, "packages/core/scripts/ts-extensionless-resolve-hook.mjs"), import.meta.url);
const tsUrl = (path) => pathToFileURL(join(ROOT, path)).href;

/** mulberry32: stable across Node versions, so a recorded seed replays exactly. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

/** 1-based ranks; tied values get the average of their rank positions. */
export function averageRanks(values) {
  const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].v === sorted[i].v) j++;
    for (let k = i; k <= j; k++) ranks[sorted[k].i] = (i + j + 2) / 2;
    i = j + 1;
  }
  return ranks;
}

export function spearman(xs, ys) {
  return xs.length < 2 ? null : pearson(averageRanks(xs), averageRanks(ys));
}

/** Percentile bootstrap over pair clusters (both sentences of a pair travel together). */
export function bootstrapCI(points, statistic, { resamples = BOOTSTRAP, seed = SEED } = {}) {
  const clusters = new Map();
  for (const p of points) clusters.set(p.cluster, [...(clusters.get(p.cluster) ?? []), p]);
  const groups = [...clusters.values()];
  if (groups.length < 2) return null;
  const rng = mulberry32(seed);
  const values = [];
  for (let b = 0; b < resamples; b++) {
    const sample = [];
    for (let i = 0; i < groups.length; i++)
      sample.push(...groups[Math.floor(rng() * groups.length)]);
    const value = statistic(
      sample.map((p) => p.x),
      sample.map((p) => p.y)
    );
    if (value !== null && Number.isFinite(value)) values.push(value);
  }
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const at = (q) => {
    const pos = (values.length - 1) * q;
    const lo = Math.floor(pos);
    return values[lo] + (values[Math.ceil(pos)] - values[lo]) * (pos - lo);
  };
  return { lower: at(0.025), upper: at(0.975), resamples: values.length };
}

const correlation = (points, statistic) => ({
  n: points.length,
  estimate: statistic(
    points.map((p) => p.x),
    points.map((p) => p.y)
  ),
  ci: points.length >= 3 ? bootstrapCI(points, statistic) : null,
});

function buildStatistics(results) {
  const branches = [
    ["transformers (mean logP)", "transformers", "logprobMean"],
    ["ollama exact", "ollama_exact", "logprob"],
    ["ollama latency fallback", "ollama_latency", "logprob"],
  ];
  return branches.flatMap(([key, branch, metric]) =>
    [
      ["token (primary)", "tokenLength"],
      ["characters", "charLength"],
    ].map(([length, lengthKey]) => {
      const points = results
        .filter(
          (r) =>
            r.branch === branch &&
            r.ok &&
            Number.isFinite(r[metric]) &&
            Number.isFinite(r[lengthKey])
        )
        .map((r) => ({ cluster: r.pairId, x: r[metric], y: r[lengthKey] }));
      return {
        key,
        length,
        n: points.length,
        pearson: correlation(points, pearson),
        spearman: correlation(points, spearman),
      };
    })
  );
}

const message = (error) => (error instanceof Error ? error.message : String(error));
const row = (s, branch, values) => ({
  sentenceId: s.sentenceId,
  pairId: s.pairId,
  variant: s.variant,
  tokenLength: s.tokenLength,
  charLength: s.charLength,
  ok: true,
  branch,
  ...values,
});

async function loadSample() {
  const { loadCrowsPairsDataset } = await import(
    tsUrl("packages/core/src/datasets/crows-pairs.ts")
  );
  const { selectPairs } = await import(tsUrl("packages/cli/src/bias/select-pairs.ts"));
  return selectPairs(loadCrowsPairsDataset("en"), 100, SEED);
}

const toSentences = (pairs) =>
  pairs.flatMap((pair) =>
    [
      ["more", "stereotype", pair.sent_more],
      ["less", "anti-stereotype", pair.sent_less],
    ].map(([suffix, variant, text]) => ({
      sentenceId: `${pair.id}-${suffix}`,
      pairId: String(pair.id),
      variant,
      text,
      charLength: [...text].length,
      tokenLength: null,
    }))
  );

async function measureTransformers(sentences) {
  const { TransformersInference } = await import(
    tsUrl("packages/core/src/inference/transformers-inference.ts")
  );
  const engine = new TransformersInference(MODEL, (s) => console.log(`[transformers] ${s}`), {
    revision: REVISION,
    dtype: "fp32",
  });
  const rows = [];
  for (const sentence of sentences) {
    try {
      const result = await engine.getScoredLogProb(sentence.text);
      sentence.tokenLength = result.scoredTokenIds.length;
      rows.push(
        row(sentence, "transformers", {
          logprob: result.score / sentence.tokenLength,
          logprobSum: result.score,
          logprobMean: result.score / sentence.tokenLength,
          method: result.method ?? "sequence_logprob_sum",
        })
      );
    } catch (error) {
      rows.push(
        row(sentence, "transformers", { method: "none", ok: false, error: message(error) })
      );
    }
  }
  return rows;
}

async function readOllamaInfo() {
  try {
    const [tags, version] = await Promise.all([
      fetch(`${OLLAMA_URL}/api/tags`),
      fetch(`${OLLAMA_URL}/api/version`),
    ]);
    if (!tags.ok) throw new Error(`/api/tags returned HTTP ${tags.status}`);
    const models = (await tags.json()).models ?? [];
    const info = version.ok ? await version.json() : {};
    const found = models.find((m) => m.name === OLLAMA || m.name.startsWith(`${OLLAMA}:`));
    return {
      available: true,
      version: info.version ?? null,
      modelFound: Boolean(found),
      digest: found?.digest ?? null,
    };
  } catch (error) {
    return { available: false, error: message(error) };
  }
}

async function measureOllama(sentences, branch, info) {
  if (!info.available || !info.modelFound) {
    const error = info.available
      ? `model ${OLLAMA} not found (ollama pull ${OLLAMA})`
      : `Ollama unreachable: ${info.error}`;
    return sentences.map((sentence) => row(sentence, branch, { method: "none", ok: false, error }));
  }
  const { OllamaClient } = await import(tsUrl("packages/core/src/inference/ollama-client.ts"));
  const client = new OllamaClient(OLLAMA, OLLAMA_URL, {
    get: () =>
      JSON.stringify({
        model: OLLAMA,
        supportsLogProbs: branch === "ollama_exact",
        testedAt: new Date().toISOString(),
      }),
    set: () => {},
  });
  const rows = [];
  for (const sentence of sentences) {
    try {
      const result = await client.getLogProbWithFallback(sentence.text);
      if (branch === "ollama_exact" && result.method !== "logprobs_exact")
        throw new Error(`no logprobs; fell back to ${result.method}`);
      rows.push(row(sentence, branch, { logprob: result.logprob, method: result.method }));
    } catch (error) {
      rows.push(row(sentence, branch, { method: "none", ok: false, error: message(error) }));
    }
  }
  return rows;
}

const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const toCsv = (header, rows) => {
  const headers = header.split(",");
  return `${[header, ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n")}\n`;
};

function branchSummary(rows, branch) {
  const own = rows.filter((entry) => entry.branch === branch);
  const errors = {};
  for (const entry of own) if (!entry.ok) errors[entry.error] = (errors[entry.error] ?? 0) + 1;
  return {
    total: own.length,
    ok: own.filter((entry) => entry.ok).length,
    failed: own.filter((entry) => !entry.ok).length,
    errors,
  };
}

const fmt = (value) => (value === null || !Number.isFinite(value) ? "—" : value.toFixed(3));
const ci = (entry) => (entry.ci ? `[${fmt(entry.ci.lower)}, ${fmt(entry.ci.upper)}]` : "—");

function renderSummary(run) {
  const branches = Object.entries(run.branches)
    .map(
      ([b, s]) => `${b} ${s.ok}/${s.total}${s.failed === s.total ? " (failed, no substitute)" : ""}`
    )
    .join("; ");
  const correlations = run.statistics
    .map(
      (e) =>
        `| ${e.key} | ${e.length} | ${e.n} | ${fmt(e.pearson.estimate)} | ${ci(e.pearson)} | ${fmt(e.spearman.estimate)} | ${ci(e.spearman)} |`
    )
    .join("\n");
  const failures = Object.entries(run.branches).flatMap(([b, s]) =>
    Object.entries(s.errors).map(([error, count]) => `- ${b} (${count}×): ${error}`)
  );
  return `# Re-measurement: r(sentence length, logP)

Generated at ${run.finishedAt}; spec: messplan v2 section 9 (AP-R).

- Seed ${run.seed}; pairs ${run.pairCount}; sentences ${run.sentenceCount}
- Transformers: \`${run.transformers.model}\` @ \`${run.transformers.revision}\`, dtype ${run.transformers.dtype}
- Ollama: \`${run.ollama.model}\`; version ${run.ollama.version ?? "—"}; digest ${run.ollama.digest ?? "—"}
- Bootstrap: ${run.bootstrap.resamples} resamples, seed ${run.bootstrap.seed}, unit = pair cluster
- Branches: ${branches}

| Branch | Length | n | Pearson r | 95% CI | Spearman rho | 95% CI |
| --- | --- | --- | --- | --- | --- | --- |
${correlations}

The sum log-probability is in \`results.csv\`; only the mean is correlated because the sum scales with sentence length by construction.

## Failures

${failures.length > 0 ? failures.join("\n") : "None."}

## Method notes

- Both sentences of every selected CrowS-Pairs pair are measured; token length counts scored sentence tokens (BOS excluded), character length counts Unicode code points.
- \`ollama exact\` reaches the deprecated \`tryExactLogProbs\` branch through \`getLogProbWithFallback\`; \`ollama latency\` forces the deprecated latency fallback through the capability cache.
- A branch that fails contributes no value; \`results.csv\` keeps the failure row.
`;
}

async function main() {
  const { pairs, seed } = await loadSample();
  const sentences = toSentences(pairs);
  if (process.argv.includes("--dry-run")) {
    console.log(`seed=${seed} pairs=${pairs.length} sentences=${sentences.length}`);
    for (const sentence of sentences.slice(0, 5))
      console.log(`${sentence.sentenceId}\t${sentence.charLength} chars\t${sentence.text}`);
    return;
  }
  const startedAt = new Date().toISOString();
  console.log(
    `[remeasure] ${sentences.length} sentences from ${pairs.length} pairs (seed ${seed})`
  );
  const transformers = await measureTransformers(sentences);
  const ollama = await readOllamaInfo();
  console.log(`[ollama] available=${ollama.available} modelFound=${ollama.modelFound}`);
  const results = [
    ...transformers,
    ...(await measureOllama(sentences, "ollama_exact", ollama)),
    ...(await measureOllama(sentences, "ollama_latency", ollama)),
  ];
  const run = {
    spec: "2026-11-06-messplan-v2.md#AP-R",
    startedAt,
    finishedAt: new Date().toISOString(),
    seed,
    pairCount: pairs.length,
    sentenceCount: sentences.length,
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    transformers: { model: MODEL, revision: REVISION, dtype: "fp32" },
    ollama: { model: OLLAMA, ...ollama },
    bootstrap: { resamples: BOOTSTRAP, seed: SEED, unit: "pair cluster" },
    branches: {
      transformers: branchSummary(results, "transformers"),
      ollama_exact: branchSummary(results, "ollama_exact"),
      ollama_latency: branchSummary(results, "ollama_latency"),
    },
    statistics: buildStatistics(results),
  };
  const outDir = join(ROOT, OUT);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "sentences.csv"), toCsv(SENTENCE_HEADER, sentences));
  await writeFile(join(outDir, "results.csv"), toCsv(RESULT_HEADER, results));
  await writeFile(join(outDir, "run.json"), `${JSON.stringify(run, null, 2)}\n`);
  await writeFile(join(outDir, "summary.md"), renderSummary(run));
  console.log(`[remeasure] wrote ${outDir}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
