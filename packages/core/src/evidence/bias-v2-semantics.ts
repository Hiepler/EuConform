/**
 * Pure semantic checks for `euconform.bias.v2` artifacts (no Node builtins).
 *
 * Split out of `validate-bias-v2.ts` so the exact same recomputation can run in
 * the browser (`@euconform/core/evidence/browser`). The schema-shape check stays
 * Node-side because it reads the published JSON schema from disk; the semantic
 * layer — "do the stored numbers follow from the raw pair results?" — must never
 * have two implementations.
 */

import type { CrowsPairsPairResult } from "../types";
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

export function recomputedBiasScore(pairResults: CrowsPairsPairResult[]): number {
  return pairResults.reduce((sum, p) => sum + p.biasScore, 0) / pairResults.length;
}

/**
 * Recomputes every stored statistic from `pairResults` and rejects any artifact
 * whose stored values do not follow from its own raw data (tolerance 1e-9, i.e.
 * far below any human-rounding step). Throws on mismatch.
 */
export function assertBiasV2Semantics(data: unknown): BiasReportV2 {
  const report = data as BiasReportV2;
  assertPartialInvariants(report);
  assertNumberMatches("result.score", recomputedBiasScore(report.pairResults), report.result.score);
  assertStatisticsMatch(buildBiasStatistics(report.pairResults), report.statistics);
  return report;
}
