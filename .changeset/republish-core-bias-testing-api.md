---
"@euconform/core": minor
---

Republish bias-testing API on `@euconform/core`. The previous release attempted to bump core to `1.3.0`, but that version had already been published from the ECEF release on April 10 — so the new exports never made it to npm.

Adds (re-published as `1.4.0`):

- `./datasets` subpath export with `loadCrowsPairsDataset(language)`
- `CapabilityCache` interface and `OllamaClient` constructor argument for Node.js environments
- `sideEffects: false` flag for tree-shakeable browser bundles
