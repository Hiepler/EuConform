/**
 * Pure, offline-testable log-probability scorer for autoregressive language models.
 *
 * Scoring convention (binding):
 * - A span [start, end) is half-open over token positions of the FULL fed sequence
 *   (i.e. including any context tokens such as a prepended BOS).
 * - The token AT position j is scored using the logits AT position j-1 (the model's
 *   prediction distribution for "what comes next" is produced one position before the
 *   token it predicts).
 * - The result is a SUM of log-probabilities, not a mean.
 * - batch_size must be exactly 1; anything else is a caller error and throws.
 */

/** Minimal shape this module needs from an onnxruntime-style Tensor. */
export interface LogitsTensorLike {
  /** Flattened [batch, seqLen, vocabSize] logits. Must be Float32Array or Float64Array. */
  data: Float32Array | Float64Array;
  /** [batchSize, seqLen, vocabSize] */
  dims: readonly number[];
}

/** Half-open token-position span [start, end). */
export interface Span {
  start: number;
  end: number;
}

function assertSupportedDtype(data: LogitsTensorLike["data"]): void {
  if (!(data instanceof Float32Array) && !(data instanceof Float64Array)) {
    const ctorName =
      (data as { constructor?: { name?: string } })?.constructor?.name ?? typeof data;
    throw new Error(
      `sumSequenceLogProb: unsupported logits dtype, expected Float32Array or Float64Array, got ${ctorName}`
    );
  }
}

function assertBatchAndDims(
  dims: readonly number[]
): [batchSize: number, seqLen: number, vocabSize: number] {
  if (dims.length !== 3) {
    throw new Error(
      `sumSequenceLogProb: expected logits dims [batch, seqLen, vocabSize], got [${dims.join(", ")}]`
    );
  }
  const batchSize = dims[0] ?? 0;
  const seqLen = dims[1] ?? 0;
  const vocabSize = dims[2] ?? 0;
  if (batchSize !== 1) {
    throw new Error(`sumSequenceLogProb: batch_size must be 1, got ${batchSize}`);
  }
  return [batchSize, seqLen, vocabSize];
}

function assertSpanWithinBounds(span: Span, seqLen: number): void {
  const { start, end } = span;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end > seqLen ||
    start >= end
  ) {
    throw new Error(
      `sumSequenceLogProb: invalid span [${start}, ${end}) for seqLen ${seqLen}; span must satisfy integer 1 <= start < end <= seqLen`
    );
  }
}

function logSumExpRow(
  data: LogitsTensorLike["data"],
  rowStart: number,
  vocabSize: number,
  contextLabel: string
): { maxLogit: number; logSumExp: number } {
  let maxLogit = Number.NEGATIVE_INFINITY;
  for (let v = 0; v < vocabSize; v++) {
    const val = data[rowStart + v] ?? Number.NaN;
    if (!Number.isFinite(val)) {
      throw new Error(
        `sumSequenceLogProb: non-finite logit at ${contextLabel}, vocab index ${v} (value: ${val})`
      );
    }
    if (val > maxLogit) maxLogit = val;
  }
  let sumExp = 0;
  for (let v = 0; v < vocabSize; v++) {
    const val = data[rowStart + v] ?? Number.NaN;
    sumExp += Math.exp(val - maxLogit);
  }
  return { maxLogit, logSumExp: maxLogit + Math.log(sumExp) };
}

/**
 * Sum the log-probabilities of the tokens in `tokenIds` over the half-open span
 * [span.start, span.end), where the token at position j is scored from the logits
 * distribution at position j-1.
 *
 * Throws on: unsupported dtype, wrong dims shape, batch_size !== 1, tokenIds/seqLen
 * mismatch, out-of-bounds span, out-of-vocab token ids, or non-finite logits.
 */
export function sumSequenceLogProb(
  logits: LogitsTensorLike,
  tokenIds: ArrayLike<number | bigint>,
  span: Span
): number {
  assertSupportedDtype(logits.data);
  const [, seqLen, vocabSize] = assertBatchAndDims(logits.dims);

  if (tokenIds.length !== seqLen) {
    throw new Error(
      `sumSequenceLogProb: tokenIds length (${tokenIds.length}) does not match logits seqLen (${seqLen})`
    );
  }
  assertSpanWithinBounds(span, seqLen);

  const { data } = logits;
  let total = 0;

  for (let j = span.start; j < span.end; j++) {
    const targetId = Number(tokenIds[j]);
    if (!Number.isInteger(targetId) || targetId < 0 || targetId >= vocabSize) {
      throw new Error(
        `sumSequenceLogProb: token id ${targetId} at position ${j} out of vocab range [0, ${vocabSize})`
      );
    }

    const pos = j - 1;
    const rowStart = pos * vocabSize;
    const { logSumExp } = logSumExpRow(data, rowStart, vocabSize, `position ${pos}`);
    const targetLogit = data[rowStart + targetId] ?? Number.NaN;
    total += targetLogit - logSumExp;
  }

  return total;
}
