# EuConform Evidence Format (ECEF)

The **EuConform Evidence Format (ECEF)** is the open specification behind the scanner artifacts produced by EuConform.

## Document types

### Stage 1 — Stable

| Document | Purpose |
|----------|---------|
| `euconform.report.v1` | Compliance-oriented evidence, open questions, gaps, and recommendations |
| `euconform.aibom.v1` | AI Bill of Materials (AI BOM) inventory for runtimes, providers, models, and supporting components |
| `euconform.ci.v1` | CI gate status, fail threshold, gap counts, and top findings |

### Stage 2

| Document | Purpose |
|----------|---------|
| `euconform.bundle.v1` | Integrity and transport manifest binding artifacts from a single scan run |

## Positioning

- ECEF is currently documented as an **open specification**
- `AI BOM` is a **sub-specification** inside ECEF, not the umbrella name

## Versioning and compatibility

- `schemaVersion` is the compatibility boundary for every document
- Schemas enforce `additionalProperties: false` — all fields must be explicitly defined
- Patch releases must not change document shape
- Adding new optional fields requires a new schema revision (e.g. `report-v1.1.schema.json`) because strict schemas reject unknown properties
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

## Reserved future document types

- `eval` is reserved for evaluation results and benchmark outputs — third-party extensions should not claim this namespace
