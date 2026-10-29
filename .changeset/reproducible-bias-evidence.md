---
"@euconform/core": minor
"@euconform/cli": minor
---

Reproducible bias evidence. Bias measurements now produce the self-checkable `euconform.bias.v2` format: every run records catalog provenance, per-pair results, real scoring provenance (engine, weight dtype, output dtype, pinned model revision) and statistics that can be re-verified from the artifact itself.

- `euconform bias` accepts `--dataset` for user-supplied question catalogs and `--require-exact` to abort instead of falling back when the exact measurement method is unavailable.
- `--engine` is now an explicit contract; the Ollama path and `scan --bias` are disabled because they could not produce real log-probability scores.
- Migrated local inference to `@huggingface/transformers` 4.2.0 and added template-mode sentence log-probability scoring keyed on the tokenizer chat template, not the architecture name.
- Failed measurements are reported as unverified capability entries instead of fabricated results.
