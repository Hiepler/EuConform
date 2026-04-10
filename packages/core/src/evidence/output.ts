/**
 * EuConform Evidence Engine — Output Generation
 *
 * Transforms a ScanResult into a ScanOutput containing:
 * - ScanReport (euconform.report.v1)
 * - AiBillOfMaterials (euconform.aibom.v1)
 * - summaryMarkdown
 *
 * Pure function — no side effects, no filesystem operations.
 */

import { evaluateSignalsForCategories } from "./compliance-evaluation";
import { generateSummaryMarkdown } from "./markdown";
import type {
  AiBillOfMaterials,
  AssessmentHint,
  BomComponent,
  BomComponentKind,
  ComplianceSignalGroup,
  ConfidenceLevel,
  DetectedSignal,
  ScanGap,
  ScanOutput,
  ScanReport,
  ScanResult,
  SignalCategory,
  SignalEvidence,
} from "./types";

const COMPLIANCE_AREA_MAP = {
  disclosure: ["compliance-disclosure"] as SignalCategory[],
  biasTesting: ["compliance-bias"] as SignalCategory[],
  reportingExports: ["compliance-reporting"] as SignalCategory[],
  loggingMonitoring: ["compliance-logging"] as SignalCategory[],
  humanOversight: ["compliance-oversight"] as SignalCategory[],
  dataGovernance: ["compliance-data"] as SignalCategory[],
  incidentReporting: ["compliance-incident"] as SignalCategory[],
};

const COMPLIANCE_AREA_LABELS: Record<keyof typeof COMPLIANCE_AREA_MAP, string> = {
  disclosure: "AI disclosure",
  biasTesting: "bias testing",
  reportingExports: "reporting and exports",
  loggingMonitoring: "logging and monitoring",
  humanOversight: "human oversight",
  dataGovernance: "data governance",
  incidentReporting: "incident reporting",
};

const AI_CATEGORIES = new Set<SignalCategory>([
  "ai-provider",
  "ai-framework",
  "ai-model",
  "local-inference",
]);

const BOM_CATEGORIES = new Set<SignalCategory>([
  "ai-provider",
  "ai-framework",
  "ai-model",
  "local-inference",
  "rag",
  "training",
  "framework",
  "runtime",
]);

const CATEGORY_TO_BOM_KIND: Partial<Record<SignalCategory, BomComponentKind>> = {
  "ai-provider": "inference-provider",
  "ai-framework": "ai-framework",
  "ai-model": "model",
  "local-inference": "inference-provider",
  framework: "framework",
  runtime: "runtime",
  rag: "vector-store",
  training: "dataset",
};

const SOURCE_PRIORITY: Record<BomComponent["source"], number> = {
  "package.json": 5,
  config: 4,
  code: 3,
  "lock-file": 2,
  docs: 1,
};

const EVIDENCE_PROVENANCE_PRIORITY: Record<NonNullable<SignalEvidence["provenance"]>, number> = {
  runtime: 5,
  config: 4,
  tooling: 3,
  "root-docs": 2,
  docs: 1,
  test: 0,
  fixture: 0,
  example: 0,
  generated: 0,
};

interface ComplianceAreaEvaluation {
  group: ComplianceSignalGroup;
  implementationSignals: DetectedSignal[];
  supportingSignals: DetectedSignal[];
}

function hasAI(signals: DetectedSignal[]): boolean {
  return signals.some((signal) => AI_CATEGORIES.has(signal.category));
}

function highestConfidence(signals: DetectedSignal[]): ConfidenceLevel {
  if (signals.some((signal) => signal.confidence === "high")) return "high";
  if (signals.some((signal) => signal.confidence === "medium")) return "medium";
  return "low";
}

function collectEvidence(signals: DetectedSignal[]): SignalEvidence[] {
  return normalizeEvidence(signals.flatMap((signal) => signal.evidence));
}

function uniquePush(items: string[], value: string): void {
  if (!items.includes(value)) items.push(value);
}

function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeBomComponentId(kind: BomComponentKind, name: string): string {
  const slug = toKebabCase(name);
  return `${kind}:${slug || "component"}`;
}

function compareEvidence(left: SignalEvidence, right: SignalEvidence): number {
  const leftPriority = left.provenance ? EVIDENCE_PROVENANCE_PRIORITY[left.provenance] : 0;
  const rightPriority = right.provenance ? EVIDENCE_PROVENANCE_PRIORITY[right.provenance] : 0;

  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority;
  }

  if (left.file !== right.file) {
    return left.file.localeCompare(right.file);
  }

  return (left.line ?? 0) - (right.line ?? 0);
}

