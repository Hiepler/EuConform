# @euconform/core

Core engine for EU AI Act compliance, risk classification, and fairness metrics.

[![npm version](https://img.shields.io/npm/v/@euconform/core.svg)](https://www.npmjs.com/package/@euconform/core)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Hiepler/EuConform/blob/main/LICENSE)
[![License: EUPL-1.2](https://img.shields.io/badge/license-EUPL_1.2-blue.svg)](https://github.com/Hiepler/EuConform/blob/main/LICENSE-EUPL)

## Installation

```bash
npm install @euconform/core
# or
pnpm add @euconform/core
```

## Features

- 🎯 **Risk Classification** – Implements EU AI Act Article 5 (prohibited), Article 6 + Annex III (high-risk)
- 📊 **Bias Detection** – [CrowS-Pairs](https://huggingface.co/datasets/crows_pairs) methodology ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) with log-probability analysis
- 📄 **Report Generation** – Annex IV-compliant technical documentation
- 🔒 **Privacy-First** – All processing happens client-side

## Usage

### Risk Classification

```typescript
import { RiskEngine, type RiskClassification } from "@euconform/core";

const engine = new RiskEngine();

const result: RiskClassification = engine.classify({
  useCase: "hiring-automation",
  dataTypes: ["biometric", "personal"],
  autonomyLevel: "high",
});

console.log(result.riskLevel); // "high-risk" | "limited-risk" | "minimal-risk" | "prohibited"
console.log(result.articles);  // ["Article 6", "Annex III.4"]
```

### Bias Testing (CrowS-Pairs)

```typescript
import { calculateCrowsPairsBias } from "@euconform/core";

const result = await calculateCrowsPairsBias({
  dataset: crowsPairsData,
  engine: inferenceEngine,
  onProgress: (progress) => console.log(`${progress}% complete`),
});

console.log(result.overallBias);      // 0.0 - 1.0 (0 = no bias)
console.log(result.categoryResults);  // Bias breakdown by category
```

### Annex IV Report Generation

```typescript
import { generateAnnexIVReport } from "@euconform/core";

const report = generateAnnexIVReport({
  systemName: "My AI System",
  provider: "My Company",
  riskClassification: riskResult,
  biasResults: biasResult,
  version: "1.0.0",
});
```

## API Reference

### Risk Engine

| Method | Description |
|--------|-------------|
| `classify(input)` | Classify AI system risk level |
| `getApplicableArticles(input)` | Get relevant EU AI Act articles |
| `generateCompliance(input)` | Generate compliance checklist |

### Fairness Metrics

| Function | Description |
|----------|-------------|
| `calculateCrowsPairsBias()` | CrowS-Pairs bias calculation |
| `calculateLogProbBias()` | Log-probability bias measurement |
| `validateCrowsPairsDataset()` | Validate dataset format |

### Report Generation

| Function | Description |
|----------|-------------|
| `generateAnnexIVReport()` | Generate Annex IV documentation |

## Legal Disclaimer

> **⚠️ Important:** This package provides technical guidance only. It does not constitute legal advice and does not replace legally binding conformity assessments. Always consult qualified legal professionals for compliance decisions.

## License

Dual-licensed under [MIT](https://github.com/Hiepler/EuConform/blob/main/LICENSE) and [EUPL-1.2](https://github.com/Hiepler/EuConform/blob/main/LICENSE-EUPL).

## Links

- [GitHub Repository](https://github.com/Hiepler/EuConform)
- [Full Documentation](https://github.com/Hiepler/EuConform#readme)
- [Report Issues](https://github.com/Hiepler/EuConform/issues)

