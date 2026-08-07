/**
 * The ONE semantic validator for `euconform.bias.v2` artifacts
 * (Messmotor-Sanierung Task 3). Both `euconform validate` and `euconform verify`
 * call this — before this task they used different validators (AJV-only vs. the
 * lenient hand-rolled `validateBiasReport`) that could disagree on the same file.
 *
 * Validation has two layers:
 *  1. Schema shape — delegated to the AJV schema (`bias-v2.schema.json` via
 *     `packages/core/src/validation/schema-validator.ts`), so there is exactly
 *     one source of truth for "what fields must exist".
 *  2. Semantic recomputation — every statistic, and the partial-run invariants,
 *     are recomputed here from the raw `pairResults` and compared against the
 *     stored values with an absolute tolerance of 1e-9 (ambiguity resolution #2:
 *     statistics are stored UNROUNDED; rounding only happens in the Markdown
 *     report, so a tolerance far below any human-rounding step is meaningful).
 *     A mismatch means the artifact's numbers do not follow from its own raw
 *     data — e.g. a manipulated Wilson bound — and the artifact is rejected
 *     with a message naming exactly which field disagreed.
 */

import type { CrowsPairsPairResult } from "../types";
import { validate as validateAgainstSchema } from "../validation/schema-validator";
import { type BiasStatisticsV2, type WilsonInterval, buildBiasStatistics } from "./bias-statistics";
import type { BiasReportV2 } from "./types";

const TOLERANCE = 1e-9;

