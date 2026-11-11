---
"@euconform/core": minor
"@euconform/cli": minor
---

Paired decision eval instrument for "right for the wrong reasons".

Adds a pre-registered measurement instrument that separates accuracy from decision
quality: every base case is paired with decisive, irrelevant, placebo and paraphrase
variants, in both option orders, and the analysis reports whether a decision survives
the changes that should not matter and reacts to the one that should.

- `euconform paired-eval generate|run|baseline` with a shared JSONL data contract
  (`PromptItem`, `ScoreRow`) that the Python analysis reads without a translation layer.
- Next-token label scorer for letters and option words plus a greedy arm, a
  fail-closed resumable runner with full `run.json` provenance, and LLM-free baselines
  (oracle, constant, coarse, random).
- Python analysis with stratified paired bootstrap, exact McNemar and Holm correction,
  plus a power simulation; deterministic for a fixed seed.
- Pre-registration stage 1 is frozen (`docs/prereg/`); stages 2 and 3 are open. No model
  has been measured yet, so this release publishes the instrument, not results.

`run.json` is a versioned research artifact (`euconform.paired-eval.run/v1`), not a
EuConform evidence document and not part of `bundle.v1`.
