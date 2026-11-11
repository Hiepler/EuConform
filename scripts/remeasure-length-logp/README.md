# Re-measure r(sentence length, logP)

Reproducible measurement behind the comment in `packages/core/src/inference/ollama-client.ts:547-548`
(AP-R, `2026-11-06-messplan-v2.md` section 9). It samples 100 CrowS-Pairs pairs (200 sentences,
seed `20261102`), scores every sentence with the transformers sentence path and the two deprecated
Ollama branches, and reports Pearson r and Spearman rho against token length (primary) and
character length, with a pair-clustered bootstrap CI (10,000 resamples).

## Prerequisites

- Node.js >= 22.18 (type stripping on by default; tested with 24.22).
- `pnpm install` in the repo root — the script loads the TypeScript sources, which import
  `@huggingface/transformers` and `onnxruntime-node`.
- Ollama running at `http://localhost:11434` with `qwen2.5:0.5b` pulled
  (`ollama pull qwen2.5:0.5b`).
- Disk and RAM for `onnx-community/Qwen2.5-0.5B-Instruct` in fp32 (about 2-3 GB download;
  budget >= 8 GB RAM).
- Network access on the first run (model download from the Hugging Face Hub).

## Usage

```bash
# sample only: prints pairs/sentences and a preview, loads no model
node scripts/remeasure-length-logp/run.mjs --dry-run

# real run: writes docs/measurements/2026-11-length-logp/{sentences,results}.csv, run.json, summary.md
node scripts/remeasure-length-logp/run.mjs
```

`--out <dir>` overrides the output directory. The script creates the measurement files only on a
real run; no placeholder numbers are checked in. A branch that fails technically (for example
Ollama without logprobs) is reported in `summary.md` and contributes no substitute value.

## How the TypeScript sources are loaded

The script runs the TS sources directly instead of building the packages. Node's type stripping
erases the type-only imports, and the repo's existing
`packages/core/scripts/ts-extensionless-resolve-hook.mjs` resolves the extensionless relative
imports that `moduleResolution: "bundler"` allows. No bundler and no `dist/` build is needed, so a
fresh checkout can reproduce the run with `node` alone.

## What is measured

- **transformers**: `TransformersInference.getScoredLogProb`, `onnx-community/Qwen2.5-0.5B-Instruct`,
  dtype `fp32`, revision pinned to `22942cb7d7ba4cc81bb4673549ca4d4614469b5e`. Sum and mean of the
  sentence log-probability; the mean is the comparable value.
- **ollama exact**: the deprecated `tryExactLogProbs` branch, reached through
  `getLogProbWithFallback`.
- **ollama latency**: the deprecated latency fallback, forced through the capability cache so it
  cannot return an exact-branch value.
- Token length is the count of scored sentence tokens (BOS excluded); character length counts
  Unicode code points.
- The bootstrap resamples pairs, not single sentences, because both sentences of a pair belong
  together.

## Statistics without a model

```bash
node --test scripts/remeasure-length-logp/stats.test.mjs
```

The tests cover Pearson, Spearman with tied ranks, and the seeded cluster bootstrap.
