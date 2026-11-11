# Run guide (macOS): P0, pilot and AP-R for the paired decision eval

Copy-paste guide for running the first real model measurements of the FOSDEM 2027 paired
decision eval on one Mac. Order is fixed: **pre-registration (stage 1) → checks → setup →
smoke test → P0 on dev → pilot → AP-R**. Nothing in here merges a pull request.

Pre-registration: [`2026-11-fosdem-paired-eval.md`](2026-11-fosdem-paired-eval.md).
Specification: measurement plan v2.1, section 7 (time plan and abort rules) and section 9.

**Post-merge state (12 Nov 2026):** the instrument is merged (PR #28, released as
`@euconform/core@1.7.0` / `@euconform/cli@1.4.0`) and stage 1 is deposited at Zenodo
([10.5281/zenodo.24134199](https://doi.org/10.5281/zenodo.24134199)). Measurements therefore go
on their own branch and PR, not on the merged instrument branch.

## Assumptions

Each assumption is marked so it can be checked; the first block in step 1 tests most of them.

- **A1** Apple Silicon Mac (`arm64`), macOS 14 or newer, on mains power, lid open.
- **A2** At least 16 GB RAM. Qwen3-1.7B in fp32 is 6.9 GB of weights alone (Hub file sizes,
  2 Nov 2026); 8 GB machines are expected to fail.
- **A3** At least 30 GB free disk: models about 14 GB (Qwen2.5-0.5B 2.0, Qwen3-1.7B 6.9,
  Llama-3.2-1B 5.0), Ollama model 0.4 GB, `node_modules` about 1.5 GB, measurement data under
  50 MB (estimated).
- **A4** Homebrew is installed. A fresh clone goes to `~/EuConform`; an existing clone elsewhere
  is not touched.
- **A5** `git` on this Mac commits as Benedikt Hiepler and can push to `Hiepler/EuConform`
  without a prompt (keychain or `gh auth`).
- **A6** Time per prompt is 1–6 s (plan section 7, estimated, never measured). P0 measures it.
  All durations below are **estimated** from that range, with about 3 s as the middle.

## Overview

| Step | What | Active time | Wall time (estimated) | Done when |
|---|---|---|---|---|
| 0 | Pre-registration stage 1 committed and deposited | 0 min (done by the pool) | – | the prereg says `stage 1 frozen` and carries the Zenodo DOI |
| 1 | Check prerequisites | 5 min | 5 min (+ installs) | every line in the check prints `ok` |
| 2 | Setup: clone, install, build, unit tests | 5 min | 15 min | tests pass, `paired-eval --help` prints |
| 3 | Smoke test AP3.3 on Qwen2.5-0.5B | 3 min | 10 min | vitest: 1 passed |
| 4 | P0 on dev, then pilot (one unattended command) | 2 min | 3–18 h, middle 9 h | last line `PILOT DONE` |
| 5 | Push P0 and pilot data | 3 min | 2 min | `git push` ok, the measurement PR shows the commits |
| 6 | AP-R remeasurement | 5 min | 30–60 min | `summary.md` exists, pushed to PR #29 |
| 7 | Report back | 1 min | – | one line to the pool |
| | **Total** | **about 24 min** | **about 10–20 h** | |

Steps 4 and 6 can run overnight. Step 4 commits P0 locally **before** the pilot starts, so the
stage 2 freeze is provably earlier than every pilot `run.json`.

---

## Step 0: pre-registration stage 1 (already done)

The pool committed stage 1 of the pre-registration on `main` (merged as PR #28) and deposited it
at Zenodo before any model has run: model ids and revision SHAs, dev and pilot seeds and SHA-256,
the label-token rule and the pilot subsets. Fields that only P0 or the pilot can fill:

| Field | Filled by | When |
|---|---|---|
| Label tokens per model | P0 (`choose-label-tokens.mjs` → `paired-eval.config.json`) | step 4, committed before the pilot |
| Final `frames.json` hash | P0; stays `cfa1ae82…` unless a wording changes | step 4 |
| Measured time per prompt | P0 (`docs/measurements/2026-11-paired-eval/p0/timing.txt`) | step 4 |
| N and k | power simulation on the pilot data | pool, after step 5 |
| test and test2 SHA-256 | `generate` after N is fixed | pool, before any test run (stage 3) |
| Gemma variant | confirmed in the pre-registration (`gemma-3-1b-it` fp32, Hub API 11 Nov 2026) | – |

Nothing to do here; step 2 checks that the commit is present.

## Step 1: check prerequisites (5 min)

Paste into Terminal:

```bash
echo "arch: $(uname -m)  (want arm64)"; sw_vers -productVersion
ram=$(( $(sysctl -n hw.memsize) / 1073741824 )); echo "RAM ${ram} GB: $([ $ram -ge 16 ] && echo ok || echo 'TOO SMALL, stop')"
free=$(df -g ~ | awk 'NR==2 {print $4}'); echo "free disk ${free} GB: $([ $free -ge 30 ] && echo ok || echo 'TOO LITTLE, free space first')"
node -e 'const [a,b]=process.versions.node.split(".").map(Number);console.log("node "+process.version+": "+((a>22||(a===22&&b>=18))?"ok":"need >= 22.18"))' 2>/dev/null || echo "node: missing"
command -v pnpm >/dev/null && echo "pnpm $(pnpm -v)" || echo "pnpm: missing"
python3 -c 'import sys;print("python "+sys.version.split()[0]+": "+("ok" if sys.version_info>=(3,12) else "need >= 3.12"))' 2>/dev/null || echo "python3: missing"
ollama --version 2>/dev/null || echo "ollama: missing (only needed for step 6)"
git config user.name; git config user.email
```

If something is missing:

```bash
brew install node@22 python@3.12 ollama   # then open a new Terminal window
npm install -g pnpm@10.19.0               # repo pins pnpm 10.19.0
```

Python 3.12 is an assumption: the pinned wheels (`numpy 2.5.4`, `pandas 3.1.0`) need at least
3.11; 3.12 is the safe choice. Start Ollama once from the app (or `brew services start ollama`).

## Step 2: setup (5 min active, about 15 min wall)

```bash
cd ~ && git clone https://github.com/Hiepler/EuConform.git && cd ~/EuConform
git switch main && git pull --ff-only
git switch -c measurement/paired-eval-2026-11
git push -u origin measurement/paired-eval-2026-11
grep -q "stage 1 frozen" docs/prereg/2026-11-fosdem-paired-eval.md || echo "STOP: stage 1 pre-registration missing"
grep -qi "zenodo" docs/prereg/2026-11-fosdem-paired-eval.md || echo "STOP: stage 1 deposit missing"
pnpm install --frozen-lockfile
pnpm --filter @euconform/cli build
node packages/cli/dist/index.js paired-eval --help
python3 -m venv ~/.venvs/euconform-pe
~/.venvs/euconform-pe/bin/pip install -r scripts/paired-eval/requirements.txt
EUCONFORM_CLI="node packages/cli/dist/index.js" ~/.venvs/euconform-pe/bin/python -m pytest -q scripts/paired-eval/tests
node --test scripts/paired-eval/tests/choose-label-tokens.test.mjs
```

**Success:** `--help` lists `generate`, `run`, `baseline`; pytest ends with `passed` and no
`failed`; `node --test` shows `pass 3`, `fail 0`.
**On failure:** stop and send the last 30 lines of output to the pool. Nothing has run yet, so
nothing is lost.

The virtual environment lives outside the repo (`~/.venvs/…`) on purpose: the repo does not
ignore `.venv/`.

## Step 3: smoke test AP3.3 on Qwen2.5-0.5B (3 min active, about 10 min wall)

First real model load: downloads about 2 GB, checks golden values, a bit-identical repeat in the
same process, a repeat in a second process within 1e-5, and that threads 4/1 match one thread.

```bash
cd ~/EuConform
export QWEN_REVISION=22942cb7d7ba4cc81bb4673549ca4d4614469b5e
SEED_GOLDEN=1 RUN_MODEL_TESTS=1 pnpm --filter @euconform/core exec vitest run tests/inference/label-scoring.integration.test.ts
RUN_MODEL_TESTS=1 pnpm --filter @euconform/core exec vitest run tests/inference/label-scoring.integration.test.ts
git add packages/core/tests/inference/fixtures/label-scoring-golden.json
git commit -m "test(core): seed label-scoring golden values from a real Qwen2.5-0.5B run"
```

The first call writes the golden file from this machine, the second checks against it.
**Success:** both calls end with `1 passed`.
**On failure:** do not continue to step 4. A failure here (for example threads not applied, or
the second process differs) means H0(c) would fail too. Send the vitest output to the pool.

## Step 4: P0 on dev, then the pilot (2 min active, 3–18 h wall)

One command, unattended. It stops on the first error and can be started again: finished runs are
skipped, interrupted runs continue with `--resume`, and P0 is skipped once it is committed.

What it does, in order:

1. Checks that stage 1 is committed and the tree is clean.
2. P0: generates dev and checks its SHA against the pre-registration; scores the rule oracle (no
   model); runs Qwen3-1.7B and Llama-3.2-1B on all 1,152 dev prompts with `A`/`B` and with
   ` A`/` B`; picks the label tokens; reruns 200 prompts per model in a new process (H0c);
   runs `analyze.py` on dev and **stops unless H0 holds**; applies the abort rule (median above
   6 s per prompt → no place decomposition in the pilot); **commits P0 (stage 2) locally**.
3. Pilot: generates the pilot sets and checks their SHA; per model runs main (2,304 prompts),
   word arm (192, `seqlogprob`), greedy (192, at most 8 tokens) and place decomposition (384).

```bash
cd ~/EuConform
caffeinate -i bash scripts/paired-eval/run-p0-pilot.sh 2>&1 | tee -a ~/euconform-p0-pilot.log
```

The script is [`scripts/paired-eval/run-p0-pilot.sh`](../../scripts/paired-eval/run-p0-pilot.sh); it holds the
pre-registered SHA-256 values and model revisions, so nothing has to be typed by hand.

**Durations (estimated, 1–6 s per prompt, middle 3 s):**

| Part | Prompts | Wall time |
|---|---|---|
| Model downloads (Qwen3 6.9 GB, Llama 5.0 GB) | – | 10–30 min, depends on the line |
| P0: 2 models × 2 variants × 1,152 | 4,608 | 1.3–7.7 h, middle 3.8 h |
| P0: retest 2 × 200, analysis | 400 | 7–40 min |
| Pilot: 2 × (2,304 + 192 + 192 + 384) | 6,144 | 1.7–10 h, middle 5 h |

Progress is printed every 10 prompts (`n/total`); the log is `~/euconform-p0-pilot.log`.

**Success:** the last line is `PILOT DONE …`; earlier you see `Verdict H0: **holds**` and
`P0 DONE`.

**On abort:**

| Message or symptom | Meaning | What to do |
|---|---|---|
| Terminal closed, Mac slept, power cut, Ctrl-C | run interrupted | run the same command again; it resumes |
| `STOP: … has SHA …` | generator output differs from the pre-registration | stop, send the log tail to the pool; do not edit the SHA |
| `STOP: H0 does not hold on dev` | instrument check failed; by the pre-registration no model run counts | step 5 anyway (push P0 data without the pilot), report to the pool |
| `No label tokens for …` or `contradicts the frozen label tokens` | config and model id do not match | report to the pool |
| `Cannot resume: "…" differs from the original run` | something changed between segments (Node version, file) | report to the pool; do not delete directories |
| error from `analyze.py` | analysis bug, not a data problem | step 5 (push what exists), report to the pool |
| model load error, `ENOSPC`, killed process | RAM or disk too small (A2, A3) | free disk or report; run again after fixing |
| `git commit` fails in the pre-commit hook | formatter or lint failed on data files | send the hook output to the pool |

Do not delete or edit anything under `docs/measurements/`: every file there is raw data.

## Step 5: commit and push the data (3 min)

P0 is already committed (and pushed if the keychain allowed it). Commit the pilot:

```bash
cd ~/EuConform
git status --short
git add docs/measurements/2026-11-paired-eval/pilot
git commit -m "chore(paired-eval): add pilot runs for Qwen3-1.7B and Llama-3.2-1B"
git log -3 --format='%h %an %s'
git log -3 --format=%B | grep -iE "co-authored|claude|generated with" && echo "STOP: remove the trailer before pushing" || echo "no attribution: ok"
git push
gh pr create --title "chore(paired-eval): P0 and pilot measurements" \
  --body "Stage 2 data and pilot runs for Qwen3-1.7B and Llama-3.2-1B. No hypothesis tests yet."
```

**Commit rules:** plain English message, no `Co-Authored-By` or any AI trailer; the
pre-commit hook may reformat `run.json` and `manifest.json`, that is expected. `scores.jsonl` and
`items.jsonl` are never reformatted.
**Success:** `git push` ends with `measurement/paired-eval-2026-11 -> measurement/paired-eval-2026-11`, and the new PR lists the P0 and pilot commits.
After the push the pool checks `thinking_mode` and `template` in every `run.json`, runs the
analysis and the power simulation (AP7) and fills stage 3.

## Step 6: AP-R remeasurement (5 min active, 30–60 min wall)

Runs after step 5 so the two measurements do not compete for CPU.

```bash
cd ~/EuConform
git status --porcelain | grep -v '^??' && echo "STOP: commit step 5 first" || echo "clean: ok"
git switch chore/remeasure-length-logp && git pull --ff-only
pnpm install --frozen-lockfile
ollama pull qwen2.5:0.5b
node scripts/remeasure-length-logp/run.mjs --dry-run
caffeinate -i node scripts/remeasure-length-logp/run.mjs 2>&1 | tee ~/euconform-apr.log
ls docs/measurements/2026-11-length-logp/
git add docs/measurements/2026-11-length-logp
git commit -m "chore(measurement): add sentence-length logP remeasurement results"
git push
git switch measurement/paired-eval-2026-11
pnpm install --frozen-lockfile
```

**Durations (estimated):** `ollama pull` 1–3 min, Qwen2.5-0.5B is cached from step 3 only if
the same `@huggingface/transformers` copy is used (else 2 GB again, 5–15 min), 200 sentences
through three paths 10–30 min.
**Success:** the folder lists `sentences.csv`, `results.csv`, `run.json`, `summary.md`.
**On abort:** if a branch fails technically (for example Ollama returns no logprobs),
`summary.md` says so and there is no substitute number; that is a valid result, commit it. If the
script itself crashes, send `~/euconform-apr.log` to the pool. The comment correction in
`ollama-client.ts` (AP-R criterion 3) is done by the pool, not here.

## Step 7: report back (1 min)

One line to the pool: "pushed" with the time, or the step number and the last 30 lines of the
log. Everything else is in the commits.
