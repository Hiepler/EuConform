# `@euconform/cli`

`@euconform/cli` is the command-line interface for **EuConform**, an offline-first evidence engine for European AI systems.

It scans real project directories, produces machine-readable AI Act evidence, and verifies evidence bundles before they are handed to CI, reviewers, auditors, or downstream tools.

The CLI is also the first public producer and consumer of the **EuConform Evidence Format**.

## What it does

- `scan` inspects a codebase and generates structured evidence artifacts
- `verify` validates an EuConform Evidence Format bundle manifest, directory, or ZIP archive
- outputs stay local and can be reviewed in the EuConform web viewer

This package is designed for teams that want **technical evidence for human review**, not automated legal verdicts.

## Install

Run directly with `npx`:

```bash
npx @euconform/cli scan .
```

Or install globally:

```bash
npm install -g @euconform/cli
euconform scan .
```

## Commands

### `euconform scan <path>`

Scans a project directory and writes EuConform Evidence Format artifacts to `.euconform/` by default.

Example:

```bash
euconform scan . --scope production --zip true
```

Typical outputs:

- `euconform.report.json`
- `euconform.aibom.json`
- `euconform.summary.md`
- `euconform.bundle.json`
- `euconform.bundle.zip`

Optional CI mode:

```bash
euconform scan . --ci github --fail-on high
```

### `euconform verify <path>`

Verifies an EuConform Evidence Format bundle in one of three forms:

- `euconform.bundle.json`
- an extracted bundle directory
- `euconform.bundle.zip`

Example:

```bash
euconform verify .euconform/euconform.bundle.json
```

Strict mode:

```bash
euconform verify .euconform/euconform.bundle.json --strict
```

Machine-readable output:

```bash
euconform verify .euconform/euconform.bundle.json --json
```

## What is the EuConform Evidence Format?

The **EuConform Evidence Format** is an open specification for structured, offline AI Act evidence exchange.

Today the CLI works with these document types:

- `euconform.report.v1`
  Compliance evidence, gaps, open questions, and recommendations
- `euconform.aibom.v1`
  The AI inventory layer (`AI BOM`)
- `euconform.ci.v1`
  CI-oriented findings, thresholds, and top gaps
- `euconform.bundle.v1`
  Integrity-aware manifest for transporting and verifying artifact sets

`AI BOM` is **one layer** inside EuConform Evidence Format, not the whole format.

## Why this package exists

Most AI compliance workflows still depend on PDFs, screenshots, checklists, or vendor dashboards.

`@euconform/cli` takes a different approach:

- scan implementation evidence instead of asking only questionnaires
- produce versionable artifacts instead of one-off documents
- verify bundle integrity before evidence is shared
- keep outputs portable and inspectable outside one product UI

## Scope

EuConform does **not** claim to automate legal judgment.

The CLI produces:

- technical evidence
- implementation signals
- open questions
- artifact bundles for human review

It is best understood as **evidence infrastructure for AI Act workflows**, especially for local, privacy-sensitive, or developer-native AI systems.

## Links

- Repository: [github.com/Hiepler/EuConform](https://github.com/Hiepler/EuConform)
- EuConform Evidence Format specification: [docs/spec/README.md](https://github.com/Hiepler/EuConform/blob/main/docs/spec/README.md)
- Web viewer and docs app: [apps/docs](https://github.com/Hiepler/EuConform/tree/main/apps/docs)

## License

Dual-licensed under:

- [MIT](https://github.com/Hiepler/EuConform/blob/main/LICENSE)
- [EUPL-1.2](https://github.com/Hiepler/EuConform/blob/main/LICENSE-EUPL)
