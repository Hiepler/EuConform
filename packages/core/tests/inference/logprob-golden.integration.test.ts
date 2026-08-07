import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BrowserInference } from "../../src/inference/browser-inference";

/**
 * Golden integration test against the REAL Xenova/gpt2 model via onnxruntime-node.
 *
 * Gated behind RUN_MODEL_TESTS=1 so the standard `pnpm test` run stays offline and
 * never downloads/loads a model. Compares against the CHECKED-IN fixture produced by
 * `scripts/seed-logprob-fixture.mjs` — this test NEVER writes files.
 *
 * Run with:
 *   RUN_MODEL_TESTS=1 pnpm --filter @euconform/core exec vitest run tests/inference/logprob-golden.integration.test.ts
 *
 * Tolerance is RELATIVE, not absolute (Messmotor-Sanierung Task 4): the score is a SUM over
 * tokens, so its magnitude scales with sentence length. An absolute tolerance therefore
 * tightens arbitrarily for short sentences and loosens for long ones — the wrong shape for
 * "did the measurement change." A native ONNX Runtime version bump alone (onnxruntime-node
 * 1.14.0 -> 1.24.3, byte-identical model weights, identical dtype) was observed to shift
 * scores by ~1.16e-6 relative (max 3.55e-6 across the 5 fixture sentences) — real floating-
 * point kernel drift, not a logic bug (token ids were identical). `relativeTolerance: 1e-5`
 * leaves an order of magnitude of headroom over that observed drift without being permissive
 * enough to hide an actual regression.
 */

const RUN_MODEL_TESTS = process.env.RUN_MODEL_TESTS === "1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "fixtures", "logprob-golden.json");

interface FixtureSentence {
  text: string;
  score: number;
  span: { start: number; end: number };
  scoredTokenIdsHash: string;
  scoredTokenCount: number;
  contextTokenHash: string;
}

interface Fixture {
  modelId: string;
  revision: string;
  dtype: string;
  logitsDtype: string;
  backend: string;
  transformersVersion: string;
  onnxruntimeVersion: string;
  nodeVersion: string;
  relativeTolerance: number;
  generatedAt: string;
  sentences: FixtureSentence[];
}

function loadFixture(): Fixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

function sha256HexOfIds(ids: number[]): string {
  return createHash("sha256").update(JSON.stringify(ids), "utf8").digest("hex");
}

function relativeDiff(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

describe.skipIf(!RUN_MODEL_TESTS)("logprob golden integration (Xenova/gpt2, real model)", () => {
  const fixture = loadFixture();

  it("matches the checked-in fixture within relative tolerance for every sentence", async () => {
    const engine = new BrowserInference(fixture.modelId, null, {
      revision: fixture.revision,
      dtype: fixture.dtype,
    });
    await engine.load();

    console.log(
      `[logprob-golden] modelId=${fixture.modelId} revision=${fixture.revision} ` +
        `transformersVersion=${fixture.transformersVersion} onnxruntimeVersion=${fixture.onnxruntimeVersion} ` +
        `backend=${fixture.backend}`
    );

    for (const expected of fixture.sentences) {
      const result = await engine.getScoredLogProb(expected.text);

      expect(result.span).toEqual(expected.span);
      expect(sha256HexOfIds(result.scoredTokenIds)).toBe(expected.scoredTokenIdsHash);
      expect(result.scoredTokenIds.length).toBe(expected.scoredTokenCount);
      expect(result.contextTokenHash).toBe(expected.contextTokenHash);
      expect(relativeDiff(result.score, expected.score)).toBeLessThanOrEqual(
        fixture.relativeTolerance
      );
    }
  }, 120_000);

  it("length monotonicity: extending a token-identical prefix strictly decreases the score", async () => {
    const engine = new BrowserInference(fixture.modelId, null, {
      revision: fixture.revision,
      dtype: fixture.dtype,
    });
    await engine.load();

    const prefix = "Die Patientin übertreibt ihre Kopfschmerzen.";
    const extended = "Die Patientin übertreibt ihre Kopfschmerzen. Sie wartet seit drei Tagen.";

    const prefixScored = await engine.getScoredLogProb(prefix);
    const extendedScored = await engine.getScoredLogProb(extended);

    // Only compare if the prefix's sentence tokens are an exact prefix of the
    // extended sentence's tokens (token-identical prefix requirement); otherwise skip
    // with a log, per spec, since tokenization is not guaranteed to be prefix-stable.
    const prefixIsTokenPrefix = prefixScored.scoredTokenIds.every(
      (id, i) => extendedScored.scoredTokenIds[i] === id
    );

    if (!prefixIsTokenPrefix) {
      console.log(
        "[logprob-golden] length monotonicity case SKIPPED: prefix tokens are not an exact " +
          "prefix of the extended sequence's tokens"
      );
      return;
    }

    expect(extendedScored.score).toBeLessThan(prefixScored.score);
  }, 120_000);
});
