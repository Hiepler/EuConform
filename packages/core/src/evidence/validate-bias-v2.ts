/**
 * The ONE validator entrypoint for `euconform.bias.v2` artifacts
 * (Messmotor-Sanierung Task 3). Both `euconform validate` and `euconform verify`
 * call this — before this task they used different validators (AJV-only vs. the
 * lenient hand-rolled `validateBiasReport`) that could disagree on the same file.
 *
 * Validation has two layers:
 *  1. Schema shape — delegated to the AJV schema (`bias-v2.schema.json` via
 *     `packages/core/src/validation/schema-validator.ts`), so there is exactly
 *     one source of truth for "what fields must exist". Node-only (reads the
 *     schema from disk); the browser calls `assertBiasV2Semantics` from
 *     `@euconform/core/evidence/browser` for layer 2.
 *  2. Semantic recomputation — every statistic, and the partial-run invariants,
 *     are recomputed from the raw `pairResults` and compared against the stored
 *     values with an absolute tolerance of 1e-9 (ambiguity resolution #2:
 *     statistics are stored UNROUNDED; rounding only happens in the Markdown
 *     report, so a tolerance far below any human-rounding step is meaningful).
 *     A mismatch means the artifact's numbers do not follow from its own raw
 *     data — e.g. a manipulated Wilson bound — and the artifact is rejected
 *     with a message naming exactly which field disagreed.
 *     This layer lives in `bias-v2-semantics.ts` so it can also run in the browser.
 */

import { validate as validateAgainstSchema } from "../validation/schema-validator";
import { assertBiasV2Semantics } from "./bias-v2-semantics";
import type { BiasReportV2 } from "./types";

/**
 * `verify --strict` rejects a partial run outright (ambiguity resolution #3):
 * a diagnostic run is, by definition, not the complete measurement a strict
 * check demands. Non-strict callers get this back as a plain boolean instead.
 */
export function isPartialRun(report: BiasReportV2): boolean {
  return report.runStatus === "partial";
}

export function validateBiasReportV2(data: unknown): BiasReportV2 {
  const schemaResult = validateAgainstSchema(data);
  if (!schemaResult.valid) {
    const messages = schemaResult.errors.map((e) => `${e.path || "/"} ${e.message}`).join("; ");
    throw new Error(
      `Invalid euconform.bias.v2 artifact: ${messages || "schema validation failed"}`
    );
  }

  return assertBiasV2Semantics(data);
}
