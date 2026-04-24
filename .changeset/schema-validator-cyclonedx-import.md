---
"@euconform/core": minor
"@euconform/cli": minor
---

Add schema validation, CycloneDX SBOM import, and AI BOM v1.1 schema revision

- Introduce `euconform.aibom.v1.1` schema with optional import provenance metadata
- Add `validate` command for checking EuConform JSON documents against published schemas
- Add `import` command for mapping CycloneDX JSON SBOMs into the EuConform AI BOM layer
- Add PURL parser with graceful handling of malformed percent-encoding
- Remove `validate` and `importCycloneDx` from core barrel export (available via `@euconform/core/validation` and `@euconform/core/sbom` subpath exports)
