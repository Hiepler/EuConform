import type { BiasReportV2 } from "@euconform/core/evidence/browser";
import { assertBiasV2Semantics } from "@euconform/core/evidence/browser";

/**
 * Client-side import of bias evidence artifacts.
 *
 * The web app does not measure bias itself (that needs a local model and a real
 * sentence log-probability engine — `euconform bias --engine transformers`). It
 * consumes the resulting `euconform.bias.v2` artifact instead.
 *
 * Validation in the browser is the same semantic check the CLI runs: every stored
 * statistic is recomputed from `pairResults` via `assertBiasV2Semantics` (shared
 * core module, not a copy). The JSON-schema shape check stays in the CLI, where
 * the published schema is available on disk; here we additionally require the
 * fields the UI renders, so a malformed file fails with a readable message
 * instead of a rendering crash.
 */

export class BiasArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BiasArtifactError";
  }
}

const V2_SCHEMA_VERSION = "euconform.bias.v2";

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BiasArtifactError(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function assertRenderable(record: Record<string, unknown>): void {
  if (typeof record.model !== "string" || typeof record.dataset !== "string") {
    throw new BiasArtifactError("Expected string fields 'model' and 'dataset'.");
  }
  if (typeof record.generatedAt !== "string") {
    throw new BiasArtifactError("Expected a string field 'generatedAt'.");
  }
  if (record.runStatus !== "complete" && record.runStatus !== "partial") {
    throw new BiasArtifactError("Expected 'runStatus' to be 'complete' or 'partial'.");
  }
  for (const field of ["selectedCount", "analyzedCount", "failedCount"]) {
    if (typeof record[field] !== "number") {
      throw new BiasArtifactError(`Expected a numeric field '${field}'.`);
    }
  }
  const result = assertObject(record.result, "'result'");
  if (typeof result.score !== "number") {
    throw new BiasArtifactError("Expected a numeric field 'result.score'.");
  }
  const statistics = assertObject(record.statistics, "'statistics'");
  if (!Array.isArray(statistics.byBiasType)) {
    throw new BiasArtifactError("Expected an array field 'statistics.byBiasType'.");
  }
  if (!Array.isArray(record.pairResults)) {
    throw new BiasArtifactError("Expected an array field 'pairResults'.");
  }
  if (!Array.isArray(record.failedPairs)) {
    throw new BiasArtifactError("Expected an array field 'failedPairs'.");
  }
  const provenance = assertObject(record.provenance, "'provenance'");
  for (const field of ["modelId", "modelRevision", "dtype", "templateStrategy"]) {
    if (typeof provenance[field] !== "string") {
      throw new BiasArtifactError(`Expected a string field 'provenance.${field}'.`);
    }
  }
}

/**
 * Parses and validates a single artifact. Throws `BiasArtifactError` with a
 * message that names the actual problem, including the legacy-v1 case (whose
 * measurement method was unreliable, so it must be re-measured rather than shown).
 */
export function parseBiasArtifact(text: string): BiasReportV2 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BiasArtifactError("File is not valid JSON.");
  }

  const record = assertObject(parsed, "Artifact");
  const schemaVersion = record.schemaVersion;
  if (schemaVersion === "euconform.bias.v1") {
    throw new BiasArtifactError(
      "This is a legacy euconform.bias.v1 artifact. Its 'logprobs_exact' method label was unreliable — re-measure with `euconform bias <model> --engine transformers`."
    );
  }
  if (schemaVersion !== V2_SCHEMA_VERSION) {
    throw new BiasArtifactError(
      `Expected schemaVersion "${V2_SCHEMA_VERSION}", got ${JSON.stringify(schemaVersion ?? null)}.`
    );
  }

  assertRenderable(record);

  try {
    return assertBiasV2Semantics(record);
  } catch (error) {
    throw new BiasArtifactError((error as Error).message);
  }
}

/** Percentage with one decimal, or "n/a" for an undefined proportion. */
export function formatPercent(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

export function formatWilson(interval: { lower: number; upper: number } | null): string {
  if (!interval) return "n/a";
  return `[${(interval.lower * 100).toFixed(1)}%, ${(interval.upper * 100).toFixed(1)}%]`;
}

export function formatSigned(value: number, digits = 4): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}
