import { describe, expect, it } from "vitest";
import {
  WILSON_Z95,
  buildBiasStatistics,
  quartilesType7,
  wilson95,
} from "../../src/evidence/bias-statistics";
import type { CrowsPairsPairResult } from "../../src/types";

/**
 * Hand-derived anchors (Messmotor-Sanierung Task 3 brief, ambiguity resolution #1:
 * z = 1.959963984540054 for the 95% Wilson interval, the SAME constant the
 * producer and the semantic validator must both use — a mismatch between the two
 * would make every artifact invalid).
 *
 * Wilson score interval formula (Wilson 1927), for successes=x, n trials,
 * p̂ = x/n:
 *
 *   center = (p̂ + z²/(2n)) / (1 + z²/n)
 *   margin = z · sqrt(p̂(1-p̂)/n + z²/(4n²)) / (1 + z²/n)
 *   [lower, upper] = [center - margin, center + margin]
 *
 * wilson95(8, 10): p̂ = 0.8, n = 10, z = 1.959963984540054
 *   z²        = 3.8414588206941254
 *   1+z²/n    = 1.3841458820694126
 *   center    = (0.8 + 3.8414588206941254/20) / 1.3841458820694126
 *             = (0.8 + 0.19207294103470627) / 1.3841458820694126
 *             = 0.9920729410347063 / 1.3841458820694126
 *             = 0.7167401600411333
 *   margin    = 1.959963984540054 · sqrt(0.8*0.2/10 + 3.8414588206941254/400)
 *               / 1.3841458820694126
 *             = 1.959963984540054 · sqrt(0.016 + 0.009603647051735313)
 *               / 1.3841458820694126
 *             = 1.959963984540054 · sqrt(0.025603647051735313) / 1.3841458820694126
 *             = 1.959963984540054 · 0.16001139694798413 / 1.3841458820694126
 *             = 0.31358835220894676 / 1.3841458820694126
 *             = 0.22657768850449148
 *   lower     = 0.7167401600411333 - 0.22657768850449148 = 0.49016247153664183
 *   upper     = 0.7167401600411333 + 0.22657768850449148 = 0.9433178485456247
 *
 * (Verified independently via a standalone Node evaluation of the same formula,
 * not via this module's implementation.)
 */
describe("wilson95", () => {
  it("matches the hand-derived interval for 8/10", () => {
    expect(WILSON_Z95).toBeCloseTo(1.959963984540054, 15);
    const interval = wilson95(8, 10);
    expect(interval).not.toBeNull();
    expect(interval?.lower).toBeCloseTo(0.49016247153664183, 12);
    expect(interval?.upper).toBeCloseTo(0.9433178485456247, 12);
  });

  it("returns null for n === 0 (undefined/empty subset, e.g. no equal-token pairs)", () => {
    expect(wilson95(0, 0)).toBeNull();
  });

  it("is symmetric around 0.5 for a 1/2 split", () => {
    const interval = wilson95(1, 2);
    expect(interval).not.toBeNull();
    const center = ((interval?.lower ?? 0) + (interval?.upper ?? 0)) / 2;
    expect(center).toBeCloseTo(0.5, 10);
  });

  it("rejects successes > n", () => {
    expect(() => wilson95(11, 10)).toThrow();
  });
});

/**
 * quartilesType7([1, 2, 3, 4]): quantile type 7 (R default / numpy 'linear'),
 * 0-indexed: h = (n-1)*p, value = v[floor(h)] + frac(h) * (v[floor(h)+1] - v[floor(h)]).
 * n = 4, sorted values = [1, 2, 3, 4].
 *
 *   q1 (p=0.25): h = 3*0.25 = 0.75 -> v[0] + 0.75*(v[1]-v[0]) = 1 + 0.75*1 = 1.75
 *   median (p=0.5): h = 3*0.5 = 1.5 -> v[1] + 0.5*(v[2]-v[1]) = 2 + 0.5*1 = 2.5
 *   q3 (p=0.75): h = 3*0.75 = 2.25 -> v[2] + 0.25*(v[3]-v[2]) = 3 + 0.25*1 = 3.25
 *   min = 1, max = 4
 */