function closeEnough(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

function fail(message: string): never {
  throw new Error(`Invalid euconform.bias.v2 artifact: ${message}`);
}

function assertNumberMatches(label: string, expected: number, actual: number): void {
  if (!closeEnough(expected, actual)) {
    fail(
      `${label} does not match recomputation from pairResults: stored ${actual}, recomputed ${expected}`
    );
  }
}

function assertWilsonMatches(
  label: string,
  expected: WilsonInterval | null,
  actual: WilsonInterval | null
): void {
  if (expected === null || actual === null) {
    if (expected !== actual) {
      fail(
        `${label} should be ${expected === null ? "null" : "a Wilson interval"}, got ${actual === null ? "null" : JSON.stringify(actual)}`
      );
    }
    return;
  }
  assertNumberMatches(`${label}.lower`, expected.lower, actual.lower);
  assertNumberMatches(`${label}.upper`, expected.upper, actual.upper);
}

function assertQuartilesMatch(
  expected: BiasStatisticsV2["pairDiffQuartiles"],
  actual: BiasStatisticsV2["pairDiffQuartiles"]
): void {
  if (expected === null || actual === null) {
    if (expected !== actual) {
      fail(
        `statistics.pairDiffQuartiles should be ${expected === null ? "null" : "present"}, got ${actual === null ? "null" : "present"}`
      );
    }
    return;
  }
  for (const key of ["min", "max", "median", "q1", "q3"] as const) {
    assertNumberMatches(`statistics.pairDiffQuartiles.${key}`, expected[key], actual[key]);
  }
}

function assertCategoryStatisticsMatch(
  expected: BiasStatisticsV2["byBiasType"],
  actual: BiasStatisticsV2["byBiasType"]
): void {
  if (expected.length !== actual.length) {
    fail(
      `statistics.byBiasType has ${actual.length} categories, recomputation from pairResults yields ${expected.length}`
    );
  }
  const actualByType = new Map(actual.map((c) => [c.biasType, c]));
  for (const expectedCategory of expected) {
    const actualCategory = actualByType.get(expectedCategory.biasType);
    if (!actualCategory) {
      fail(`statistics.byBiasType is missing category '${expectedCategory.biasType}'`);
    }
    const label = `statistics.byBiasType['${expectedCategory.biasType}']`;
    if (expectedCategory.analyzedCount !== actualCategory.analyzedCount) {
      fail(
        `${label}.analyzedCount: stored ${actualCategory.analyzedCount}, recomputed ${expectedCategory.analyzedCount}`
      );
    }
    if (expectedCategory.preferenceCount !== actualCategory.preferenceCount) {
      fail(
        `${label}.preferenceCount: stored ${actualCategory.preferenceCount}, recomputed ${expectedCategory.preferenceCount}`
      );
    }
    if (expectedCategory.tiesCount !== actualCategory.tiesCount) {
      fail(
        `${label}.tiesCount: stored ${actualCategory.tiesCount}, recomputed ${expectedCategory.tiesCount}`
      );
    }
    assertNumberMatches(
      `${label}.preferencePercent`,
      expectedCategory.preferencePercent,
      actualCategory.preferencePercent
    );
    assertWilsonMatches(
      `${label}.preferenceWilson95`,
      expectedCategory.preferenceWilson95,
      actualCategory.preferenceWilson95
    );
  }
}

function assertStatisticsMatch(expected: BiasStatisticsV2, actual: BiasStatisticsV2): void {
  if (expected.analyzedCount !== actual.analyzedCount) {
    fail(
      `statistics.analyzedCount: stored ${actual.analyzedCount}, recomputed ${expected.analyzedCount}`
    );
  }
  if (expected.preferenceCount !== actual.preferenceCount) {
    fail(
      `statistics.preferenceCount: stored ${actual.preferenceCount}, recomputed ${expected.preferenceCount}`
    );
  }
  if (expected.tiesCount !== actual.tiesCount) {
    fail(`statistics.tiesCount: stored ${actual.tiesCount}, recomputed ${expected.tiesCount}`);
  }
  assertNumberMatches(
    "statistics.preferencePercent",
    expected.preferencePercent,
    actual.preferencePercent
  );
  assertWilsonMatches(
    "statistics.preferenceWilson95",
    expected.preferenceWilson95,
    actual.preferenceWilson95
  );
  assertCategoryStatisticsMatch(expected.byBiasType, actual.byBiasType);
  assertQuartilesMatch(expected.pairDiffQuartiles, actual.pairDiffQuartiles);
  if (expected.equalTokenPairsCount !== actual.equalTokenPairsCount) {
    fail(
      `statistics.equalTokenPairsCount: stored ${actual.equalTokenPairsCount}, recomputed ${expected.equalTokenPairsCount}`
    );
  }
  if (expected.equalTokenPreferenceCount !== actual.equalTokenPreferenceCount) {
    fail(
      `statistics.equalTokenPreferenceCount: stored ${actual.equalTokenPreferenceCount}, recomputed ${expected.equalTokenPreferenceCount}`
    );
  }
  if (
    expected.equalTokenPreferencePercent === null ||
    actual.equalTokenPreferencePercent === null
  ) {
    if (expected.equalTokenPreferencePercent !== actual.equalTokenPreferencePercent) {
      fail(
        "statistics.equalTokenPreferencePercent must be null exactly when equalTokenPairsCount is 0 (recomputation disagrees)"
      );
    }
  } else {
    assertNumberMatches(
      "statistics.equalTokenPreferencePercent",
      expected.equalTokenPreferencePercent,
      actual.equalTokenPreferencePercent
    );
  }
  assertWilsonMatches(
    "statistics.equalTokenPreferenceWilson95",
    expected.equalTokenPreferenceWilson95,
    actual.equalTokenPreferenceWilson95
  );
}

function assertPartialInvariants(report: BiasReportV2): void {
  if (report.selectedCount !== report.analyzedCount + report.failedCount) {
    fail(
      `selectedCount (${report.selectedCount}) must equal analyzedCount (${report.analyzedCount}) + failedCount (${report.failedCount})`
    );
  }
  if (report.failedPairs.length !== report.failedCount) {
    fail(
      `failedPairs.length (${report.failedPairs.length}) must equal failedCount (${report.failedCount})`
    );
  }
  if (report.runStatus === "complete" && report.failedCount !== 0) {
    fail(`runStatus is 'complete' but failedCount is ${report.failedCount}`);
  }
  if (report.runStatus === "partial" && report.failedCount === 0) {
    fail("runStatus is 'partial' but failedCount is 0 (no evidence of a partial run)");
  }
  if (report.result.pairsAnalyzed !== report.analyzedCount) {
    fail(
      `result.pairsAnalyzed (${report.result.pairsAnalyzed}) must equal analyzedCount (${report.analyzedCount})`
    );
  }
  if (report.pairResults.length !== report.analyzedCount) {
    fail(
      `pairResults.length (${report.pairResults.length}) must equal analyzedCount (${report.analyzedCount})`
    );
  }
}

function recomputedScore(pairResults: CrowsPairsPairResult[]): number {
  return pairResults.reduce((sum, p) => sum + p.biasScore, 0) / pairResults.length;
}

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
    fail(messages || "schema validation failed");
  }

  const report = data as BiasReportV2;

  assertPartialInvariants(report);
  assertNumberMatches("result.score", recomputedScore(report.pairResults), report.result.score);

  const recomputed = buildBiasStatistics(report.pairResults);
  assertStatisticsMatch(recomputed, report.statistics);

  return report;
}
