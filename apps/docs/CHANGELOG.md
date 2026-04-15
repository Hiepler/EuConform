# @euconform/docs

## 1.1.1

### Patch Changes

- a890f21: Localise English legal pages, redirect "Bias Check" nav link to the dedicated page, and replace the favicon with a crisp SVG/Apple-touch-icon set.

  - `legal-notice` and `privacy` (EN) now mirror the structure and content of the German versions based on the e-recht24 template (no content/legal changes beyond translation parity).
  - Desktop and mobile navigation "Bias Check" links navigate to `/bias-check` instead of the landing-page anchor.
  - Removed the mislabeled PNG `favicon.ico` and added `app/icon.svg` (brand navy + white "EC" monogram) plus `app/apple-icon.tsx` for iOS home-screen usage.

## 1.1.0

### Minor Changes

- 7b8b23f: Add CrowS-Pairs bias testing to CLI with standalone `euconform bias` command and `euconform scan --bias` integration. CrowS-Pairs datasets moved to core package with `loadCrowsPairsDataset()` loader. CapabilityCache abstraction enables OllamaClient usage in Node.js environments. New `/bias-check` page on documentation site positioning bias testing as key differentiator.

## 1.0.3

### Patch Changes

- caae33d: ECEF Stage 2: Add bundle.v1 manifest with SHA-256 integrity hashes and optional ZIP transport. Add verify command to CLI for manifest, directory, and ZIP validation. First public release of @euconform/cli with scan, verify, and --zip support.

## 1.0.2

### Patch Changes

- 50566c7: Add GPAI compliance module (Art. 53-55) with dedicated quiz flow, classifier, and results checklist for Foundation Model providers. Add compliance gap analysis with prioritized action plans for both Annex III and GPAI paths. Fix open-source unsure flag,

## 1.0.1

### Patch Changes

- Updated dependencies
  - @euconform/ui@1.0.1
