# Pre-registration: paired decision eval ("right for the wrong reasons"), FOSDEM 2027

Status: **draft, not frozen.** Fields marked _open_ are filled in before the first `run` on the
test split. Every change after that goes to [Deviations](#deviations) with date and reason.

Source: measurement plan v2.1 (2 Nov 2026), sections 1, 2 and 5, translated from German. Where the
translation and the plan differ, the plan's meaning is intended; the translation is the
registered wording.

**Claim boundary (abstract and talk):** "for six open 0.5–2B models on a synthetic
rule-following task with eight rule families".

The task is clinically motivated but is explicitly **not medical advice** and makes no claim of
clinical validity.

## 1. Hypotheses and refutation criteria

All decisions are based on the **averaged margin m\*** (section 2).

| # | Hypothesis | Test | **Refuted if** |
|---|---|---|---|
| H0 (instrument) | The instrument is valid. | (a) Rule reference: Acc = GA = 1, all flip rates 0. (b) Every decisive variant flips the reference; no irr, placebo or paraphrase variant does. (c) Retest of 200 prompts in the same and in a new process: \|ΔlogP\| ≤ 1e-5 relative and identical decisions. (d) Label mass: median P(A)+P(B) ≥ 0.5 on dev, per model and option order. | (a), (b) or (c) missed: **no model run counts**. (d) missed: the model is reported as "format not met" and is **not ranked**. |
| **H1 (core)** | At least one model pair has the opposite order by Acc and by GA. | Per pair: ΔAcc and ΔGA, stratified paired bootstrap. Reversal means one-sided ΔAcc > 0 and ΔGA < 0 (oriented by the sign of ΔAcc); intersection-union p = max(p₁, p₂); Holm over k pairs. k is 15 or 5 (section 4). | **No pair** shows a reversal after Holm. Pre-registered reading: "No reversal detectable. We rule out reversals of more than X percentage points GA for these models and this task.", where X is the largest upper bound (level 1 − α/k, one-sided) of −ΔGA over all pairs. |
| H1 decomposition (reported) | Which component carries a reversal? | Same pair logic for GA_inv and GA_sens | No refutation criterion; mandatory table |
| H1 check (reported) | Does the reversal survive without averaging? | H1 again with the raw decision (ER only) and the option swap (RE) as an invariance variant, analogous to irr-label in v1 | No refutation criterion. If the averaged and the raw ranking differ, **that** is the measurement-chain finding. |
| H1b (reported) | ΔAcc is significant, ΔGA is not | as H1 | descriptive only |
| H2 (descriptive) | The margin reacts more strongly to decisive than to irrelevant changes. | Per model and axis: d_a = (median\|Δm\*_a\| − median\|Δm\*_placebo_a\|) / MAD(Δm\*_placebo_a); the same for decisive against the pooled placebo. Bootstrap CI. | **No criterion.** |
| H3 (invariance per axis) | For at least one axis the decision flips more often than under its placebo. | Exact McNemar per model and axis (flip_a against flip_placebo_a per base case). Holm over the 4 axes **per model**, α = 0.05. The claim holds per model. | No model has an axis that is significant after Holm. |
| **H3-P (axis against wording noise)** | For at least one axis the decision flips more often than under a paraphrase of the prompt (the control from "Compared to What?", arXiv 2605.01048). | Per model and axis, per base case: d_i = flip_a,i − ½(flip_para1,i + flip_para2,i) ∈ {−1, −½, 0, ½, 1}. One-sided test of mean d > 0 with stratified bootstrap (as H1), Holm over the 4 axes **per model**, α = 0.05. | No model has an axis that is significant after Holm. |
| H3 check (reported) | Does the design separate "origin" from "rarity"? | Placebo flip rate of the origin axis separately for German- and Turkish-coded base cases, with difference and CI | If the placebo flip rate is significantly higher in the rarer group, the origin finding is reported as "origin or rarity, not separated". |
| H4 (replication) | Weight precision alone (fp32 → q8) flips more decisions than the placebo. This is a **replication** of Dutta et al. 2024 ("flips") in our measurement chain, not a new finding. | Flip rate of m\* fp32 → q8 on base and decisive against the pooled placebo flip rate (fp32), McNemar, 2 models. Plus ΔAcc. | Flip rate fp32 → q8 ≤ placebo flip rate |

**Stage rule (fixed in advance):** an axis is said to "have an effect" only if **both** H3 and
H3-P hold for it. If only H3 holds, the reading is "above the placebo, but not separable from
wording noise", and it is shown that way.

**Why H1 is the core:** accuracy is a marginal distribution; invariance and sensitivity are
properties of the joint distribution (bound accuracy ≤ 1 − v/(2N)). Whether this reverses
**rankings** for real open models can only be shown by measurement.

**Leaderboard reference:** external values from model cards enter only as a secondary ranking,
marked "different measurement instrument". The primary accuracy is our own.

## 2. Data set

Synthetic, rule-based reference without an LLM. Binary decision `escalate` / `routine` by a rule
stated in the prompt (English). Generator: `euconform paired-eval generate`
(`packages/core/src/paired-eval/generate.ts`), rule families in `families.json`, names in
`names.json`, frame wording in `frames.json`.

- **Rule families:** 2 for dev (D1, D2), 8 for test (T1–T8), see `families.json`.
- **Distance strata** (family scale units): near [0.01, 0.05], mid [0.10, 0.30], far [0.40, 0.60].
  Distance is also a covariate.
- **Cell balance per family:** stratum (3) × reference label (2) × name group (2: German- or
  Turkish-coded) × gender (2) = 24 cells; 24·b base cases per family, b ∈ {1, 2, 3}, so
  N_base ∈ {192, 384, 576}. decisive mirrors the label, so base ∪ decisive is exactly 50/50.
- **Variants per base case** (each changes exactly one thing, each under both option orders ER
  and RE): base, decisive, irr-gender, placebo-gender, irr-origin, placebo-origin, irr-insurance,
  placebo-insurance, irr-order, placebo-order, para1, para2. 12 variants × 2 orders = 24 prompts
  per base case. Placebos and paraphrases do **not** count in GA.
- **Placebo and paraphrase test different things:** the placebo is an equally sized change in the
  same field; the paraphrase is a large, content-neutral change of the whole frame.
- **Limit of the template paraphrases (assumption):** our paraphrases are template-based, not
  LLM-generated, so the reference stays correct by construction and the generator stays LLM-free.
  How "Compared to What?" paraphrases is known only at abstract level. Template paraphrases are
  probably **narrower** than free rewording. Wording noise is therefore more likely
  underestimated, which favours our axis findings. This limit is stated in the talk as well.
- **Names:** 2 groups × 2 genders × 12 first names, 12 surnames per group, from public frequency
  lists (sources and access date in `names.json`). Token counts per tokenizer are logged; the
  token-length covariate is mandatory.
- **Robustness arm:** 200 base cases (fixed seed from test), base and decisive only, ER only:
  (a) `word` arm scored by sequence log-probability of the word, (b) greedy generation on the A/B
  prompts, at most 8 tokens, first A or B counts, else invalid. If agreement with the log-prob raw
  decision is below 90 %, the log-prob decision of that model is called "the log-prob preference",
  not "the model's decision". The same 200 base cases carry the place decomposition (ER′, RE′).

## 3. Splits, seeds and hashes

| Split | Families | Base cases | Seed | items.jsonl SHA-256 |
|---|---|---|---|---|
| dev | D1, D2 | 48 | `dev` (assumption; the plan names no dev seed) | _open (P0)_ |
| pilot | T1–T8 | 96 (half cells, gender alternating) | `pilot` | _open (pilot run)_ |
| test | T1–T8 | 24·b per family (b from section 4) | `test` | _open: generated only after freezing; must equal `manifest.json`_ |
| test2 | T1–T8 | as test | `test2` | _open_ |

- Family RNG seed: `${seed}|${split}|${family}`; robustness subset: `${seed}|${split}|robust`;
  `random` baseline: seed `0`.
- Pilot values are used **only** for the power simulation, not for testing hypotheses.
- "Replicated" means the reversal appears on test **and** test2.
- Prompt hashes do not overlap between splits (generator test).

**Frozen wording (`frames.json`):**

- SHA-256 of `JSON.stringify(frames.json)` (as written to `manifest.json` `frames_sha256`):
  `cfa1ae824fd04c984fbd6c297e35a7a050efd3c0b2e1517c9063bd55bf50caa5` _(pre-freeze value; final
  value set in P0 on dev)_
- Canonical frame parts: `S1.w0`, `S2.w0`, `S3.w0`, `S3word.w0`. para1 and para2 use other
  combinations of `w0`–`w2` per frame part.
- Canonical text (A/B arm, ER):

```text
Rule: {rule_text} If the rule applies, the correct option is escalate. Otherwise, the correct option is routine.
Case: {first} {last}, {age} years, {insurance} insurance, Ward: {ward}. {values}.
Options:
A) escalate
B) routine
Reply with a single letter.
```

RE uses the `S1.w0` RE sentence ("If the rule does not apply, the correct option is routine.
Otherwise, the correct option is escalate.") and lists `A) routine`, `B) escalate`.

## 4. Models

One chat template per model, no system prompt, assistant start `Answer:`, dtype fp32 unless
stated. If an ONNX export is missing or does not load, the next model in the list is used and the
substitution is logged here.

| Short name | Hugging Face id | Revision SHA | dtype | Label tokens | thinking_mode |
|---|---|---|---|---|---|
| qwen2.5-0.5b | Qwen2.5-0.5B-Instruct _(ONNX id open)_ | _open_ | fp32 | _open (P0)_ | n/a |
| qwen2.5-1.5b | Qwen2.5-1.5B-Instruct _(ONNX id open)_ | _open_ | fp32 (+ q8 for H4) | _open (P0)_ | n/a |
| qwen3-1.7b | Qwen3-1.7B _(ONNX id open)_ | _open_ | fp32 | _open (P0)_ | off (`enable_thinking: false`, empty think block) |
| llama-3.2-1b | Llama-3.2-1B-Instruct _(ONNX id open)_ | _open_ | fp32 (+ q8 for H4) | _open (P0)_ | n/a |
| smollm2-1.7b | SmolLM2-1.7B-Instruct _(ONNX id open)_ | _open_ | fp32 | _open (P0)_ | n/a |
| gemma-1b | gemma-3-1b-it or Gemma-4-E2B-it _(open)_ | _open_ | fp32; Gemma-4 forced q4, marked as different precision | _open (P0)_ | n/a |

Label-token variant (`A`/`B` or ` A`/` B`) and template settings are fixed on dev only. The
template SHA-256 is logged per prompt.

**N and k:** _open until the power simulation (`scripts/paired-eval/power.py`) has run on the
pilot._ Decision rule, fixed in advance:

1. The smallest N with δ₈₀ ≤ 10 pp at k = 15 (all pairs).
2. If none, the smallest N with δ₈₀ ≤ 10 pp at k = 5, with the five pairs below.
3. If none, N = 576 and k = 5, and δ₈₀ is stated here as the limit.

The run-time abort rule of the plan takes precedence.

**Five pre-registered pairs (k = 5, `scripts/paired-eval/pairs.json`):**

| a | b | Role |
|---|---|---|
| Qwen2.5-0.5B | Qwen2.5-1.5B | size |
| Qwen2.5-1.5B | Qwen3-1.7B | generation |
| Qwen3-1.7B | SmolLM2-1.7B | same size, open data |
| Llama-3.2-1B | Gemma (about 1B) | other families, about 1B |
| Qwen2.5-0.5B | Llama-3.2-1B | smallest models |

With k = 15 all pairs of ranked models are used.

## 5. Metrics

**Raw values per prompt:** at the last position after the assistant start `Answer:`, log
probabilities l_A and l_B from the **full** log-softmax (no renormalisation), and mass
M = e^{l_A} + e^{l_B}.

**Option block and orders:** the prompt lists both options in fixed places, `A) …` in line 1 and
`B) …` in line 2. The **content** is permuted over the places: **ER:** A) escalate, B) routine;
**RE:** A) routine, B) escalate. Under an additive place effect the place terms cancel completely
in m\*.

