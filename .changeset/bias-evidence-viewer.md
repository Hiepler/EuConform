---
"@euconform/core": minor
---

Browser-safe evidence entrypoint and bias evidence viewer.

- New `@euconform/core/evidence/browser` export with the pure parts of the evidence layer (statistics, run comparison, Markdown rendering, semantic checks) — no Node builtins, so it can be bundled for the web app.
- The `euconform.bias.v2` semantic validation now lives in its own module and is shared by the Node validator and the browser, so "do the stored numbers follow from `pairResults`?" still has exactly one implementation.
- The web app gained a Bias Evidence page (`/bias`) that imports one or two `euconform.bias.json` artifacts, validates them locally, and shows the report or a full run comparison (deltas, per-bias-type shifts, McNemar exact test). Bias measurement itself stays in the CLI.
