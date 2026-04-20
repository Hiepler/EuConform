# EuConform Evidence Format

EuConform implements the **EuConform Evidence Format**, an open specification for portable, machine-readable AI compliance evidence.

## Document types

### Stage 1 — Stable

| Document | Purpose |
|----------|---------|
| `euconform.report.v1` | Compliance-oriented evidence, open questions, gaps, and recommendations |
| `euconform.aibom.v1` | AI Bill of Materials (AI BOM) inventory for runtimes, providers, models, and supporting components |
| `euconform.ci.v1` | CI gate status, fail threshold, gap counts, and top findings |

### Stage 2 — Available

| Document | Purpose |
|----------|---------|
| `euconform.bundle.v1` | Integrity and transport manifest binding artifacts from a single scan run |

## Positioning

- the format is currently documented as an **open specification**
- `AI BOM` is a **sub-specification** inside the format, not the umbrella name

## Interoperability

EuConform supports native artifact generation, empirical model evaluation, and external ingestion:

- `scan` generates native EuConform artifacts from a repository
- `bias` produces reproducible model-behavior evidence via local CrowS-Pairs evaluation — EuConform's distinctive empirical layer
- `validate` checks EuConform JSON documents against the published schemas
- `verify` checks bundle integrity for manifests, extracted directories, and ZIP archives
- `import` maps external CycloneDX JSON into the current `euconform.aibom.v1` layer as an interoperability bridge

Important boundaries:
- `bias` is independent of `scan` and can be used standalone for model evaluation
- `import` does **not** replace a full native EuConform scan of a repository
- `validate` and `verify` complement each other: schema checks for individual documents, integrity checks for artifact sets

## Versioning and compatibility

- `schemaVersion` is the compatibility boundary for every document
- Schemas enforce `additionalProperties: false` — all fields must be explicitly defined
- Published schema revisions should avoid changing document shape in place
- When new fields affect document shape or compatibility expectations, prefer a new schema revision (e.g. `report-v1.1.schema.json`) because strict schemas reject unknown properties
- Major schema changes must use a new `schemaVersion` (e.g. `euconform.report.v2`)

## Schemas

- [Report schema](./schemas/report-v1.schema.json)
- [AI BOM schema](./schemas/aibom-v1.schema.json)
- [CI schema](./schemas/ci-v1.schema.json)
- [Bundle schema](./schemas/bundle-v1.schema.json)

## Examples

- [Web app example](./examples/web-app/)
- [Local Ollama example](./examples/local-ollama/)
- [RAG example](./examples/rag/)
- [Non-AI example](./examples/non-ai/)

## Document guides

- [Report v1 guide](./report-v1.md)
- [AI BOM v1 guide](./aibom-v1.md)
- [CI v1 guide](./ci-v1.md)
- [Bundle v1 guide](./bundle-v1.md)

## Verification flow

- Build the CLI with `pnpm --filter @euconform/cli build`
- Generate native artifacts with `node packages/cli/dist/index.js scan .`
- Validate EuConform JSON documents with `node packages/cli/dist/index.js validate <path>`
- Optionally import a CycloneDX JSON file with `node packages/cli/dist/index.js import <path>`
- Optionally create a transport archive with `node packages/cli/dist/index.js scan . --zip true`
- Verify a manifest, bundle directory, or ZIP archive with `node packages/cli/dist/index.js verify <path>`
- Hash and metadata mismatches are warnings by default and become errors in strict mode

## Reserved future document types

- `eval` is reserved for evaluation results and benchmark outputs — third-party extensions should not claim this namespace
