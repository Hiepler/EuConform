# Paired decision eval

A pre-registered measurement instrument for one question:

> Is a model right **for the right reason** — or does its answer change when
> something irrelevant changes, and stay put when the decisive fact changes?

Status: **experimental**. The instrument is complete, pre-registration stage 1 is frozen and
deposited ([doi:10.5281/zenodo.24134199](https://doi.org/10.5281/zenodo.24134199)), and no model
has been run yet. This repository contains no measured model values. The claim boundary
is deliberately narrow: *for six open 0.5–2B models on a synthetic rule-following task
with eight rule families*.

> This is research tooling. It is **not** a published EuConform evidence document, not
> a medical device, and makes no clinical claim. The task is clinically motivated, but
> the prompts are synthetic.

## Why it exists

Accuracy is a marginal number: it counts correct answers. It cannot distinguish a model
that follows the rule from one that follows a shortcut that happens to agree on the test
set. That difference becomes visible only when the prompt changes in controlled ways:

| Change | Should it change the decision? |
|---|---|
| A **decisive** fact changes (e.g. a value crosses a threshold) | yes |
| An **irrelevant** fact changes (name, origin, insurance status, option order) | no |
| A **placebo** change of the same distance but different content | no |
| An equivalent **paraphrase** | no |

The instrument pairs each base case with these variants, scores both option orders, and
reports both the accuracy and whether the decision survived the changes that should not
matter. The core hypothesis (H1) is that **the ranking by accuracy and the ranking by
decision quality can reverse** — a model can win on accuracy while losing on invariance.

## Where it fits the AI Act

Annex IV 2(g) asks for the test procedures and metrics used to verify accuracy and
robustness; Article 15 requires accuracy and robustness for high-risk systems. A single
accuracy number answers neither question: it does not show whether a decision survives
input changes that should be irrelevant (robustness), nor whether it reacts to the change
that matters (sensitivity). `Acc` and `GA` make that gap explicit.

This is still research tooling, not an evidence document. Turning it into compliance
evidence is a separate step: a future evidence-format revision may carry an optional
`groundedAccuracy` block (task, rule families, N, pre-registration DOI, results). The
current `bias.v2` format is deliberately untouched.

## What it produces

Per model:

| Metric | Meaning |
|---|---|
| `Acc` | Share of correct decisions on base and decisive variants |
| `GA` | *Grounded accuracy*: correct on base, unchanged under every irrelevant variant, correct on decisive |
| `GA_inv` | Invariance component: base correct and no irrelevant variant flips the decision |
| `GA_sens` | Sensitivity component: base and decisive both correct |
| `SFR` | Sensitivity failure rate: share of decisive variants that do **not** flip the decision |
| `σ` | Mean decision margin in nats |

Per model pair: `ΔAcc`, `ΔGA` with stratified paired bootstrap, intersection-union test,
Holm correction over the pre-registered pairs. Per model and axis: exact McNemar against
the placebo and against paraphrase noise (`H3`, `H3-P`). The full decision rules, including
what counts as a refutation, are in the pre-registration — fixed before the runs.

## Architecture

The instrument is split so that each stage has one job and one contract:

```
packages/core/src/paired-eval/      data contract (PromptItem, ScoreRow), generator, baselines
packages/core/src/inference/        next-token label scorer (letters, option words, greedy)
packages/cli/src/paired-eval/       run (resumable, fail-closed), baseline, generate commands
scripts/paired-eval/                Python analysis, power simulation, run scripts
docs/prereg/                        pre-registration and the macOS run guide
```

Design decisions worth knowing:

- **One spelling across languages.** The JSONL contract is snake_case so TypeScript and
  Python read the same fields without a translation layer that could drift.
- **Two margins, one decision.** The option block is presented in both orders (`ER`/`RE`);
  the decision uses the averaged margin `m* = (m_ER + m_RE) / 2`, so a letter-order
  artifact cannot decide a case on its own.
- **Fail-closed runner.** A scoring error aborts the run; `run.json` is written at start
  and end and carries model id, revision, dtype, runtime versions, template hash, input
  hash and label tokens. `--resume` continues an interrupted run without duplicating rows.
- **LLM-free baselines.** Oracle, constant answers, a coarse rule and random establish
  what the task can and cannot distinguish before any model is involved.
- **Analysis is deterministic.** Same input and seed produce byte-identical `metrics.csv`.
- **Pre-registration before measurement.** Stage 1 (hypotheses, metrics, model revisions,
  seeds, hashes, frame wording, label-token rule) is frozen and committed before the
  first run.

## Quick start (no model, no network)

Requires Node 22+ (CI runs Node 24) and **Python 3.12+**.

```bash
pnpm --filter @euconform/cli build

# 1. Generate the frozen dev split (seed and layout from the pre-registration)
node packages/cli/dist/index.js paired-eval generate \
  --split dev --seed dev --per-family 24 --out /tmp/paired-eval/dev
# -> items.jsonl (1152 prompts), manifest.json
#    sha256 must be d88817d6d81c6edee668805cc19885257c2cdbeb7eac32e67425365e1f562084

# 2. Run the LLM-free oracle baseline
node packages/cli/dist/index.js paired-eval baseline \
  --name oracle --set /tmp/paired-eval/dev/items.jsonl --out /tmp/paired-eval/oracle

# 3. Analyse
python3.12 -m venv .venv
.venv/bin/pip install -r scripts/paired-eval/requirements.txt
.venv/bin/python -I scripts/paired-eval/analyze.py \
  --items /tmp/paired-eval/dev/items.jsonl \
  --scores /tmp/paired-eval/oracle \
  --k 15 --out /tmp/paired-eval/analysis
# -> report.md, metrics.csv, pairs.csv, flips.csv
```

With one model the report is a smoke test: the oracle must reach `Acc = GA = 1` and the
pair sections stay empty. Real measurements need Hugging Face models and follow
[`docs/prereg/2026-11-run-guide-macos.md`](prereg/2026-11-run-guide-macos.md).

## Artifacts and status

| File | Produced by | Status |
|---|---|---|
| `items.jsonl` | `paired-eval generate` | Deterministic prompt set; identified by `manifest.json` and the pre-registered SHA-256 |
| `scores.jsonl` | `paired-eval run` / `baseline` | One row per scored prompt; the raw data for the analysis |
| `run.json` | `paired-eval run` | Versioned research artifact, `schema: "euconform.paired-eval.run/v1"`, structurally checked by the runner; **not** a JSON-Schema-backed evidence document and not part of `bundle.v1` |
| `report.md`, `metrics.csv`, `pairs.csv`, `flips.csv` | `analyze.py` | Analysis output; deterministic for a fixed seed |

Pre-registration status:

| Stage | Content | Status |
|---|---|---|
| 1 | Hypotheses, metrics, model ids and revisions, dev/pilot seeds and hashes, frame wording, label-token rule | **frozen** |
| 2 | Label tokens per model, measured time per prompt, H0 on dev | open |
| 3 | N and k from the power simulation, test/test2 hashes | open |

## Scope and extensibility

The pre-registered claim covers six open 0.5–2B models on a synthetic task. Larger models
are a different run, not a different instrument: generator, scorer and analysis scale with
N; what changes is runtime, memory and the need for a new pre-registration (or a dated
amendment) before measuring. No claim is made that the task is representative of
production workloads.

## If H1 does not hold

The pre-registration fixes the reading for a null result ("no reversal detectable …", with
the largest upper bound). A null result is a result of the instrument, not a failure of the
study. Accuracy/GA gap and the placebo/paraphrase comparisons are reportable without a rank
reversal, so the analysis and the talk remain valid either way.

## Wording caution: origin axis

The origin axis compares German- and Turkish-coded names in a synthetic clinical case and
tests whether an effect is driven by origin or by rarity. The claim boundary stays at the
measurement: no statement about real-world discrimination and no statement about a model's
suitability. When the placebo check does not separate origin from rarity, public summaries
must say "origin or rarity, not separated" and must not turn a flip-rate difference into a
bias headline.

## What this is not

- **Not a leaderboard.** Six models on one synthetic task say nothing about general model
  quality, and the pre-registration forbids that reading.
- **Not a bias or fairness measurement.** Use `euconform bias` for the CrowS-Pairs
  evidence layer.
- **Not an evidence artifact.** `run.json` is research provenance, not a document type of
  the EuConform evidence format.
- **Not clinical.** The clinical framing motivates the task; it does not validate it.

## Where the rigor lives

- Pre-registration: [`docs/prereg/2026-11-fosdem-paired-eval.md`](prereg/2026-11-fosdem-paired-eval.md) (deposited: [doi:10.5281/zenodo.24134199](https://doi.org/10.5281/zenodo.24134199))
- Run guide: [`docs/prereg/2026-11-run-guide-macos.md`](prereg/2026-11-run-guide-macos.md)
- Analysis notes: [`scripts/paired-eval/README.md`](../scripts/paired-eval/README.md)
- Data contract: [`packages/core/src/paired-eval/types.ts`](../packages/core/src/paired-eval/types.ts)
