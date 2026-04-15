# @euconform/core

## 1.4.0

### Minor Changes

- 24bff85: Republish bias-testing API on `@euconform/core`. The previous release attempted to bump core to `1.3.0`, but that version had already been published from the ECEF release on April 10 — so the new exports never made it to npm.

  Adds (re-published as `1.4.0`):

  - `./datasets` subpath export with `loadCrowsPairsDataset(language)`
  - `CapabilityCache` interface and `OllamaClient` constructor argument for Node.js environments
  - `sideEffects: false` flag for tree-shakeable browser bundles

## 1.3.0

### Minor Changes

- caae33d: ECEF Stage 2: Add bundle.v1 manifest with SHA-256 integrity hashes and optional ZIP transport. Add verify command to CLI for manifest, directory, and ZIP validation. First public release of @euconform/cli with scan, verify, and --zip support.

## 1.2.0

### Minor Changes

- 50566c7: Add GPAI compliance module (Art. 53-55) with dedicated quiz flow, classifier, and results checklist for Foundation Model providers. Add compliance gap analysis with prioritized action plans for both Annex III and GPAI paths. Fix open-source unsure flag,

## 1.0.1

### Patch Changes

- Add README files for npm package pages with installation instructions, usage examples, and license information.
