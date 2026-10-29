# External Observation v1 (`euconform.external-observation.v1`)

The external observation envelope records **what an external provider saw** on a
source at a specific point in time: whether a supported machine-readable declaration
(rights, AI use, licence metadata, robots policy) was visible, and what it said.

It exists because structural evidence (`scan`) and behavioural evidence (`bias`) are
things EuConform produces itself, while rights observations come from a third party.
Putting them in the same artifact would blur who claims what. This document keeps
that boundary explicit and lets any provider fill it — it is not tied to one vendor.

## What this document is

- a time-stamped, hash-anchored **observation** of a declaration on a subject
- provider-neutral: the provider is identified, but identification does not change
  the meaning of the result
- verifiable by a third party in the narrow sense that the raw declaration text and
  its SHA-256 are carried along

## What this document is not

> [!IMPORTANT]
> An external observation is **not** a licence, **not** an ownership determination,
> **not** proof of use, and **not** permission. Absence of a declaration
> (`not-declared` / `unknown`) must never be read as permission.

The envelope has no field that could express permission, exactly so this mistake
cannot be made by accident. EuConform neither fetches nor adjudicates the
observation; it validates the shape and leaves interpretation to the consumer.

## Shape

```json
{
  "schemaVersion": "euconform.external-observation.v1",
  "observationId": "obs_01J9Z6K3Q8",
  "observedAt": "2026-10-29T12:00:00Z",
  "provider": {
    "name": "example-rights-observer",
    "version": "1.0.0",
    "endpoint": "https://api.example.com/v1/rights/preflight",
    "contact": "https://example.com/contact"
  },
  "subject": {
    "kind": "url",
    "identifier": "https://example.com/dataset",
    "retrievedAt": "2026-10-29T11:59:41Z",
    "contentSha256": "4f1c…"
  },
  "observation": {
    "kind": "rights-declaration",
    "intendedUse": ["ai-input", "ai-train"],
    "result": "declared",
    "declaration": {
      "text": "AI training permitted for non-commercial research only.",
      "sha256": "9ab3…",
      "url": "https://example.com/dataset/terms",
      "license": "CC-BY-NC-4.0"
    }
  },
  "limitations": [
    "Coverage limited to reviewed origins.",
    "Declarations can change after observedAt; re-observe before relying on this."
  ],
  "signature": {
    "algorithm": "ed25519",
    "keyId": "provider-2026-01",
    "value": "base64…",
    "signedPayloadSha256": "c07d…",
    "verifyUrl": "https://api.example.com/keys/provider-2026-01"
  }
}
```

## Fields

| Field | Required | Notes |
|-------|----------|-------|
| `observationId` | yes | Provider-scoped unique id, so the record can be cited and re-fetched |
| `observedAt` | yes | When the provider observed the declaration, not when the artifact was exported |
| `provider.name` / `provider.version` | yes | Who produced the observation, and under which API/format version |
| `provider.endpoint` / `provider.contact` | no | How to reach the provider or re-run the query |
| `subject.kind` | yes | `url`, `repository`, `dataset` or `artifact` |
| `subject.identifier` | yes | What was observed |
| `subject.retrievedAt` | yes | When the subject content was fetched; together with `observedAt` this bounds validity |
| `subject.contentSha256` | no | Hash of the observed content, so a third party can check that the same bytes were seen |
| `observation.kind` | yes | `rights-declaration`, `ai-use-declaration`, `license-metadata`, `robots-policy` or `terms-of-service` |
| `observation.intendedUse` | yes | What the declaration was queried about, in the provider's own vocabulary (e.g. `ai-input`, `ai-train`). Free-form on purpose — no shared vocabulary exists yet |
| `observation.result` | yes | `declared`, `not-declared`, `unknown` or `not-applicable` — see below |
| `observation.declaration` | when `declared` | The declaration as observed: `text` + `sha256` are required, `url`/`license` optional |
| `limitations` | yes, ≥ 1 | Mandatory coverage limits; an observation without stated limits is not reviewable |
| `signature` | no | `algorithm`, `keyId`, `value`, `signedPayloadSha256`, optional `verifyUrl` |

## Semantics of `result`

| Value | Meaning | What it does **not** mean |
|-------|---------|---------------------------|
| `declared` | A supported machine-readable declaration was visible at `observedAt`, and `declaration.text` is it | that the intended use is permitted |
| `not-declared` | No such declaration was visible | that the use is forbidden — or allowed |
| `unknown` | The provider could not determine anything (e.g. unreachable, unsupported format, outside coverage) | anything about permission |
| `not-applicable` | The question does not apply to this subject | anything about permission |

`unknown` must never be converted into a positive result. A consumer that needs a
decision has to make it explicitly and cite the observation as one input.

## Signatures

An unsigned observation is still valid evidence, but a consumer must treat it as
**unverified**. When `signature` is present, `signedPayloadSha256` names the exact
payload the provider signed, so integrity can be checked independently of the
provider's API. EuConform does not verify signatures itself — it validates shape and
preserves the proof material.

## Relationship to the other document types

| Document | Producer | Question answered |
|----------|----------|-------------------|
| `euconform.report.v1` | EuConform `scan` | What is in this repository, and what does it imply for AI Act obligations? |
| `euconform.aibom.v1(.1)` | EuConform `scan` / `import` | Which AI components does the system consist of? |
| `euconform.bias.v2` | EuConform `bias` | How does this model score stereotypical vs. anti-stereotypical sentences? |
| `euconform.external-observation.v1` | an external provider | What declaration was visible on this source at this time? |

External observations are **standalone**. They are not part of the bundle artifact
roles in `euconform.bundle.v1`; including them in bundles would require a new bundle
revision and a decision about what "required" means for third-party evidence.

## Validation

```bash
euconform validate ./observation.json
```

Validation is schema-only: shape, required fields, enums, SHA-256 patterns, and the
rule that `result: "declared"` must carry the declaration it refers to. There are no
numbers to recompute — an observation asserts a fact about the world, which EuConform
cannot reconstruct from the artifact.

## Versioning

`schemaVersion` is the compatibility boundary. Adding a field means a new schema
revision (`external-observation-v1.1`) because schemas use
`additionalProperties: false`; changing semantics of `result` requires
`euconform.external-observation.v2`.
