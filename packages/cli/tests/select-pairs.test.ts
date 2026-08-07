import { loadCrowsPairsDataset } from "@euconform/core/datasets";
import { describe, expect, it } from "vitest";
import { selectPairs } from "../src/bias/select-pairs";

const dataset = Array.from({ length: 100 }, (_, i) => ({ id: i }));

describe("selectPairs", () => {
  it("returns the full dataset untouched when maxPairs is omitted", () => {
    const { pairs, seed } = selectPairs(dataset);
    expect(pairs).toBe(dataset);
    expect(seed).toBeNull();
  });

  it("returns the full dataset when maxPairs is not smaller than the dataset", () => {
    expect(selectPairs(dataset, 100).pairs).toBe(dataset);
    expect(selectPairs(dataset, 250).pairs).toBe(dataset);
  });

  it("reports no seed when no sampling happened, even if one was passed", () => {
    // A seed that did not influence the selection must not be recorded as if it had.
    expect(selectPairs(dataset, undefined, 42).seed).toBeNull();
    expect(selectPairs(dataset, 100, 42).seed).toBeNull();
  });

  it("samples exactly maxPairs entries", () => {
    expect(selectPairs(dataset, 25, 42).pairs).toHaveLength(25);
    expect(selectPairs(dataset, 1, 42).pairs).toHaveLength(1);
  });

  it("is reproducible for the same seed", () => {
    const a = selectPairs(dataset, 25, 42);
    const b = selectPairs(dataset, 25, 42);
    expect(b.pairs).toEqual(a.pairs);
    expect(a.seed).toBe(42);
  });

  it("produces a different selection for a different seed", () => {
    const a = selectPairs(dataset, 25, 42).pairs;
    const b = selectPairs(dataset, 25, 43).pairs;
    expect(b).not.toEqual(a);
  });

  it("records the generated seed when none was passed", () => {
    const { seed, pairs } = selectPairs(dataset, 25);
    expect(seed).toBeTypeOf("number");
    expect(Number.isInteger(seed)).toBe(true);
    // Recording the seed is only useful if replaying it reproduces the run.
    expect(selectPairs(dataset, 25, seed as number).pairs).toEqual(pairs);
  });

  it("never duplicates or invents entries", () => {
    const pairs = selectPairs(dataset, 25, 7).pairs;
    expect(new Set(pairs).size).toBe(25);
    for (const pair of pairs) expect(dataset).toContain(pair);
  });

  it("does not mutate the input dataset", () => {
    const original = [...dataset];
    selectPairs(dataset, 25, 42);
    expect(dataset).toEqual(original);
  });

  it("keeps a short sample spread across bias categories", () => {
    // The shipped datasets are grouped by category: the first 25 entries of
    // crows-pairs-de cover only 5 of 9 categories. Sampling must do better.
    const real = loadCrowsPairsDataset("de");
    const categoryOf = (e: unknown) => (e as { bias_type?: string }).bias_type;
    const allCategories = new Set(real.map(categoryOf));
    const headCategories = new Set(real.slice(0, 25).map(categoryOf));
    const sampledCategories = new Set(selectPairs(real, 25, 42).pairs.map(categoryOf));

    expect(headCategories.size).toBeLessThan(allCategories.size);
    expect(sampledCategories.size).toBeGreaterThan(headCategories.size);
  });
});
