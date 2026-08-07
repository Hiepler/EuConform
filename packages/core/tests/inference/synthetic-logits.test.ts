import { describe, expect, it } from "vitest";
import { sumSequenceLogProb } from "../../src/inference/sequence-logprob";

/**
 * Offline, standard-suite truth anchor for `sumSequenceLogProb`.
 *
 * Mini-vocabulary: 3 tokens (ids 0, 1, 2). Sequence: tokenIds = [0, 1, 2] (3 positions).
 * Token at position j is scored from the logits row at position j-1 (SUM, not mean).
 *
 * Logits (3 rows x 3-vocab), flattened row-major, dims = [1, 3, 3]:
 *   row 0 (predicts position 1): [1, 2, 3]
 *   row 1 (predicts position 2): [0, 1, 0]
 *   row 2 (unused by any span below, but must still be finite): [0, 0, 0]
 *
 * Hand-derived log-softmax for the FULL span [1, 3):
 *
 * Position j=1, target = tokenIds[1] = 1, scored from row 0 = [1, 2, 3]:
 *   max = 3
 *   sum(exp(x - max)) = exp(1-3) + exp(2-3) + exp(3-3) = exp(-2) + exp(-1) + exp(0)
 *                     = 0.13533528... + 0.36787944... + 1 = 1.50321472...
 *   logSumExp = 3 + ln(1.50321472...) = 3 + 0.40760596... = 3.40760596...
 *   log_softmax(target=1) = row0[1] - logSumExp = 2 - 3.40760596... = -1.40760596...
 *
 * Position j=2, target = tokenIds[2] = 2, scored from row 1 = [0, 1, 0]:
 *   max = 1
 *   sum(exp(x - max)) = exp(0-1) + exp(1-1) + exp(0-1) = exp(-1) + 1 + exp(-1)
 *                     = 0.36787944... + 1 + 0.36787944... = 1.73575888...
 *   logSumExp = 1 + ln(1.73575888...) = 1 + 0.55144471... = 1.55144471...
 *   log_softmax(target=2) = row1[2] - logSumExp = 0 - 1.55144471... = -1.55144471...
 *
 * Full-span sum = -1.40760596... + -1.55144471... = -2.95905068...
 *
 * For the RESTRICTED span [2, 3) (first sentence position excluded), only the second
 * term applies: expected = -1.55144471...
 *
 * The expected values below are computed independently in this file (not by calling
 * the function under test) using the same log-softmax formula written out above, so
 * the test is a genuine hand-derived anchor rather than a tautology.
 */

function referenceLogSoftmaxTarget(row: number[], targetId: number): number {
  const max = Math.max(...row);
  const sumExp = row.reduce((acc, x) => acc + Math.exp(x - max), 0);
  const logSumExp = max + Math.log(sumExp);
  return row[targetId] - logSumExp;
}

const ROW0 = [1, 2, 3];
const ROW1 = [0, 1, 0];
const ROW2 = [0, 0, 0];

function buildLogits(rows: number[][]): { data: Float32Array; dims: number[] } {
  const vocabSize = rows[0].length;
  const data = new Float32Array(rows.length * vocabSize);
  rows.forEach((row, i) => {
    row.forEach((v, j) => {
      data[i * vocabSize + j] = v;
    });
  });
  return { data, dims: [1, rows.length, vocabSize] };
}

