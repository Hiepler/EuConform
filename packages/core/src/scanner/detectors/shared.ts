import type { ConfidenceLevel } from "../../evidence/types";

/** Source-code extensions used by ai-provider, ai-framework, rag, compliance detectors */
export const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/** Extended set including config formats, used by framework and local-inference detectors */
export const EXTENDED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".yaml",
  ".yml",
]);

/** Standardized snippet truncation length */
export const MAX_SNIPPET_LENGTH = 200;

/** Numeric ranking for confidence levels (higher = more confident) */
export const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

/** Return the higher of two confidence levels */
export function higherConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b;
}

/** Escape special regex characters in a string */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Check whether an extension is a standard source file */
export function isSourceFile(ext: string): boolean {
  return SOURCE_EXTENSIONS.has(ext);
}

/** Check whether an extension is in the extended (source + config) set */
export function isExtendedSourceFile(ext: string): boolean {
  return EXTENDED_EXTENSIONS.has(ext);
}
