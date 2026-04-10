import type { DetectedSignal, FileProvenance, SignalCategory, SignalEvidence } from "./types";

export const IMPLEMENTATION_PROVENANCE = new Set<FileProvenance>(["runtime", "config"]);
const SUPPORTING_PROVENANCE = new Set<FileProvenance>(["root-docs", "docs"]);
const USER_FACING_SEGMENTS = new Set([
  "app",
  "pages",
  "routes",
  "route",
  "components",
  "ui",
  "views",
  "view",
  "screens",
  "screen",
  "templates",
  "template",
  "public",
  "content",
  "locales",
  "messages",
  "copy",
  "emails",
]);
const USER_FACING_BASENAME_PATTERN =
  /(?:page|layout|route|template|loading|error|view|screen|dialog|modal|form|widget|banner|notice)\.[^.]+$/i;

function normalizedProvenance(provenance?: FileProvenance): FileProvenance {
  return provenance ?? "runtime";
}

function isInternalAnalysisPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  return normalized.includes("/scanner/") || normalized.includes("/detectors/");
}

export function isUserFacingPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const segments = normalized.split("/").filter(Boolean);
  const basename = segments[segments.length - 1] ?? "";

  return (
    segments.some((segment) => USER_FACING_SEGMENTS.has(segment)) ||
    USER_FACING_BASENAME_PATTERN.test(basename)
  );
}

export function isImplementationEvidence(
  category: SignalCategory,
  evidence: SignalEvidence
): boolean {
  const provenance = normalizedProvenance(evidence.provenance);
  if (!IMPLEMENTATION_PROVENANCE.has(provenance)) return false;
  if (isInternalAnalysisPath(evidence.file)) return false;

  if (category === "compliance-disclosure") {
    return isUserFacingPath(evidence.file);
  }

  return true;
}

export function isSupportingEvidence(category: SignalCategory, evidence: SignalEvidence): boolean {
  const provenance = normalizedProvenance(evidence.provenance);
  if (!SUPPORTING_PROVENANCE.has(provenance)) return false;

  if (category === "compliance-disclosure") return true;
  if (category.startsWith("compliance-")) return true;

  return false;
}

function withFilteredEvidence(
  signal: DetectedSignal,
  matcher: (evidence: SignalEvidence) => boolean
): DetectedSignal | null {
  const evidence = signal.evidence.filter(matcher);
  if (evidence.length === 0) return null;
  return { ...signal, evidence };
}

export interface EvaluatedSignalSet {
  implementationSignals: DetectedSignal[];
  supportingSignals: DetectedSignal[];
}

export function evaluateSignalsForCategories(
  signals: DetectedSignal[],
  categories: SignalCategory[]
): EvaluatedSignalSet {
  const relevant = signals.filter((signal) => categories.includes(signal.category));

  return {
    implementationSignals: relevant
      .map((signal) =>
        withFilteredEvidence(signal, (evidence) =>
          isImplementationEvidence(signal.category, evidence)
        )
      )
      .filter((signal): signal is DetectedSignal => signal !== null),
    supportingSignals: relevant
      .map((signal) =>
        withFilteredEvidence(signal, (evidence) => isSupportingEvidence(signal.category, evidence))
      )
      .filter((signal): signal is DetectedSignal => signal !== null),
  };
}

export function hasImplementationSignals(
  signals: DetectedSignal[],
  categories: SignalCategory[]
): boolean {
  return evaluateSignalsForCategories(signals, categories).implementationSignals.length > 0;
}
