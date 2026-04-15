# `euconform.report.v1`

`euconform.report.v1` is the primary compliance evidence document produced by the scanner.

## Purpose

- describe the scanned target and AI footprint
- capture compliance-oriented evidence groups
- record assessment hints, open questions, and scanner-derived gaps
- provide a compact recommendation list for follow-up work

## Required fields

- `schemaVersion`
- `generatedAt`
- `tool`
- `target`
- `aiFootprint`
- `complianceSignals`
- `assessmentHints`
- `gaps`
- `recommendationSummary`

## Compliance signal areas

The `complianceSignals` object contains exactly these seven keys:

- `disclosure` — AI usage disclosure to end users
- `biasTesting` — bias and fairness evaluation infrastructure
- `reportingExports` — structured reporting and export capabilities
- `loggingMonitoring` — logging, audit trails, and monitoring
- `humanOversight` — human review and override mechanisms
- `dataGovernance` — data provenance and quality controls
- `incidentReporting` — incident tracking and reporting

## Notes

- the report is **evidence-oriented**, not a legal verdict
- `assessmentHints.openQuestions` is required because the viewer and downstream tooling rely on it
- `gaps[].basis` is currently fixed to `"scanner-rule"` in v1; Stage 2 may extend this to an enum for human-created or imported gaps

## Example

See [web app example report](./examples/web-app/euconform.report.json).
