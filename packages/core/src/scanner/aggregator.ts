/**
 * Scanner aggregator — orchestrates file discovery and signal detection,
 * deduplicates signals, and assembles the ScanResult.
 */

import { basename } from "node:path";
import { hasImplementationSignals } from "../evidence/compliance-evaluation";
import type {
  AppType,
  ConfidenceLevel,
  DetectedSignal,
  FileProvenance,
  OpenQuestion,
  RepoProfile,
  ScanFile,
  ScanOptions,
  ScanResult,
  SignalCategory,
} from "../evidence/types";
import { runAllDetectors } from "./detectors";
import { CONFIDENCE_RANK } from "./detectors/shared";
import { discoverFiles } from "./discovery";

const TOOL_VERSION = "0.1.0";

function parseRootPackageJson(files: ScanFile[]): Record<string, unknown> | undefined {
  const pkgFile = files.find((f) => f.relativePath === "package.json");
  if (!pkgFile) return undefined;
  try {
    return JSON.parse(pkgFile.content) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function buildRepoProfile(
  targetPath: string,
  pkg: Record<string, unknown> | undefined,
  files: ScanFile[]
): RepoProfile {
  const hasTs = files.some((f) => f.extension === ".ts" || f.extension === ".tsx");
  const hasJs = files.some((f) => f.extension === ".js" || f.extension === ".jsx");
  const languages: string[] = [];
  if (hasTs) languages.push("typescript");
  if (hasJs) languages.push("javascript");

  let packageManager: RepoProfile["packageManager"];
  if (files.some((f) => f.relativePath === "pnpm-lock.yaml")) packageManager = "pnpm";
  else if (files.some((f) => f.relativePath === "yarn.lock")) packageManager = "yarn";
  else if (files.some((f) => f.relativePath === "package-lock.json")) packageManager = "npm";

  const isMonorepo = Boolean(
    pkg?.workspaces || files.some((f) => f.relativePath === "pnpm-workspace.yaml")
  );

  return {
    name: (pkg?.name as string) ?? basename(targetPath),
    version: pkg?.version as string | undefined,
    description: pkg?.description as string | undefined,
    license: pkg?.license as string | undefined,
    isMonorepo,
    packageManager,
    languages,
  };
}

function inferAppTypes(signals: DetectedSignal[]): AppType[] {
  const types = new Set<AppType>();

  const has = (id: string) => signals.some((s) => s.id === id);
  const hasCategory = (cat: SignalCategory) => signals.some((s) => s.category === cat);

  if (has("framework-nextjs") || has("framework-react")) types.add("web-app");
  if (
    has("framework-express") ||
    has("framework-fastify") ||
    has("framework-nestjs") ||
    has("framework-hono") ||
    has("framework-elysia")
  )
    types.add("api-server");
  if (hasCategory("local-inference") || hasCategory("ai-provider"))
    if (signals.some((s) => s.name.toLowerCase().includes("chat"))) types.add("chatbot");
  if (hasCategory("training")) types.add("ml-pipeline");

  if (types.size === 0) types.add("unknown");
  return [...types];
}

/** Merge signals with the same ID: keep highest confidence, combine evidence */
function deduplicateSignals(signals: DetectedSignal[]): DetectedSignal[] {
  const map = new Map<string, DetectedSignal>();

  for (const signal of signals) {
    const existing = map.get(signal.id);
    if (!existing) {
      map.set(signal.id, { ...signal, evidence: [...signal.evidence] });
      continue;
    }

    // Merge evidence (use Set for O(1) dedup instead of O(n) .some())
    const seen = new Set(existing.evidence.map((e) => `${e.file}:${e.line ?? ""}`));
    for (const ev of signal.evidence) {
      const key = `${ev.file}:${ev.line ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        existing.evidence.push(ev);
      }
    }

    // Upgrade confidence
    if (CONFIDENCE_RANK[signal.confidence] > CONFIDENCE_RANK[existing.confidence]) {
      existing.confidence = signal.confidence;
    }
  }

  return [...map.values()];
}

function annotateEvidenceProvenance(
  signals: DetectedSignal[],
  files: ScanFile[]
): DetectedSignal[] {
  const provenanceByPath = new Map<string, FileProvenance>();
  for (const file of files) {
    provenanceByPath.set(file.relativePath, file.provenance);
  }

  return signals.map((signal) => ({
    ...signal,
    evidence: signal.evidence.map((evidence) => ({
      ...evidence,
      provenance: evidence.provenance ?? provenanceByPath.get(evidence.file) ?? "runtime",
    })),
  }));
}

function generateOpenQuestions(signals: DetectedSignal[]): OpenQuestion[] {
  const questions: OpenQuestion[] = [];
  const hasAI = signals.some(
    (s) =>
      s.category === "ai-provider" ||
      s.category === "ai-framework" ||
      s.category === "local-inference"
  );

  if (hasAI) {
    questions.push({
      id: "oq-market-placement",
      question: "Is this AI system placed on the EU market or used within the EU?",
      context:
        "The EU AI Act applies to AI systems placed on or put into service in the EU market.",
      relatedSignalIds: signals.filter((s) => s.category.startsWith("ai-")).map((s) => s.id),
      suggestedAction: "Determine your system's geographic scope and market placement.",
    });

    questions.push({
      id: "oq-intended-purpose",
      question: "What is the intended purpose of this AI system?",
      context:
        "Risk classification under the EU AI Act depends on the system's intended purpose and deployment context, which cannot be determined from code alone.",
      relatedSignalIds: [],
      suggestedAction:
        "Use the EuConform wizard to complete your risk assessment with human-provided context.",
    });

    questions.push({
      id: "oq-provider-role",
      question: "Are you a provider, deployer, or importer of this AI system?",
      context:
        "Different roles under Art. 3 carry different obligations. A scanner cannot determine your organizational role.",
      relatedSignalIds: [],
      suggestedAction:
        "Clarify your role in the AI value chain to determine applicable obligations.",
    });
  }

  const hasGpaiSignals = signals.some(
    (s) => s.category === "ai-provider" || s.id.includes("langchain") || s.id.includes("llamaindex")
  );
  if (hasGpaiSignals) {
    questions.push({
      id: "oq-gpai-downstream",
      question:
        "Are you using a general-purpose AI model? Do you provide downstream access to others?",
      context:
        "GPAI obligations (Art. 53-55) apply to providers of general-purpose AI models. Using an API does not automatically make you a GPAI provider.",
      relatedSignalIds: signals.filter((s) => s.category === "ai-provider").map((s) => s.id),
      suggestedAction: "Determine whether you are a GPAI provider or deployer.",
    });
  }

  const hasNoDisclosure = !hasImplementationSignals(signals, ["compliance-disclosure"]);
  if (hasAI && hasNoDisclosure) {
    questions.push({
      id: "oq-disclosure-missing",
      question: "Does your system inform users that they are interacting with AI?",
      context:
        "No AI disclosure signals were found in the codebase. Art. 50 requires transparency for AI systems interacting with natural persons.",
      relatedSignalIds: [],
      suggestedAction: "Add explicit AI disclosure in user-facing entry points.",
    });
  }

  return questions;
}

function buildSignalSummary(signals: DetectedSignal[]): ScanResult["signalSummary"] {
  const byCategory: Partial<Record<SignalCategory, number>> = {};
  const byConfidence: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const s of signals) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
    byConfidence[s.confidence]++;
  }

  return { total: signals.length, byCategory, byConfidence };
}

export async function scanRepository(options: ScanOptions): Promise<ScanResult> {
  const startTime = Date.now();
  const scope = options.scope ?? "production";

  const discovery = await discoverFiles(options);
  const allFiles = discovery.files;
  const rootPkg = parseRootPackageJson(allFiles);

  // Run detectors on all files
  const rawSignals: DetectedSignal[] = [];
  for (const file of allFiles) {
    const ctx = { file, lines: file.content.split("\n"), allFiles, rootPackageJson: rootPkg };
    rawSignals.push(...runAllDetectors(ctx));
  }

  const signals = annotateEvidenceProvenance(deduplicateSignals(rawSignals), allFiles);
  const openQuestions = generateOpenQuestions(signals);

  return {
    meta: {
      scannedAt: new Date().toISOString(),
      scanDurationMs: Date.now() - startTime,
      toolVersion: TOOL_VERSION,
      targetPath: options.targetPath,
      scanScope: scope,
      filesScanned: allFiles.length,
      filesSkipped: discovery.skippedCount,
    },
    repo: buildRepoProfile(options.targetPath, rootPkg, allFiles),
    appTypes: inferAppTypes(signals),
    signals,
    openQuestions,
    signalSummary: buildSignalSummary(signals),
  };
}
