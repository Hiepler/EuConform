<h1 align="center">EuConform</h1>

<p align="center">
  <strong>🇪🇺 Open-Source Evidence Toolkit For AI Compliance</strong>
</p>

<p align="center">
  Open evidence format • Local bias evaluation • Schema validation • CycloneDX interoperability<br>
  <em>Offline-first • Privacy-preserving • Reusable artifacts • WCAG 2.2 AA accessible</em>
</p>

<p align="center">

  <a href="https://github.com/Hiepler/EuConform/actions/workflows/ci.yml">
    <img src="https://github.com/Hiepler/EuConform/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://codecov.io/gh/Hiepler/EuConform">
    <img src="https://codecov.io/gh/Hiepler/EuConform/branch/main/graph/badge.svg" alt="Coverage">
  </a>
  <a href="https://github.com/Hiepler/EuConform/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  </a>
  <a href="https://github.com/Hiepler/EuConform/blob/main/LICENSE-EUPL">
    <img src="https://img.shields.io/badge/license-EUPL_1.2-blue.svg" alt="EUPL License">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <a href="https://biomejs.dev">
    <img src="https://img.shields.io/badge/Biome-linted-60a5fa?logo=biome" alt="Biome">
  </a>
</p>

<p align="center">
  EuConform defines an open evidence format for AI compliance and provides the tools to produce, validate, and empirically evaluate it — offline and vendor-independent.
</p>

---

> [!IMPORTANT]
> **Legal Disclaimer**: This tool provides **technical guidance only**. It does **not** constitute legal advice and does **not** replace legally binding conformity assessments by notified bodies or professional legal consultation. Always consult qualified legal professionals for compliance decisions.

---

<p align="center">
  <img src="apps/web/public/euconform-screenshot.png" alt="EuConform Interface" width="700">
</p>

<p align="center">

  <a href="#-quick-start"><strong>🚀 Quick Start</strong></a> · 
  <a href="#-documentation"><strong>📖 Docs</strong></a> · 
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHiepler%2FEuConform&project-name=euconform&repository-name=euconform"><strong>🌐 Deploy</strong></a> · 
  <a href="https://github.com/Hiepler/EuConform/issues"><strong>🐛 Report Bug</strong></a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧾 **Open Evidence Format** | Produce portable `report`, `aibom`, `ci`, and `bundle` artifacts as inspectable JSON documents |
| 🧪 **Local Bias Evaluation** | CrowS-Pairs-based model evaluation with log-probability and latency fallback — reproducible, offline, no vendor dependency |
| ✅ **Schema Validation** | Validate EuConform JSON documents against the published schemas with `euconform validate` |
| 📦 **Bundle Verification** | Verify manifest, directory, or ZIP bundle integrity before handing artifacts to CI, reviewers, or auditors |
| 🚦 **Compliance CI Gate** | Turn `euconform scan` into GitHub-native annotations, CI summaries, and machine-readable artifacts |
| 🎯 **Risk Classification** | Interactive quiz implementing EU AI Act Article 5 (prohibited), Article 6 + Annex III (high-risk) |
| 🔄 **CycloneDX Interoperability** | Import external CycloneDX SBOMs into the EuConform AI BOM layer as an interoperability bridge |
| 🌐 **Offline-First** | Core evidence workflows stay local and inspectable instead of depending on vendor dashboards |
| 🔒 **Privacy-Preserving** | Zero tracking, no cookies, no external fonts – your data stays under your control |
| 🌙 **Dark Mode** | Beautiful glassmorphism design with full dark mode support |
| ♿ **Accessible** | WCAG 2.2 AA compliant with full keyboard navigation |
| 🌍 **Multilingual** | English and German interface |

## 🧰 CLI At A Glance

| Command | Primary output | Use case |
|---------|----------------|----------|
| `scan` | Native EuConform artifacts | Generate structured evidence from a real repository |
| `bias` | Bias report JSON and/or Markdown | Run reproducible local model evaluation via transformers.js — EuConform's distinctive empirical layer |
| `compare` | Comparison JSON and/or Markdown | Compare two bias runs: score/preference deltas, per-bias-type shifts, McNemar significance |
| `validate` | Valid/invalid status per JSON file | Check EuConform JSON files against published schemas |
| `verify` | Bundle integrity status | Check a manifest, extracted bundle, or ZIP archive |
| `import` | `euconform.aibom.json` | Map an external CycloneDX SBOM into the EuConform AI BOM layer |

## 🚀 Quick Start
 
> **Want to try it without installation?** Click the [**🌐 Deploy**](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHiepler%2FEuConform&project-name=euconform&repository-name=euconform) link above to start your own instance on Vercel.



### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 10 (recommended) or npm/yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Hiepler/EuConform.git
cd EuConform

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3001
```

### Build The CLI

The repo-local examples below use the built CLI directly:

```bash
# Build the CLI
pnpm --filter @euconform/cli build
```

### Workflow 1: Scan A Repository

Generate native EuConform artifacts from a real codebase:

```bash
node packages/cli/dist/index.js scan . --scope production
```

This writes:
- `.euconform/euconform.report.json`
- `.euconform/euconform.aibom.json`
- `.euconform/euconform.summary.md`
- `.euconform/euconform.bundle.json`

Typical use:
- evidence collection for local OSS or internal AI projects
- CI gating and reviewer handoff
- portable artifact generation without a vendor platform

For CI usage, add GitHub-native annotations and fail thresholds:

```bash
node packages/cli/dist/index.js scan . --scope production --ci github --fail-on high
```

For portable artifact exchange, create a bundle archive:

```bash
node packages/cli/dist/index.js scan . --scope production --zip true
```

### Workflow 2: Validate And Verify Existing Artifacts

Validate individual EuConform JSON documents against the published schemas:

```bash
node packages/cli/dist/index.js validate .euconform
```

Typical output:
- one line per file such as `euconform.aibom.json — valid (euconform.aibom.v1)`
- exit code `0` for fully valid input, `1` for schema errors, `2` when no EuConform JSON files are found

Verify a bundle manifest, extracted bundle directory, or ZIP archive:

```bash
node packages/cli/dist/index.js verify .euconform/euconform.bundle.json
```

Typical use:
- reviewer-side schema checking before manual analysis
- CI sanity checks for artifact sets already produced elsewhere
- portability checks before sharing bundles with downstream tools

### Workflow 3: Evaluate Model Bias Locally

Run a reproducible CrowS-Pairs bias evaluation against a Hugging Face model,
measured locally via transformers.js (the only supported measurement engine —
see the note below):

```bash
node packages/cli/dist/index.js bias onnx-community/Llama-3.2-1B-Instruct --lang de --output all
```

This is EuConform's distinctive empirical evidence layer. It produces model-behavior data that no other open-source compliance tool currently offers — completely offline, reproducible, and independent of any vendor API.

The generated `euconform.bias.json` can be reviewed in the web app (`/bias`): it is validated there with the same recomputation of every statistic and can be compared against a second run.

Typical use:
- empirical model-behavior evidence for Art. 10 bias/fairness documentation
- reproducible local evaluation before and after model updates
- adding a behavioral evidence layer on top of structural evidence from `scan`

### Workflow 4: Compare Two Bias Runs

Compare a baseline measurement against a candidate (same model after an update,
or a different model on the same catalogue):

```bash
node packages/cli/dist/index.js compare \
  ./.euconform-baseline/ \
  ./.euconform-candidate/ \
  --output all --out-dir ./comparison
```

`compare` accepts either the artifact file (`euconform.bias.json`) or the
directory a bias run wrote it to, and reports:

- mean-score and preference-quote deltas with both Wilson intervals
- per-bias-type shifts
- the largest per-pair changes
- a McNemar exact test over preference flips, so a shift is not mistaken for noise

The comparison refuses to run when the two artifacts do not answer the same
question with the same measurement setup (different catalogue, scoring method or
template strategy). Different models, dtypes or library versions are expected and
are listed as environment differences instead. `--allow-incomparable` writes the
report anyway, explicitly marked `comparable: false`.

### Workflow 5: Import An External CycloneDX SBOM

Map an external CycloneDX JSON file into the EuConform AI BOM layer:

```bash
node packages/cli/dist/index.js import ./third-party.cdx.json \
  --scope production \
  --output /tmp/euconform-import

node packages/cli/dist/index.js validate /tmp/euconform-import/euconform.aibom.json
```

This writes:
- `/tmp/euconform-import/euconform.aibom.json`

Important notes:
- `import` accepts CycloneDX JSON and maps only the AI-relevant subset into `euconform.aibom.v1.1`
- `--scope production` excludes `optional` and `excluded` components
- the importer is intentionally conservative and does **not** infer compliance capabilities from an SBOM
- project naming may come from BOM metadata or the source filename, depending on the input

### Try The Format In 10 Minutes

If you want to evaluate the current adoption path as an OSS builder, use one of the
reference projects in [`examples/`](examples/README.md):

```bash
# 1. Build the CLI
pnpm --filter @euconform/cli build

# 2. Scan a reference project
node packages/cli/dist/index.js scan examples/ollama-chatbot \
  --scope production \
  --output /tmp/euconform-ollama

# 3. Verify the generated bundle
node packages/cli/dist/index.js verify /tmp/euconform-ollama/euconform.bundle.json