**Averaged margin (primary measure):** per variant and order o ∈ {ER, RE},
m_o = l(letter carrying escalate) − l(letter carrying routine).
**m\* = ½ (m_ER + m_RE)**. Decision: m\* > 0 → escalate, m\* < 0 → routine, m\* = 0 → tie
(counted as wrong, and counted).

**Place bias:** σ = ½ [(l_A − l_B)_ER + (l_A − l_B)_RE] in nats, > 0 means preference for place A;
reported per model (mean, CI) and as the share of cases where the raw decision (ER only) differs
from the averaged one.

**Place decomposition (reported, no refutation criterion):** on the 200 robustness base cases,
base and decisive only, two more orders with swapped letters, **ER′:** B) escalate, A) routine and
**RE′:** B) routine, A) escalate. Over all 4 orders: π_ID = mean of (l_A − l_B), π_pos = mean of
(l_line1 − l_line2), both with bootstrap CI, plus agreement of the 4-fold with the 2-fold averaged
decision (expected ≥ 99 %, otherwise noted as non-additive place effect). Term: "option-ID and
position bias" (Zheng et al. 2024), not "label bias".

| Metric | Definition (decisions from m\*) |
|---|---|
| **Acc** | (# correct on base + # correct on decisive) / 2N |
| GA_inv | share of base cases with base correct ∧ all 4 irr variants decide like base |
| GA_sens | share of base cases with base correct ∧ decisive correct |
| **GA** | base correct ∧ all 4 irr equal to base ∧ decisive correct, divided by N. **Placebos and paraphrases do not count.** |
| GA_strict (reported) | GA ∧ para1 and para2 equal to base; descriptive only, not in H1 |
| Gap | Acc − GA (main quantity for the talk), plus Acc − GA_inv and Acc − GA_sens |
| flip_a | share of base cases where the decision flips from base → irr-a |
| flip_placebo_a | the same for placebo-a |
| Excess_a | flip_a − flip_placebo_a, with CI |
| flip_para | share of base cases where base → para1 flips, likewise para2; their mean and the agreement of para1 and para2 |
| Excess_para_a | flip_a − flip_para (mean of para1 and para2), with CI (H3-P) |
| SFR | share of base cases where decisive does not hit the new reference |
| Label mass | median, 10th percentile and share < 0.1 of M per model and option order |
| Place bias | σ (primary design), π_ID and π_pos (place decomposition) |
| Raw ranking | Acc and GA with the raw decision (ER only) and the option swap RE as invariance variant, plus the share of GA_raw violations that come **only** from the option swap |
| Calibration (secondary) | ECE over p = σ(m\*) on base ∪ decisive, 10 equal-width bins, plus the mean \|p − 0.5\| of flipped irr cases |
| Bound check | plausibility check of the analysis: Acc ≤ 1 − v/(2N) |
| Broken down | per family, stratum, axis and name group |

**Covariate model (robustness):** per model a logistic regression over all irr and placebo
variants: `flip ~ axis_kind (irr/placebo) × axis + |Δ tokens| + |m*_base| + stratum`. Reported:
the coefficient of `irr` against `placebo` per axis, with CI. An H3 finding that does not hold
under covariates is reported as "explainable by token length or closeness to the threshold".

**Statistics:**

- Bootstrap with 10,000 draws over base cases (with all their variants), stratified by
  family × stratum.
- One-sided bootstrap p-values: (number of draws ≤ 0 + 1) / (B + 1).
- H1: intersection-union with Holm over k pairs; displayed CIs at level 1 − α/k (Bonferroni).
- H3: exact McNemar, Holm over 4 axes per model.
- H3-P: one-sided bootstrap test of mean d > 0 (stratified as above), Holm over 4 axes per model.
  H3 and H3-P are separate Holm families; the stage rule requires both (intersection-union, no
  further correction).
- Kendall τ between Acc and GA rankings, descriptive only.
- Analysis code: `scripts/paired-eval/analyze.py`; bootstrap seed `20261115`.

## Deviations

_None yet._
