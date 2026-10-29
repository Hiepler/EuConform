---
"@euconform/core": minor
"@euconform/cli": minor
---

Compare two bias runs. The new `euconform compare <baseline> <candidate>` command diffs two `euconform.bias.v2` artifacts: mean-score and preference-quote deltas (with both Wilson intervals), per-bias-type shifts, the largest per-pair changes, and a McNemar exact test over preference flips so a shift is not mistaken for noise.

- Accepts artifact files or the directories a bias run wrote them to.
- Refuses comparisons that do not answer the same question with the same measurement setup (catalogue, scoring method, template strategy); different models/dtypes/library versions are listed as environment differences instead. `--allow-incomparable` writes the report explicitly marked `comparable: false`.
- Emits Markdown by default, JSON via `--output json`; both via `--output all --out-dir`.
