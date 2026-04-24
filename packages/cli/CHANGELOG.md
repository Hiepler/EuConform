# @euconform/cli

## 1.2.0

### Minor Changes

- 0f6c07d: Add schema validation, CycloneDX SBOM import, and AI BOM v1.1 schema revision

  - Introduce `euconform.aibom.v1.1` schema with optional import provenance metadata
  - Add `validate` command for checking EuConform JSON documents against published schemas
  - Add `import` command for mapping CycloneDX JSON SBOMs into the EuConform AI BOM layer
  - Add PURL parser with graceful handling of malformed percent-encoding
  - Remove `validate` and `importCycloneDx` from core barrel export (available via `@euconform/core/validation` and `@euconform/core/sbom` subpath exports)

### Patch Changes

- Updated dependencies [0f6c07d]
  - @euconform/core@1.5.0

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