describe("quartilesType7", () => {
  it("matches the hand-derived quartiles for [1, 2, 3, 4]", () => {
    const q = quartilesType7([1, 2, 3, 4]);
    expect(q).not.toBeNull();
    expect(q?.min).toBe(1);
    expect(q?.max).toBe(4);
    expect(q?.q1).toBeCloseTo(1.75, 12);
    expect(q?.median).toBeCloseTo(2.5, 12);
    expect(q?.q3).toBeCloseTo(3.25, 12);
  });

  it("does not mutate its input and is order-independent", () => {
    const values = [4, 1, 3, 2];
    const snapshot = [...values];
    const q = quartilesType7(values);
    expect(values).toEqual(snapshot);
    expect(q?.median).toBeCloseTo(2.5, 12);
  });

  it("returns min=max=median=q1=q3 for a single value", () => {
    const q = quartilesType7([5]);
    expect(q).toEqual({ min: 5, max: 5, median: 5, q1: 5, q3: 5 });
  });

  it("returns null for an empty array", () => {
    expect(quartilesType7([])).toBeNull();
  });
});

function pair(overrides: Partial<CrowsPairsPairResult>): CrowsPairsPairResult {
  return {
    pairId: null,
    stereotype: "s",
    antiStereotype: "a",
    biasType: null,
    stereotypeLogProb: 0,
    antiStereotypeLogProb: 0,
    biasScore: 0,
    biasDirection: "neutral",
    method: "sequence_logprob_sum",
    stereotypeTokenCount: 3,
    antiStereotypeTokenCount: 3,
    tokenCountDelta: 0,
    stereotypeTokenHash: "x",
    antiStereotypeTokenHash: "y",
    ...overrides,
  };
}

describe("buildBiasStatistics", () => {
  it("counts preference/ties from bias>0 and bias===0, with the matching Wilson interval", () => {
    const pairResults = [
      pair({ biasScore: 0.3, biasDirection: "stereotype" }),
      pair({ biasScore: 0.1, biasDirection: "stereotype" }),
      pair({ biasScore: -0.2, biasDirection: "anti-stereotype" }),
      pair({ biasScore: 0, biasDirection: "neutral" }),
    ];
    const stats = buildBiasStatistics(pairResults);

    expect(stats.analyzedCount).toBe(4);
    expect(stats.preferenceCount).toBe(2); // bias > 0
    expect(stats.tiesCount).toBe(1); // bias === 0
    expect(stats.preferencePercent).toBeCloseTo((2 / 4) * 100, 12);
    // preferencePercent is the UNROUNDED raw value (rounding only in Markdown).
    const expected = wilson95(2, 4);
    expect(stats.preferenceWilson95?.lower).toBeCloseTo(expected?.lower ?? Number.NaN, 12);
    expect(stats.preferenceWilson95?.upper).toBeCloseTo(expected?.upper ?? Number.NaN, 12);
  });

  it("computes pairDiffQuartiles from the raw biasScore distribution", () => {
    const pairResults = [1, 2, 3, 4].map((biasScore) => pair({ biasScore }));
    const stats = buildBiasStatistics(pairResults);
    expect(stats.pairDiffQuartiles).toEqual({ min: 1, max: 4, median: 2.5, q1: 1.75, q3: 3.25 });
  });

  it("groups byBiasType with its own counts/percent/Wilson interval", () => {
    const pairResults = [
      pair({ biasType: "gender", biasScore: 0.2 }),
      pair({ biasType: "gender", biasScore: -0.1 }),
      pair({ biasType: "age", biasScore: 0.5 }),
    ];
    const stats = buildBiasStatistics(pairResults);
    const gender = stats.byBiasType.find((b) => b.biasType === "gender");
    expect(gender?.analyzedCount).toBe(2);
    expect(gender?.preferenceCount).toBe(1);
    expect(gender?.preferencePercent).toBeCloseTo(50, 12);
  });

  it("returns null equalToken stats when no pairs share token length (empty subset)", () => {
    const pairResults = [
      pair({ tokenCountDelta: 1 }),
      pair({ tokenCountDelta: -2 }),
      pair({ tokenCountDelta: 3 }),
    ];
    const stats = buildBiasStatistics(pairResults);
    expect(stats.equalTokenPairsCount).toBe(0);
    expect(stats.equalTokenPreferencePercent).toBeNull();
    expect(stats.equalTokenPreferenceWilson95).toBeNull();
  });

  it("computes equalToken preference stats only over the tokenCountDelta===0 subset", () => {
    const pairResults = [
      pair({ tokenCountDelta: 0, biasScore: 0.4 }), // equal-length, preferred
      pair({ tokenCountDelta: 0, biasScore: -0.1 }), // equal-length, not preferred
      pair({ tokenCountDelta: 2, biasScore: 0.9 }), // unequal-length, excluded
    ];
    const stats = buildBiasStatistics(pairResults);
    expect(stats.equalTokenPairsCount).toBe(2);
    expect(stats.equalTokenPreferenceCount).toBe(1);
    expect(stats.equalTokenPreferencePercent).toBeCloseTo(50, 12);
    expect(stats.equalTokenPreferenceWilson95).not.toBeNull();
  });
});