function normalizeEvidence(evidence: SignalEvidence[], maxItems = 12): SignalEvidence[] {
  const unique = new Map<string, SignalEvidence>();

  for (const item of evidence) {
    const key = `${item.file}:${item.line ?? 0}:${item.snippet}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()].sort(compareEvidence).slice(0, maxItems);
}

const SIGNAL_NAME_MAP: [string, string][] = [
  ["react", "React"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["nestjs", "NestJS"],
  ["nodejs", "Node.js"],
  ["langchain", "LangChain"],
  ["llamaindex", "LlamaIndex"],
  ["transformers", "Transformers.js"],
  ["anthropic", "Anthropic"],
  ["azure", "Azure OpenAI"],
  ["ollama", "Ollama"],
  ["onnx", "ONNX Runtime"],
  ["chroma", "ChromaDB"],
  ["qdrant", "Qdrant"],
  ["pinecone", "Pinecone"],
  ["weaviate", "Weaviate"],
  ["pgvector", "pgvector"],
];

function canonicalizeSignalName(signal: DetectedSignal): string {
  const id = signal.id.toLowerCase();
  const lowerName = signal.name.toLowerCase();

  // Special cases that need extra logic
  if (id.includes("next") || lowerName === "nextjs") return "Next.js";
  if (id.includes("openai")) return signal.category === "ai-provider" ? "OpenAI" : "OpenAI SDK";
  if (id.includes("google") || id.includes("gemini")) return "Google AI";
  if (id.includes("llamacpp") || lowerName.includes("llama.cpp")) return "llama.cpp";
  if (id.includes("turborepo") || lowerName.includes("turborepo")) return "Monorepo (Turborepo)";

  for (const [key, canonical] of SIGNAL_NAME_MAP) {
    if (id.includes(key)) return canonical;
  }

  return signal.name;
}

const LOCAL_INFERENCE_MAP: [string, string][] = [
  ["ollama", "local-ollama"],
  ["transformers", "browser-transformers"],
  ["onnx", "local-onnx"],
  ["llama", "local-llama"],
];

const CLOUD_PROVIDER_MAP: [string, string][] = [
  ["openai", "cloud-openai"],
  ["anthropic", "cloud-anthropic"],
  ["google", "cloud-google"],
  ["gemini", "cloud-google"],
  ["azure", "cloud-azure"],
];

function lookupInferenceMode(
  id: string,
  entries: [string, string][],
  prefix: string,
  name: string
): string | null {
  for (const [key, mode] of entries) {
    if (id.includes(key)) return mode;
  }
  const slug = toKebabCase(name);
  return slug ? `${prefix}-${slug}` : null;
}

function canonicalizeInferenceMode(signal: DetectedSignal): string | null {
  const id = signal.id.toLowerCase();
  const name = canonicalizeSignalName(signal);

  if (signal.category === "local-inference") {
    return lookupInferenceMode(id, LOCAL_INFERENCE_MAP, "local", name);
  }
  if (signal.category === "ai-provider") {
    return lookupInferenceMode(id, CLOUD_PROVIDER_MAP, "cloud", name);
  }
  return null;
}

function deriveSource(evidence: SignalEvidence[]): BomComponent["source"] {
  let strongest: BomComponent["source"] = "code";

  for (const item of evidence) {
    let source: BomComponent["source"] = "code";

    if (item.file.endsWith("package.json")) source = "package.json";
    else if (
      item.file.endsWith("pnpm-lock.yaml") ||
      item.file.endsWith("package-lock.json") ||
      item.file.endsWith("yarn.lock")
    ) {
      source = "lock-file";
    } else if (item.provenance === "config") {
      source = "config";
    } else if (item.provenance === "root-docs" || item.provenance === "docs") {
      source = "docs";
    }

    if (SOURCE_PRIORITY[source] > SOURCE_PRIORITY[strongest]) {
      strongest = source;
    }
  }

  return strongest;
}

function buildAiFootprint(signals: DetectedSignal[]): ScanReport["aiFootprint"] {
  const usesAI = hasAI(signals);
  const inferenceModes: string[] = [];
  const providerHints: string[] = [];
  const ragHints: string[] = [];

  for (const signal of signals) {
    const mode = canonicalizeInferenceMode(signal);
    if (mode) uniquePush(inferenceModes, mode);

    if (signal.category === "ai-provider") {
      uniquePush(providerHints, toKebabCase(canonicalizeSignalName(signal)));
    }

    if (signal.category === "rag" && signal.confidence !== "low") {
      uniquePush(ragHints, canonicalizeSignalName(signal));
    }
  }

  return { usesAI, inferenceModes, providerHints, ragHints };
}

function buildComplianceSignalGroup(
  implementationSignals: DetectedSignal[],
  aiDetected: boolean
): ComplianceSignalGroup {
  if (implementationSignals.length === 0) {
    return {
      status: aiDetected ? "absent" : "unknown",
      confidence: "low",
      evidence: [],
    };
  }

  const confidence = highestConfidence(implementationSignals);
  return {
    status: confidence === "high" ? "present" : "partial",
    confidence,
    evidence: collectEvidence(implementationSignals),
  };
}

function evaluateComplianceAreas(
  signals: DetectedSignal[],
  aiDetected: boolean
): Record<keyof typeof COMPLIANCE_AREA_MAP, ComplianceAreaEvaluation> {
  const result = {} as Record<keyof typeof COMPLIANCE_AREA_MAP, ComplianceAreaEvaluation>;

  for (const key of Object.keys(COMPLIANCE_AREA_MAP) as (keyof typeof COMPLIANCE_AREA_MAP)[]) {
    const { implementationSignals, supportingSignals } = evaluateSignalsForCategories(
      signals,
      COMPLIANCE_AREA_MAP[key]
    );

    result[key] = {
      group: buildComplianceSignalGroup(implementationSignals, aiDetected),
      implementationSignals,
      supportingSignals,
    };
  }

  return result;
}

function buildAssessmentHints(
  signals: DetectedSignal[],
  complianceAreas: Record<keyof typeof COMPLIANCE_AREA_MAP, ComplianceAreaEvaluation>,
  openQuestions: ScanResult["openQuestions"]
): ScanReport["assessmentHints"] {
  const possibleModes: string[] = [];
  const riskIndicators: AssessmentHint[] = [];
  const gpaiIndicators: AssessmentHint[] = [];

  const aiDetected = hasAI(signals);
  if (!aiDetected) {
    return {
      possibleModes: [],
      riskIndicators: [],
      gpaiIndicators: [],
      openQuestions: openQuestions.map((question) => question.question),
    };
  }

  const hasCloudProvider = signals.some((signal) => signal.category === "ai-provider");
  const hasLocalInference = signals.some((signal) => signal.category === "local-inference");

  if (hasCloudProvider) {
    possibleModes.push("gpai-user");
    const providers = Array.from(
      new Set(
        signals
          .filter((signal) => signal.category === "ai-provider")
          .map((signal) => canonicalizeSignalName(signal))
      )
    );
    gpaiIndicators.push({
      hint: `GPAI model usage detected — cloud providers found: ${providers.join(", ")}. Provider obligations depend on your role and downstream distribution.`,
      articleRef: "Art. 53",
      confidence: "medium",
    });
  }

  if (hasLocalInference) {
    gpaiIndicators.push({
      hint: "Local deployment detected — provider-side GPAI obligations are less likely unless you distribute or provide downstream access to the model.",
      articleRef: "Art. 53",
      confidence: "low",
    });
  }

  if (complianceAreas.biasTesting.group.status !== "absent") {
    riskIndicators.push({
      hint: "Bias evaluation infrastructure detected — this can support Art. 10 evidence if it is part of your real evaluation workflow.",
      articleRef: "Art. 10",
      confidence: complianceAreas.biasTesting.group.confidence,
    });
  }

  if (signals.some((signal) => signal.category === "training")) {
    riskIndicators.push({
      hint: "Training or fine-tuning signals detected — data governance and provider obligations may apply depending on your role.",
      articleRef: "Art. 10",
      confidence: "high",
    });
    possibleModes.push("gpai-provider");
  }

  for (const [key, evaluation] of Object.entries(complianceAreas) as [
    keyof typeof COMPLIANCE_AREA_MAP,
    ComplianceAreaEvaluation,
  ][]) {
    if (evaluation.implementationSignals.length > 0 || evaluation.supportingSignals.length === 0) {
      continue;
    }

    riskIndicators.push({
      hint: `Documentation references ${COMPLIANCE_AREA_LABELS[key]}, but no production implementation evidence was detected.`,
      confidence: "low",
    });
  }

  if (!possibleModes.includes("annex-iii-unclear")) {
    possibleModes.push("annex-iii-unclear");
  }

  return {
    possibleModes,
    riskIndicators,
    gpaiIndicators,
    openQuestions: openQuestions.map((question) => question.question),
  };
}

interface GapRule {
  id: string;
  title: string;
  description: string;
  priority: ScanGap["priority"];
  area: keyof typeof COMPLIANCE_AREA_MAP;
}

const GAP_RULES: GapRule[] = [
  {
    id: "gap-disclosure",
    title: "No AI disclosure mechanism detected",
    description:
      "The EU AI Act requires that users are informed when interacting with AI systems. No user-facing disclosure implementation was found in the production codebase.",
    priority: "critical",
    area: "disclosure",
  },
  {
    id: "gap-logging",
    title: "No logging or monitoring infrastructure detected",
    description:
      "AI system outputs and decisions should be logged for traceability and audit purposes. No production logging infrastructure was detected.",
    priority: "high",
    area: "loggingMonitoring",
  },
  {
    id: "gap-oversight",
    title: "No human oversight mechanism detected",
    description:
      "High-risk AI systems require human oversight capabilities. No production review or override mechanisms were found.",
    priority: "high",
    area: "humanOversight",
  },
  {
    id: "gap-bias",
    title: "No bias testing infrastructure detected",
    description:
      "AI systems should be evaluated for bias and discrimination. No production-grade bias evaluation tooling was found.",
    priority: "medium",
    area: "biasTesting",
  },
  {
    id: "gap-data",
    title: "No data governance mechanisms detected",
    description:
      "Training and inference data should be governed with clear provenance and quality controls. No production data governance infrastructure was found.",
    priority: "medium",
    area: "dataGovernance",
  },
  {
    id: "gap-incident",
    title: "No incident reporting mechanism detected",
    description:
      "AI system incidents should be reportable and trackable. No production incident reporting infrastructure was found.",
    priority: "medium",
    area: "incidentReporting",
  },
];

function buildGaps(
  complianceAreas: Record<keyof typeof COMPLIANCE_AREA_MAP, ComplianceAreaEvaluation>,
  aiDetected: boolean
): ScanGap[] {
  if (!aiDetected) return [];

  const gaps: ScanGap[] = [];

  for (const rule of GAP_RULES) {
    const evaluation = complianceAreas[rule.area];
    const confidence = highestConfidence(evaluation.implementationSignals);

    if (evaluation.implementationSignals.length === 0) {
      gaps.push({
        id: rule.id,
        title: rule.title,
        description: rule.description,
        priority: rule.priority,
        status: "missing",
        basis: "scanner-rule",
        evidence: [],
      });
      continue;
    }

    if (confidence !== "high") {
      gaps.push({
        id: rule.id,
        title: `${rule.title.replace("No ", "Partial ")}`.replace(" detected", ""),
        description: `Some implementation signals were found, but confidence is not yet high. ${rule.description}`,
        priority:
          rule.priority === "critical" ? "high" : rule.priority === "high" ? "medium" : "low",
        status: "partial",
        basis: "scanner-rule",
        evidence: collectEvidence(evaluation.implementationSignals),
      });
    }
  }

  return gaps;
}

function buildRecommendationSummary(
  gaps: ScanGap[],
  openQuestions: ScanResult["openQuestions"],
  complianceAreas: Record<keyof typeof COMPLIANCE_AREA_MAP, ComplianceAreaEvaluation>
): string[] {
  const recommendations: string[] = [];
  const priorityOrder: Record<ScanGap["priority"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortedGaps = [...gaps].sort(
    (left, right) => priorityOrder[left.priority] - priorityOrder[right.priority]
  );

  for (const gap of sortedGaps.slice(0, 4)) {
    const prefix = gap.status === "missing" ? "Implement" : "Strengthen";
    recommendations.push(`[${gap.priority.toUpperCase()}] ${prefix}: ${gap.title}`);
  }

  if (recommendations.length < 4) {
    for (const [key, evaluation] of Object.entries(complianceAreas) as [
      keyof typeof COMPLIANCE_AREA_MAP,
      ComplianceAreaEvaluation,
    ][]) {
      if (
        evaluation.implementationSignals.length > 0 ||
        evaluation.supportingSignals.length === 0
      ) {
        continue;
      }

      recommendations.push(
        `[LOW] Convert documented ${COMPLIANCE_AREA_LABELS[key]} into production implementation evidence`
      );

      if (recommendations.length >= 4) break;
    }
  }

  if (openQuestions.length > 0) {
    recommendations.push(
      `Resolve ${openQuestions.length} open question(s) that require human context`
    );
  }

  const finalRecommendation =
    "Review the generated artifacts and complete role/risk classification in the EuConform web app";

  return [...recommendations.slice(0, 4), finalRecommendation];
}

function buildDetectedStack(signals: DetectedSignal[]): string[] {
  const stack: string[] = [];
  const seen = new Set<string>();

  for (const signal of signals) {
    if (
      signal.category !== "framework" &&
      signal.category !== "runtime" &&
      signal.category !== "ai-framework"
    ) {
      continue;
    }

    const canonicalName = canonicalizeSignalName(signal);
    const key = canonicalName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    stack.push(canonicalName);
  }

  return stack;
}

function hasCapability(group: ComplianceSignalGroup): boolean {
  return group.status === "present" || group.status === "partial";
}

function resolveBomKind(signal: DetectedSignal, canonicalName: string): BomComponentKind {
  if (signal.category === "rag") {
    return canonicalName.toLowerCase().includes("embedding") ? "embedding" : "vector-store";
  }
  return CATEGORY_TO_BOM_KIND[signal.category] ?? "tool";
}

function buildAiBom(
  scanResult: ScanResult,
  complianceAreas: Record<keyof typeof COMPLIANCE_AREA_MAP, ComplianceAreaEvaluation>,
  generatedAt: string
): AiBillOfMaterials {
  const components: BomComponent[] = [];
  const componentIndex = new Map<string, number>();

  for (const signal of scanResult.signals) {
    if (!BOM_CATEGORIES.has(signal.category)) continue;
    if (signal.category === "rag" && signal.confidence === "low") continue;

    const canonicalName = canonicalizeSignalName(signal);
    const kind = resolveBomKind(signal, canonicalName);
    const key = `${kind}:${canonicalName.toLowerCase()}`;
    const source = deriveSource(signal.evidence);
    const existingIndex = componentIndex.get(key);

    if (existingIndex === undefined) {
      componentIndex.set(key, components.length);
      components.push({
        id: makeBomComponentId(kind, canonicalName),
        kind,
        name: canonicalName,
        source,
      });
      continue;
    }

    const existing = components[existingIndex];
    if (!existing) continue;
    if (SOURCE_PRIORITY[source] > SOURCE_PRIORITY[existing.source]) {
      existing.source = source;
    }
  }

  const reportingSignals = complianceAreas.reportingExports.implementationSignals;

  return {
    schemaVersion: "euconform.aibom.v1",
    generatedAt,
    project: {
      name: scanResult.repo.name,
      rootPath: scanResult.meta.targetPath,
    },
    components: [...components].sort((left, right) =>
      `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`)
    ),
    complianceCapabilities: {
      biasEvaluation: hasCapability(complianceAreas.biasTesting.group),
      jsonExport: reportingSignals.some((signal) => signal.id.includes("json")),
      pdfExport: reportingSignals.some((signal) => signal.id.includes("pdf")),
      loggingInfrastructure: hasCapability(complianceAreas.loggingMonitoring.group),
      humanReviewFlow: hasCapability(complianceAreas.humanOversight.group),
      incidentHandling: hasCapability(complianceAreas.incidentReporting.group),
    },
  };
}

export function generateScanOutput(scanResult: ScanResult): ScanOutput {
  const generatedAt = new Date().toISOString();
  const aiDetected = hasAI(scanResult.signals);
  const complianceAreas = evaluateComplianceAreas(scanResult.signals, aiDetected);

  const report: ScanReport = {
    schemaVersion: "euconform.report.v1",
    generatedAt,
    tool: {
      name: "euconform",
      version: scanResult.meta.toolVersion,
    },
    target: {
      rootPath: scanResult.meta.targetPath,
      name: scanResult.repo.name,
      repoType: scanResult.appTypes[0] ?? "unknown",
      detectedStack: buildDetectedStack(scanResult.signals),
    },
    aiFootprint: buildAiFootprint(scanResult.signals),
    complianceSignals: {
      disclosure: complianceAreas.disclosure.group,
      biasTesting: complianceAreas.biasTesting.group,
      reportingExports: complianceAreas.reportingExports.group,
      loggingMonitoring: complianceAreas.loggingMonitoring.group,
      humanOversight: complianceAreas.humanOversight.group,
      dataGovernance: complianceAreas.dataGovernance.group,
      incidentReporting: complianceAreas.incidentReporting.group,
    },
    assessmentHints: buildAssessmentHints(
      scanResult.signals,
      complianceAreas,
      scanResult.openQuestions
    ),
    gaps: buildGaps(complianceAreas, aiDetected),
    recommendationSummary: [],
  };

  report.recommendationSummary = buildRecommendationSummary(
    report.gaps,
    scanResult.openQuestions,
    complianceAreas
  );

  const aibom = buildAiBom(scanResult, complianceAreas, generatedAt);
  const summaryMarkdown = generateSummaryMarkdown(report, aibom, scanResult.meta.scanScope);

  return { report, aibom, summaryMarkdown };
}