describe("sumSequenceLogProb", () => {
  it("scores the full span [1, n) as a sum of per-token log-softmax", () => {
    const logits = buildLogits([ROW0, ROW1, ROW2]);
    const tokenIds = [0, 1, 2];

    const expected = referenceLogSoftmaxTarget(ROW0, 1) + referenceLogSoftmaxTarget(ROW1, 2);
    const actual = sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 });

    expect(actual).toBeCloseTo(expected, 9);
    expect(actual).toBeCloseTo(-2.95905068, 6);
  });

  it("scores a restricted span, excluding the first sentence position", () => {
    const logits = buildLogits([ROW0, ROW1, ROW2]);
    const tokenIds = [0, 1, 2];

    const expected = referenceLogSoftmaxTarget(ROW1, 2);
    const actual = sumSequenceLogProb(logits, tokenIds, { start: 2, end: 3 });

    expect(actual).toBeCloseTo(expected, 9);
    expect(actual).toBeCloseTo(-1.55144471, 6);
  });

  it("scores token at position j strictly from logits at position j-1 (shift is load-bearing)", () => {
    // Swap row0 and row1 relative to the previous test: if the implementation used
    // logits[j] instead of logits[j-1], this would silently produce the SAME result
    // as scoring position 1 from row1 and position 2 from row2. Using distinct,
    // asymmetric rows makes the off-by-one shift observable.
    const logits = buildLogits([ROW1, ROW0, ROW2]);
    const tokenIds = [0, 1, 2];

    // Now position 1 is scored from ROW1 (formerly row0) and position 2 from ROW0.
    const expected = referenceLogSoftmaxTarget(ROW1, 1) + referenceLogSoftmaxTarget(ROW0, 2);
    const actual = sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 });

    expect(actual).toBeCloseTo(expected, 9);
    // Sanity: this must differ from the original full-span result above.
    expect(actual).not.toBeCloseTo(-2.95905068, 3);
  });

  it("throws when logits contain NaN", () => {
    const logits = buildLogits([[1, Number.NaN, 3], ROW1, ROW2]);
    const tokenIds = [0, 1, 2];

    expect(() => sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 })).toThrow(/non-finite/);
  });

  it("throws when logits contain +/-Infinity", () => {
    const logits = buildLogits([ROW0, [0, Number.POSITIVE_INFINITY, 0], ROW2]);
    const tokenIds = [0, 1, 2];

    expect(() => sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 })).toThrow(/non-finite/);
  });

  it("throws when span is out of bounds (end beyond seqLen)", () => {
    const logits = buildLogits([ROW0, ROW1, ROW2]);
    const tokenIds = [0, 1, 2];

    expect(() => sumSequenceLogProb(logits, tokenIds, { start: 1, end: 4 })).toThrow(
      /invalid span/
    );
  });

  it("throws when span start is below 1 (position 0 is context, never scored)", () => {
    const logits = buildLogits([ROW0, ROW1, ROW2]);
    const tokenIds = [0, 1, 2];

    expect(() => sumSequenceLogProb(logits, tokenIds, { start: 0, end: 3 })).toThrow(
      /invalid span/
    );
  });

  it("throws when batch_size !== 1", () => {
    const rows = [ROW0, ROW1, ROW2];
    const vocabSize = 3;
    const data = new Float32Array(2 * rows.length * vocabSize);
    rows.forEach((row, i) => {
      row.forEach((v, j) => {
        data[i * vocabSize + j] = v;
      });
    });
    const logits = { data, dims: [2, rows.length, vocabSize] };
    const tokenIds = [0, 1, 2];

    expect(() => sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 })).toThrow(
      /batch_size must be 1/
    );
  });

  it("throws when token id is out of vocab range", () => {
    const logits = buildLogits([ROW0, ROW1, ROW2]);
    const tokenIds = [0, 1, 99];

    expect(() => sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 })).toThrow(
      /out of vocab range/
    );
  });

  it("throws when logits.data is not a Float32Array/Float64Array", () => {
    const logits = {
      data: [1, 2, 3, 0, 1, 0, 0, 0, 0] as unknown as Float32Array,
      dims: [1, 3, 3],
    };
    const tokenIds = [0, 1, 2];

    expect(() => sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 })).toThrow(
      /unsupported logits dtype/
    );
  });

  it("accepts Float64Array logits with equivalent results", () => {
    const vocabSize = 3;
    const rows = [ROW0, ROW1, ROW2];
    const data = new Float64Array(rows.length * vocabSize);
    rows.forEach((row, i) => {
      row.forEach((v, j) => {
        data[i * vocabSize + j] = v;
      });
    });
    const logits = { data, dims: [1, rows.length, vocabSize] };
    const tokenIds = [0, 1, 2];

    const actual = sumSequenceLogProb(logits, tokenIds, { start: 1, end: 3 });
    expect(actual).toBeCloseTo(-2.95905068, 6);
  });
});
