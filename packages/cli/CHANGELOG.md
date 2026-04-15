# @euconform/cli

## 1.1.1

### Patch Changes

- Updated dependencies [24bff85]
  - @euconform/core@1.4.0

## 1.1.0

### Minor Changes

- 7b8b23f: Add CrowS-Pairs bias testing to CLI with standalone `euconform bias` command and `euconform scan --bias` integration. CrowS-Pairs datasets moved to core package with `loadCrowsPairsDataset()` loader. CapabilityCache abstraction enables OllamaClient usage in Node.js environments. New `/bias-check` page on documentation site positioning bias testing as key differentiator.

### Patch Changes

- Updated dependencies [7b8b23f]
  - @euconform/core@1.3.0

## 1.0.0

### Major Changes

- caae33d: ECEF Stage 2: Add bundle.v1 manifest with SHA-256 integrity hashes and optional ZIP transport. Add verify command to CLI for manifest, directory, and ZIP validation. First public release of @euconform/cli with scan, verify, and --zip support.

### Patch Changes

- Updated dependencies [caae33d]
  - @euconform/core@1.3.0
