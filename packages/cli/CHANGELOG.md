# @euconform/cli

## 1.4.0

### Minor Changes

- 8e87684: **Experimental:** paired decision eval instrument for "right for the wrong reasons".

  Adds a pre-registered measurement instrument that separates accuracy from decision
  quality: every base case is paired with decisive, irrelevant, placebo and paraphrase
  variants, in both option orders, and the analysis reports whether a decision survives
  the changes that should not matter and reacts to the one that should.

  - `euconform paired-eval generate|run|baseline` with a shared JSONL data contract
    (`PromptItem`, `ScoreRow`) that the Python analysis reads without a translation layer.
  - Next-token label scorer for letters and option words plus a greedy arm, a
    fail-closed resumable runner with full `run.json` provenance, and LLM-free baselines
    (oracle, constant, coarse, random).
  - Python analysis with stratified paired bootstrap, exact McNemar and Holm correction,
    plus a power simulation; deterministic for a fixed seed.
  - Pre-registration stage 1 is frozen (`docs/prereg/`); stages 2 and 3 are open. No model
    has been measured yet, so this release publishes the instrument, not results.

  `run.json` is a versioned research artifact (`euconform.paired-eval.run/v1`), not a
  EuConform evidence document and not part of `bundle.v1`. The instrument is marked
  experimental: the API and the CLI surface may change without a major release until the
  first pre-registered measurement is published.

  Node engine requirement moves to `>=22` (the CLI already targets Node 22; CI runs Node 24).

### Patch Changes

- Updated dependencies [8e87684]
  - @euconform/core@1.7.0

## 1.3.0

### Minor Changes

- 987c603: Compare two bias runs. The new `euconform compare <baseline> <candidate>` command diffs two `euconform.bias.v2` artifacts: mean-score and preference-quote deltas (with both Wilson intervals), per-bias-type shifts, the largest per-pair changes, and a McNemar exact test over preference flips so a shift is not mistaken for noise.

  - Accepts artifact files or the directories a bias run wrote them to.
  - Refuses comparisons that do not answer the same question with the same measurement setup (catalogue, scoring method, template strategy); different models/dtypes/library versions are listed as environment differences instead. `--allow-incomparable` writes the report explicitly marked `comparable: false`.
  - Emits Markdown by default, JSON via `--output json`; both via `--output all --out-dir`.

- 2431a0d: New evidence document type `euconform.external-observation.v1`.

  A provider-neutral envelope for third-party, time-stamped observations of machine-readable declarations (rights, AI use, licence metadata, robots policy). It fills the gap between structural evidence (`scan`) and behavioural evidence (`bias`): external observations come from another party, so they get their own document instead of being mixed into a EuConform artifact.

  The envelope records **what was visible, when** — `provider`, `subject` (with retrieval time and optional content hash), `observation.kind`, the provider's query vocabulary, and one of four results: `declared`, `not-declared`, `unknown`, `not-applicable`. It deliberately has no field that could express permission, a `declared` result must carry the observed declaration text plus its SHA-256, and at least one stated limitation is mandatory. `unknown` can never be read as permission.

  - `euconform validate` now accepts the new document type (schema-only: there are no numbers to recompute).
  - New guide `docs/spec/external-observation-v1.md`, schema `external-observation-v1.schema.json`, and a published example.
  - `validateExternalObservation()` and the `ExternalObservation` type are exported from `@euconform/core/evidence`; `validateEcefJsonDocument` dispatches the new version.
  - External observations stay standalone: they are not bundle roles in `euconform.bundle.v1`.

- 6308581: Reproducible bias evidence. Bias measurements now produce the self-checkable `euconform.bias.v2` format: every run records catalog provenance, per-pair results, real scoring provenance (engine, weight dtype, output dtype, pinned model revision) and statistics that can be re-verified from the artifact itself.

  - `euconform bias` accepts `--dataset` for user-supplied question catalogs and `--require-exact` to abort instead of falling back when the exact measurement method is unavailable.
  - `--engine` is now an explicit contract; the Ollama path and `scan --bias` are disabled because they could not produce real log-probability scores.
  - Migrated local inference to `@huggingface/transformers` 4.2.0 and added template-mode sentence log-probability scoring keyed on the tokenizer chat template, not the architecture name.
  - Failed measurements are reported as unverified capability entries instead of fabricated results.

### Patch Changes

- Updated dependencies [27048f0]
- Updated dependencies [987c603]
- Updated dependencies [2431a0d]
- Updated dependencies [6308581]
  - @euconform/core@1.6.0

## 1.2.0

### Minor Changes

- 0f6c07d: Add schema validation, CycloneDX SBOM import, and AI BOM v1.1 schema revision

  - Introduce `euconform.aibom.v1.1` schema with optional import provenance metadata
  - Add `validate` command for checking EuConform JSON documents against published schemas
  - Add `import` command for mapping CycloneDX JSON SBOMs into the EuConform AI BOM layer
  - Add PURL parser with graceful handling of malformed percent-encoding
  - Remove `validate` and `importCycloneDx` from core barrel export (available via `@euconform/core/validation` and `@euconform/core/sbom` subpath exports)

### Patch Changes

- Updated dependencies [0f6c07d]
  - @euconform/core@1.5.0

## 1.1.1

### Patch Changes

- Updated dependencies [24bff85]
  - @euconform/core@1.4.0

## 1.1.0

### Minor Changes

- 7b8b23f: Add CrowS-Pairs bias testing to CLI with standalone `euconform bias` command and `euconform scan --bias` integration. CrowS-Pairs datasets moved to core package with `loadCrowsPairsDataset()` loader. CapabilityCache abstraction enables OllamaClient usage in Node.js environments. New `/bias-check` page on documentation site positioning bias testing as key differentiator.

### Patch Changes

- Updated dependencies [7b8b23f]
  - @euconform/core@1.3.0

## 1.0.0

### Major Changes

- caae33d: ECEF Stage 2: Add bundle.v1 manifest with SHA-256 integrity hashes and optional ZIP transport. Add verify command to CLI for manifest, directory, and ZIP validation. First public release of @euconform/cli with scan, verify, and --zip support.

### Patch Changes

- Updated dependencies [caae33d]
  - @euconform/core@1.3.0
