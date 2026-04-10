# `euconform.ci.v1`

`euconform.ci.v1` is the CI-facing gate document inside ECEF.

## Purpose

- capture the fail threshold used for a scan
- summarize whether the run is passing or failing
- provide normalized gap counts and top findings
- support GitHub Actions annotations and step summaries

## Required fields

- `schemaVersion`
- `generatedAt`
- `target`
- `status`
- `aiDetected`
- `scanScope`
- `artifacts`
- `complianceOverview`
- `topGaps`

## Notes

- `status.gapCounts` must include `critical`, `high`, `medium`, and `low`
- the CI document is meant for gates and dashboards, not deep evidence review
- top gaps are intentionally compact and should point back to the report for detail

## Example

See [RAG example CI report](./examples/rag/euconform.ci.json).