# 4. Open the web app and import the generated artifacts
pnpm dev
```

For a retrieval-first example, replace `examples/ollama-chatbot` with
`examples/rag-assistant`.

### Bias Measurement: transformers.js Only

Bias measurement runs entirely locally via [transformers.js](https://github.com/xenova/transformers.js),
which loads a Hugging Face model (e.g. `onnx-community/Llama-3.2-1B-Instruct`,
`Xenova/distilgpt2`) and computes real sentence log-probabilities. Ollama is
**not** a bias-measurement engine: its `logprobs` field covers only
already-generated tokens, never the prompt/sentence being scored, so it never
measured anything real here — `bias --engine ollama` is rejected with that
explanation before any network access is attempted.

> [!WARNING]
> **Vercel / Cloud Deployment**: This feature requires running EuConform **locally** (`pnpm dev`).

## 📖 Documentation

### Legal Foundation & Compliance Coverage

> [!NOTE]
> **Primary Legal Source**: [Regulation (EU) 2024/1689 (EU AI Act)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)

**Tool Coverage:**

| EU AI Act Reference | Coverage |
|---------------------|----------|
| **Art. 5** | Prohibited AI Systems (red-flag indicators) |
| **Art. 6–7 + Annex III** | Risk Classification (8 high-risk use cases) |
| **Art. 9–15** | Risk Management, Data Governance, Transparency, Human Oversight |
| **Art. 10 (Para. 2–4)** | Bias/Fairness metrics with reproducible test protocols |
| **Recital 54** | Protection against discrimination |
| **Annex IV** | Technical Documentation (report structure) |

**Implementation Timeline**: Obligations become effective in stages. High-risk obligations apply from 2027. Always verify current guidelines and delegated acts.

### CLI Scanner & CI

EuConform's CLI is designed as reusable evidence infrastructure:
- `euconform scan` produces native EuConform artifacts from a repository.
- `euconform bias` provides EuConform's distinctive empirical model-behavior evidence layer.
- `euconform validate` checks individual EuConform JSON files against the published schemas.
- `euconform verify` checks artifact-set integrity for manifests, directories, and ZIP bundles.
- `euconform import` bridges external CycloneDX JSON into the EuConform AI BOM layer.

The **web app** remains the place for role and risk classification with human context.

#### GitHub Actions Example

```yaml
- name: Build CLI
  run: pnpm --filter @euconform/cli build

- name: Run EuConform scan
  run: node packages/cli/dist/index.js scan . --scope production --ci github --fail-on high
```

In GitHub Actions, EuConform emits:
- workflow annotations for top compliance gaps
- a markdown step summary
- machine-readable CI artifacts: `euconform.ci.json` and `euconform.ci-summary.md`

### EuConform Evidence Format

EuConform implements the **EuConform Evidence Format**, an open specification for portable, machine-readable AI compliance evidence.

- `euconform.report.v1` captures compliance evidence, gaps, and open questions
- `euconform.aibom.v1` is the AI Bill of Materials (AI BOM) inventory layer
- `euconform.ci.v1` captures CI thresholds, status, and top findings
- `euconform.bundle.v1` binds artifact sets into a portable, integrity-aware manifest

Current workflow boundaries:
- `scan` **produces** native EuConform artifacts from source repositories
- `import` can **ingest** external CycloneDX JSON into the current AIBOM layer for interoperability workflows
- `validate` makes the schema and compatibility story inspectable at the JSON-document level
- `verify` checks portable bundle integrity before exchange or automation

Stage 1 documentation, schemas, and example artifacts live in [docs/spec/README.md](docs/spec/README.md).
Reference source projects for OSS builders live in [examples/README.md](examples/README.md).

### Bias Testing Methodology

We use the **CrowS-Pairs** methodology ([Nangia et al., 2020](https://aclanthology.org/2020.emnlp-main.154)) to measure social biases in language models.

| Aspect | Details |
|--------|---------|
| **Dataset** | [CrowS-Pairs (Hugging Face)](https://huggingface.co/datasets/crows_pairs) |
| **License** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) – see [dataset LICENSE](apps/web/public/datasets/LICENSE.txt) |
| **German Adaptation** | 100 pairs adapted for German cultural context (custom catalogues are supported via `--dataset`) |
| **Metric** | `Score = mean(logprob_stereo - logprob_anti)` |
| **Reported statistics** | preference quote with 95% Wilson interval, ties, per-bias-type breakdown, equal-token-length subset |
| **Thresholds** | none — `euconform.bias.v2` deliberately ships no severity label; the score basis does not support one. Comparisons state deltas and a McNemar exact test instead. |

#### Calculation Methods

| Method | Indicator | Accuracy | When Used |
|--------|-----------|----------|-----------|
| **Log-Probability** | ✅ | Real sentence log-probability | `bias --engine transformers` (transformers.js, the only measurement engine) |

> [!NOTE]
> Ollama is not a bias-measurement engine: its `logprobs` field covers only
> already-generated tokens, never the prompt/sentence being scored, so it never
> measured a real sentence log-probability (`bias --engine ollama` is rejected
> with an explanation, before any network access). Use `bias --engine
> transformers` with a Hugging Face model id, e.g. `onnx-community/Llama-3.2-1B-Instruct`
> or `Xenova/distilgpt2`.

#### Ethics Statement

The stereotype pairs are used **solely for scientific evaluation** and do not reflect the opinions of the developers. Individual pairs are not displayed in the UI to avoid reinforcing harmful stereotypes – only aggregated metrics are shown.

#### Custom Question Catalogues

Domain-specific catalogues (e.g. a clinical question set) can be supplied with
`--dataset`. The catalogue's name, version and SHA-256 travel into the artifact, so a
third party can verify which questions produced the numbers:

```bash
node packages/cli/dist/index.js bias onnx-community/Llama-3.2-1B-Instruct \
  --dataset ./my-catalogue.json --output all
