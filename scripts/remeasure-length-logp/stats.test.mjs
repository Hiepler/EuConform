import assert from "node:assert/strict";
import test from "node:test";
import { averageRanks, bootstrapCI, pearson, spearman } from "./run.mjs";

test("pearson returns the expected extremes and null cases", () => {
  assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1);
  assert.ok(Math.abs(pearson([1, 2, 3], [6, 4, 2]) + 1) < 1e-12);
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null);
  assert.equal(pearson([1], [2]), null);
});

test("averageRanks averages tied ranks and spearman is invariant to monotone scales", () => {
  assert.deepEqual(averageRanks([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.ok(Math.abs(spearman([1, 2, 3, 4], [40, 30, 20, 10]) + 1) < 1e-12);
});

test("bootstrap is deterministic for a fixed seed and brackets the estimate", () => {
  const points = Array.from({ length: 20 }, (_, i) => ({
    cluster: String(i),
    x: i,
    y: 2 * i + (i % 3),
  }));
  const first = bootstrapCI(points, pearson, { resamples: 500, seed: 7 });
  const second = bootstrapCI(points, pearson, { resamples: 500, seed: 7 });
  assert.deepEqual(first, second);
  assert.ok(first.lower <= first.upper);
  const estimate = pearson(
    points.map((p) => p.x),
    points.map((p) => p.y)
  );
  assert.ok(first.lower <= estimate && estimate <= first.upper);
});

test("bootstrap keeps both sentences of a pair in the same cluster", () => {
  const points = [
    { cluster: "1", x: 1, y: 1 },
    { cluster: "1", x: 2, y: 2 },
    { cluster: "2", x: 3, y: 3 },
    { cluster: "2", x: 4, y: 4 },
  ];
  const result = bootstrapCI(points, pearson, { resamples: 100, seed: 11 });
  assert.equal(result.resamples, 100);
  assert.equal(result.lower, 1);
});
