/**
 * Pure statistics for the `euconform.bias.v2` evidence format
 * (Messmotor-Sanierung Task 3).
 *
 * These functions are used both by the producer (packages/cli bias command,
 * via `buildBiasStatistics`) and by the shared semantic validator
 * (`validate-bias-v2.ts`), which recomputes them from the raw `pairResults`
 * and compares against the stored `statistics` block. Both sides MUST use the
 * same `WILSON_Z95` constant — a mismatch would make every honestly-measured
 * artifact fail its own validation.
 *
 * All values here are UNROUNDED. Rounding for human display happens only in
 * the Markdown report, never in the artifact.
 */

import type { CrowsPairsPairResult } from "../types";

/** z for a 95% Wilson score interval (two-sided normal quantile at 0.975). */
export const WILSON_Z95 = 1.959963984540054;

export interface WilsonInterval {
  lower: number;
  upper: number;
}

export interface Quartiles {
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
}

/**
 * Wilson score interval for a binomial proportion (Wilson, 1927).
 *
 *   p̂ = successes / n
 *   center = (p̂ + z²/(2n)) / (1 + z²/n)
 *   margin = z · sqrt(p̂(1-p̂)/n + z²/(4n²)) / (1 + z²/n)
 *
 * Returns null when n === 0 (the proportion, and therefore the interval, is
 * undefined — e.g. the equal-token-pairs subset can legitimately be empty).
 */
export function wilson95(
  successes: number,
  n: number,
  z: number = WILSON_Z95
): WilsonInterval | null {
  if (n === 0) return null;
  if (successes < 0 || successes > n) {
    throw new Error(`wilson95: successes (${successes}) must be within [0, n=${n}]`);
  }

  const pHat = successes / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (pHat + z2 / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((pHat * (1 - pHat)) / n + z2 / (4 * n * n))) / denominator;

  return { lower: center - margin, upper: center + margin };
}

/**
 * Quantile type 7 (R default; numpy's 'linear' interpolation) — linear
 * interpolation between order statistics, 0-indexed:
 *
 *   h = (n - 1) * p
 *   value = v[floor(h)] + (h - floor(h)) * (v[floor(h) + 1] - v[floor(h)])
 *
 * Returns null for an empty input (undefined distribution).
 */
function quantileType7(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0] as number;
  const h = (n - 1) * p;
  const lowerIndex = Math.floor(h);
  const frac = h - lowerIndex;
  const lower = sorted[lowerIndex] as number;
  const upper = sorted[Math.min(lowerIndex + 1, n - 1)] as number;
  return lower + frac * (upper - lower);
}

export function quartilesType7(values: number[]): Quartiles | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0] as number,
    max: sorted[sorted.length - 1] as number,
    q1: quantileType7(sorted, 0.25),
    median: quantileType7(sorted, 0.5),
    q3: quantileType7(sorted, 0.75),
  };
}

export interface CategoryPreferenceStatistics {
  biasType: string;
  analyzedCount: number;
  preferenceCount: number;
  tiesCount: number;
  preferencePercent: number;
  preferenceWilson95: WilsonInterval | null;
}

export interface BiasStatisticsV2 {
  analyzedCount: number;
  /** Pairs where biasScore > 0 (stereotype preferred). Denominator: analyzedCount. */
  preferenceCount: number;
  /** Pairs where biasScore === 0, reported separately, not folded into either side. */
  tiesCount: number;
  preferencePercent: number;
  preferenceWilson95: WilsonInterval | null;
  byBiasType: CategoryPreferenceStatistics[];
  /** Distribution of biasScore (stereotype - anti-stereotype) across analysed pairs. */
  pairDiffQuartiles: Quartiles | null;
  /** Confounder control: pairs whose stereotype/anti-stereotype token counts are equal. */
  equalTokenPairsCount: number;
  equalTokenPreferenceCount: number;
  equalTokenPreferencePercent: number | null;
  equalTokenPreferenceWilson95: WilsonInterval | null;
}

function preferenceStatsOf(pairs: CrowsPairsPairResult[]): {
  analyzedCount: number;
  preferenceCount: number;
  tiesCount: number;
  preferencePercent: number;
  preferenceWilson95: WilsonInterval | null;
} {
  const analyzedCount = pairs.length;
  const preferenceCount = pairs.filter((p) => p.biasScore > 0).length;
  const tiesCount = pairs.filter((p) => p.biasScore === 0).length;
  const preferencePercent = analyzedCount === 0 ? 0 : (preferenceCount / analyzedCount) * 100;
  return {
    analyzedCount,
    preferenceCount,
    tiesCount,
    preferencePercent,
    preferenceWilson95: wilson95(preferenceCount, analyzedCount),
  };
}

function byBiasTypeStatistics(pairResults: CrowsPairsPairResult[]): CategoryPreferenceStatistics[] {
  const groups = new Map<string, CrowsPairsPairResult[]>();
  for (const pair of pairResults) {
    const key = pair.biasType ?? "unspecified";
    const bucket = groups.get(key);
    if (bucket) bucket.push(pair);
    else groups.set(key, [pair]);
  }
  return [...groups.entries()].map(([biasType, pairs]) => ({
    biasType,
    ...preferenceStatsOf(pairs),
  }));
}

/**
 * Builds the full v2 statistics block from raw per-pair measurements. Pure —
 * no I/O, no rounding. This is the SAME function the semantic validator calls
 * to recompute and cross-check a stored artifact's `statistics` block.
 */
export function buildBiasStatistics(pairResults: CrowsPairsPairResult[]): BiasStatisticsV2 {
  const overall = preferenceStatsOf(pairResults);
  const equalTokenPairs = pairResults.filter((p) => p.tokenCountDelta === 0);
  const equalTokenStats = preferenceStatsOf(equalTokenPairs);

  return {
    analyzedCount: overall.analyzedCount,
    preferenceCount: overall.preferenceCount,
    tiesCount: overall.tiesCount,
    preferencePercent: overall.preferencePercent,
    preferenceWilson95: overall.preferenceWilson95,
    byBiasType: byBiasTypeStatistics(pairResults),
    pairDiffQuartiles: quartilesType7(pairResults.map((p) => p.biasScore)),
    equalTokenPairsCount: equalTokenPairs.length,
    equalTokenPreferenceCount: equalTokenStats.preferenceCount,
    equalTokenPreferencePercent:
      equalTokenPairs.length === 0 ? null : equalTokenStats.preferencePercent,
    equalTokenPreferenceWilson95: equalTokenStats.preferenceWilson95,
  };
}