```

<details>
<summary><strong>📁 Catalogue Format</strong></summary>

```json
{
  "metadata": { "name": "My domain catalogue", "version": "1.0.0" },
  "pairs": [
    {
      "id": 1,
      "stereotype": "Der Arzt sagte, dass er müde war.",
      "antiStereotype": "Die Ärztin sagte, dass sie müde war.",
      "biasType": "gender"
    }
  ]
}
```

`id` and `biasType` are optional (`biasType` falls back to `unspecified`). Every pair
needs both sentences; they should differ in exactly the attribute under test. `--dataset`
cannot be combined with `--lang`, because a run must have exactly one answer to "which
questions were asked?".

</details>

## 🏗️ Project Structure

```
euconform/
├── apps/
│   ├── web/                  # Next.js 16 production app
│   └── docs/                 # Documentation site (WIP)
├── packages/
│   ├── cli/                  # Local repo scanner and CI integration
│   ├── core/                 # Risk engine, scanner engine, fairness metrics, types
│   ├── ui/                   # Shared UI components (shadcn-style)
│   ├── typescript-config/    # Shared TypeScript configuration
│   └── tailwind-config/      # Shared Tailwind configuration
├── .github/
│   ├── workflows/            # CI/CD pipelines
│   └── ISSUE_TEMPLATE/       # Issue templates
├── biome.json                # Biome linter config
└── turbo.json                # Turborepo pipeline config
```

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run E2E tests (requires Playwright)
pnpm test:e2e

# Type checking
pnpm check-types

# Linting
pnpm lint
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org) | App Router + React Server Components |
| [TypeScript 5.9](https://typescriptlang.org) | Strict mode for type safety |
| [Turborepo](https://turbo.build) | Monorepo with caching |
| [Biome](https://biomejs.dev) | Fast linting & formatting |
| [Vitest](https://vitest.dev) | Unit testing |
| [Playwright](https://playwright.dev) | E2E testing |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Radix UI](https://radix-ui.com) | Accessible components |
| [transformers.js](https://huggingface.co/docs/transformers.js) | Browser-based ML inference |

## ❓ FAQ

<details>
<summary><strong>Is this tool legally binding for EU AI Act compliance?</strong></summary>

No. This tool provides technical guidance only. Always consult qualified legal professionals for compliance decisions.
</details>

<details>
<summary><strong>Does my data leave my browser?</strong></summary>

Never. All processing happens locally in your browser or via your local Ollama instance. No data is sent to external servers.
</details>

<details>
<summary><strong>Which AI models work best with bias detection?</strong></summary>

Any model works, but models with log-probability support (Llama 3.2+, Mistral 7B+) provide more accurate results. Look for the ✅ indicator.
</details>

<details>
<summary><strong>Can I use this for commercial purposes?</strong></summary>

Yes. The tool is dual-licensed under MIT and EUPL-1.2 for maximum compatibility.
</details>

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) first.

```bash
# Fork and clone
git clone https://github.com/yourusername/EuConform.git
cd EuConform

# Install and develop
pnpm install
pnpm dev

# Before submitting
pnpm lint && pnpm check-types && pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🔒 Security

For security concerns, please see our [Security Policy](SECURITY.md). Do **not** create public issues for security vulnerabilities.

## 📄 License

Dual-licensed under:
- [MIT License](LICENSE) – for maximum compatibility
- [EUPL-1.2](LICENSE-EUPL) – for EU institution compatibility

---

<p align="center">
  <strong>Made with ❤️ for responsible AI in Europe</strong>
</p>

<p align="center">

  <a href="https://github.com/Hiepler/EuConform/issues">Issues</a> · 
  <a href="https://github.com/Hiepler/EuConform/discussions">Discussions</a>
</p>
