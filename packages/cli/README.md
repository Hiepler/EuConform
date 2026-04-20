# `@euconform/cli`

`@euconform/cli` is the command-line interface for **EuConform**, an offline-first evidence engine for European AI systems.

It scans real project directories, runs reproducible local bias evaluation against Ollama models, validates and verifies machine-readable evidence, and can import external CycloneDX SBOMs into the EuConform AI BOM layer.

The CLI is also the first public producer and consumer of the **EuConform Evidence Format**.

## What it does

- `scan` inspects a codebase and generates structured evidence artifacts
- `bias` runs a reproducible local CrowS-Pairs evaluation against an Ollama model — EuConform's distinctive empirical layer
- `validate` checks EuConform JSON files against the published schemas
- `verify` validates an EuConform Evidence Format bundle manifest, directory, or ZIP archive
- `import` maps a CycloneDX JSON SBOM into `euconform.aibom.v1` as an interoperability bridge
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

## Command Overview

| Command | Input | Output | Primary use case |
|---------|-------|--------|------------------|
| `scan <path>` | Repository directory | EuConform artifact set in `.euconform/` | Native evidence generation from source code |
| `bias <model>` | Ollama model name | Bias report JSON and/or Markdown | Reproducible local model evaluation — EuConform's distinctive empirical layer |
| `validate <path>` | EuConform JSON file or directory | Valid/invalid status per file | Schema checks in CI, review, or local QA |
| `verify <path>` | Bundle manifest, extracted bundle dir, or ZIP | Integrity status | Artifact exchange and transport verification |
| `import <path>` | CycloneDX JSON SBOM | `euconform.aibom.json` | Interoperability bridge from external SBOM ecosystems |

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

### `euconform validate <path>`

Validates EuConform JSON files against the published schemas.

Accepted inputs:
- a single `.json` file
- a directory containing files named like `euconform.*.json`

Example:

```bash
euconform validate .euconform
```

Machine-readable output:

```bash
euconform validate .euconform --json
```

Exit codes:
- `0` all matched files are valid
- `1` one or more files failed schema validation
- `2` no matching EuConform JSON files were found

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

### `euconform bias <model>`

Runs a reproducible CrowS-Pairs bias evaluation against a local Ollama model.

This is EuConform's distinctive empirical layer — no other open-source compliance tool currently offers reproducible, offline model-behavior evaluation for AI Act documentation.

Example:

```bash
euconform bias llama3.2 --lang de --output all
```

What it does:
- evaluates model bias locally via CrowS-Pairs methodology with log-probability or latency fallback
- produces structured bias reports as JSON and/or Markdown
- runs completely offline against any Ollama-compatible model
- supports German and English evaluation datasets

Typical use:
- Art. 10 bias/fairness documentation with empirical evidence
- reproducible evaluation before and after model updates
- behavioral evidence layer on top of structural evidence from `scan`

### `euconform import <path>`

Imports a CycloneDX JSON SBOM and writes an EuConform AI BOM.

Example:

```bash
euconform import third-party.cdx.json --scope production
```

What it does:
- accepts CycloneDX JSON as input
- maps AI-relevant components into `euconform.aibom.v1`
- writes `euconform.aibom.json` to `.euconform/` by default
- excludes `optional` and `excluded` components when `--scope production` is used
- can derive the project name from BOM metadata or the source filename
- keeps `complianceCapabilities` conservative instead of inferring them from the SBOM

Machine-readable output:

```bash
euconform import third-party.cdx.json --scope production --json
```

## Interoperability Workflow

When you already have a third-party SBOM and want to bring it into the EuConform workflow:

```bash
euconform import third-party.cdx.json --scope production
euconform validate .euconform/euconform.aibom.json
# If you also have a EuConform bundle manifest, directory, or ZIP:
euconform verify path/to/euconform.bundle.json
```

Notes:
- `import` is an interoperability bridge into the current AIBOM layer
- `validate` checks EuConform document shape
- `verify` is only needed when you are working with a bundle manifest, directory, or ZIP archive

## What is the EuConform Evidence Format?

EuConform implements the **EuConform Evidence Format**, an open specification for portable, machine-readable AI compliance evidence.

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
- evaluate model bias locally and reproducibly instead of relying on third-party APIs
- validate inspectable JSON instead of relying on opaque one-off exports
- produce versionable artifacts instead of one-off documents
- verify bundle integrity before evidence is shared
- bridge external SBOM ecosystems into an open AI evidence layer
- keep review portable and inspectable outside one product UI or vendor workflow

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
