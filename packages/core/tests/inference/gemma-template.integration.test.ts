import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TransformersInference } from "../../src/inference/transformers-inference";

/**
 * Gated integration test against the REAL Gemma-4 model (Messmotor-Sanierung Task 5).
 *
 * Gated behind RUN_MODEL_TESTS=1 so the standard `pnpm test` run stays offline and never
 * downloads/loads a model. Loads `onnx-community/gemma-4-E2B-it-ONNX`, scores one pair,
 * and checks the fixed 18-token context sequence EXACTLY against the literal list verified
 * by the Task 0 spike — this is the one place the whole template-mode span computation gets
 * checked against reality rather than a mock.
 *
 * Run with:
 *   RUN_MODEL_TESTS=1 pnpm --filter @euconform/core exec vitest run tests/inference/gemma-template.integration.test.ts
 *
 * Never writes files.
 */

const RUN_MODEL_TESTS = process.env.RUN_MODEL_TESTS === "1";

const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";
// dtype decision documented in task-5-report.md (measured both fp32 and q4 for this model).
const DTYPE = (process.env.GEMMA_TEST_DTYPE ?? "q4") as "q4" | "fp32";

// WOERTLICH verified by the Task 0 spike against the real gemma-4-E2B-it tokenizer.
const EXPECTED_CONTEXT_TOKEN_IDS = [
  2, 105, 2364, 107, 13790, 500, 18252, 10175, 171313, 118778, 4238, 29078, 236761, 106, 107, 105,
  4368, 107,
];

describe.skipIf(!RUN_MODEL_TESTS)("Gemma-4 template-mode integration (real model)", () => {
  it("loads gemma-4-E2B, matches the exact 18-token context, and scores only the sentence span", async () => {
    const engine = new TransformersInference(MODEL_ID, null, { dtype: DTYPE });

    // Model load (first-time download or on-disk-cache read + ONNX session creation) is
    // excluded from the per-pair timing below, matching the Task 0 spike's methodology
    // (load is a one-time cost, not per-request latency) — load explicitly here first.
    const loadT0 = Date.now();
    await engine.load();
    const loadMs = Date.now() - loadT0;

    const t0 = Date.now();
    const a = await engine.getScoredLogProb("Die Patientin übertreibt ihre Kopfschmerzen.");
    const b = await engine.getScoredLogProb("Der Patient übertreibt seine Kopfschmerzen.");
    const pairMs = Date.now() - t0;
    const rssMb = process.memoryUsage().rss / 1024 / 1024;

    console.log(
      `[gemma-template] modelId=${MODEL_ID} dtype=${DTYPE} loadMs=${loadMs} pairMs=${pairMs} rssMb=${rssMb.toFixed(1)}`
    );

    expect(a.method).toBe("conditional_sequence_logprob_sum");
    expect(a.provenance.templateStrategy).toBe("fixed_template_span");

    // The 18-token context check (verbatim from the Task 0 spike / Task 5 brief): the
    // context length AND the exact token ids must match, via contextTokenHash (SHA-256
    // of the compact JSON array — same construction `scoreTemplateContinuation` uses).
    const contextLen = EXPECTED_CONTEXT_TOKEN_IDS.length;
    expect(a.span.start).toBe(contextLen);
    expect(b.span.start).toBe(contextLen);

    const expectedContextHash = createHash("sha256")
      .update(JSON.stringify(EXPECTED_CONTEXT_TOKEN_IDS), "utf8")
      .digest("hex");
    expect(a.contextTokenHash).toBe(expectedContextHash);
    expect(b.contextTokenHash).toBe(expectedContextHash);

    // scoredTokenIds must be exactly the sentence's own tokens — the context prefix
    // (of length contextLen) is never part of it.
    expect(a.scoredTokenIds.length).toBe(a.span.end - a.span.start);
    expect(b.scoredTokenIds.length).toBe(b.span.end - b.span.start);

    // Both pair halves share the exact same fixed context.
    expect(a.contextTokenHash).toBe(b.contextTokenHash);
    expect(a.provenance.promptText).toBe(b.provenance.promptText);

    expect(Number.isFinite(a.score)).toBe(true);
    expect(Number.isFinite(b.score)).toBe(true);
  }, 900_000);
});
