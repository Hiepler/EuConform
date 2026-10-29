---
"@euconform/core": minor
"@euconform/cli": minor
---

New evidence document type `euconform.external-observation.v1`.

A provider-neutral envelope for third-party, time-stamped observations of machine-readable declarations (rights, AI use, licence metadata, robots policy). It fills the gap between structural evidence (`scan`) and behavioural evidence (`bias`): external observations come from another party, so they get their own document instead of being mixed into a EuConform artifact.

The envelope records **what was visible, when** — `provider`, `subject` (with retrieval time and optional content hash), `observation.kind`, the provider's query vocabulary, and one of four results: `declared`, `not-declared`, `unknown`, `not-applicable`. It deliberately has no field that could express permission, a `declared` result must carry the observed declaration text plus its SHA-256, and at least one stated limitation is mandatory. `unknown` can never be read as permission.

- `euconform validate` now accepts the new document type (schema-only: there are no numbers to recompute).
- New guide `docs/spec/external-observation-v1.md`, schema `external-observation-v1.schema.json`, and a published example.
- `validateExternalObservation()` and the `ExternalObservation` type are exported from `@euconform/core/evidence`; `validateEcefJsonDocument` dispatches the new version.
- External observations stay standalone: they are not bundle roles in `euconform.bundle.v1`.
