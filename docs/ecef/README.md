# EuConform Evidence Format (ECEF)

The **EuConform Evidence Format (ECEF)** is the open specification behind the scanner artifacts produced by EuConform.

ECEF Stage 1 stabilizes three document types:

| Document | Purpose |
|----------|---------|
| `euconform.report.v1` | Compliance-oriented evidence, open questions, gaps, and recommendations |
| `euconform.aibom.v1` | AI Bill of Materials (AI BOM) inventory for runtimes, providers, models, and supporting components |
| `euconform.ci.v1` | CI gate status, fail threshold, gap counts, and top findings |

## Positioning

- ECEF is currently documented as an **open specification**
- `AI BOM` is a **sub-specification** inside ECEF, not the umbrella name
- Stage 1 is intentionally focused on the document types that EuConform already produces and consumes

## Versioning and compatibility

- `schemaVersion` is the compatibility boundary for every document
- Schemas enforce `additionalProperties: false` — all fields must be explicitly defined
- Patch releases must not change document shape
- Adding new optional fields requires a new schema revision (e.g. `report-v1.1.schema.json`) because strict schemas reject unknown properties
- Major schema changes must use a new `schemaVersion` (e.g. `euconform.report.v2`)

## Stage 1 schemas

- [Report schema](./schemas/report-v1.schema.json)
- [AI BOM schema](./schemas/aibom-v1.schema.json)
- [CI schema](./schemas/ci-v1.schema.json)

## Stage 1 examples

- [Web app example](./examples/web-app/)
- [Local Ollama example](./examples/local-ollama/)
- [RAG example](./examples/rag/)
- [Non-AI example](./examples/non-ai/)

## Document guides

- [Report v1 guide](./report-v1.md)
- [AI BOM v1 guide](./aibom-v1.md)
- [CI v1 guide](./ci-v1.md)

## Reserved future document types

ECEF Stage 2 will introduce `euconform.bundle.v1` as a manifest document.

The current design decision for `bundle.v1` is already fixed:

- it references artifacts instead of embedding them
- it carries SHA-256 hashes for referenced artifacts
- it only references same-major ECEF documents in v1
- `eval` is reserved as a future document type for evaluation results and benchmark outputs — third-party extensions should not claim this namespace
