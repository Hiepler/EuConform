import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for a Messmotor-Sanierung Task 5 review finding: `runBiasTest` used to
 * hardcode `dtype: "fp32"` directly into `BiasRunProvenance`, duplicating the literal
 * already passed to the `TransformersInference` constructor. That was only correct by
 * coincidence — the moment a caller constructs the provider with a different dtype (e.g.
 * template mode's "q4"), the duplicated literal would silently become a false claim about
 * which weight precision produced the measured scores.
 *
 * This test proves the fix by making the (mocked) provider report a dtype that does NOT
 * match the literal "fp32" `runBiasTest` passes into the constructor options — if the
 * provenance is still built from a hardcoded string rather than read off the provider
 * instance, this test fails.
 */

const SENTINEL_DTYPE = "q4-sentinel-not-fp32";

class FakeTransformersInference {
  public readonly dtype: string;
  constructor(
    _modelId: string,
    _statusCallback: ((status: string) => void) | null,
    _options: { revision?: string; dtype?: string } = {}
  ) {
    // Deliberately IGNORES the constructor's dtype option and reports a sentinel instead —
    // this is what makes the test able to tell "read from provider.dtype" apart from
    // "hardcoded fp32 string" or "echoes the constructor argument verbatim by coincidence".
    this.dtype = SENTINEL_DTYPE;
  }
  async getScoredLogProb(_text: string) {
    return {
      score: -1,
      scoredTokenIds: [1],
      span: { start: 0, end: 1 },
      contextTokenHash: "test-hash",
      provenance: {
        modelId: "test-model",
        dtype: this.dtype,
        logitsDtype: "float32",
        backend: "node-onnx",
        libraryVersion: "test",
      },
    };
  }
}

vi.mock("@euconform/core", () => ({
  TransformersInference: FakeTransformersInference,
  calculateCrowsPairsBias: vi.fn(async () => ({
    score: 0,
    method: "sequence_logprob_sum",
    pairsAnalyzed: 1,
    stereotypicalPreference: 0,
    pairResults: [],
    byBiasType: [],
    runStatus: "complete",
    selectedCount: 1,
    analyzedCount: 1,
    failedCount: 0,
    failedPairs: [],
    metadata: { engine: "browser", model: "test-model", timestamp: "2026-01-01T00:00:00.000Z" },
  })),
}));

vi.mock("@euconform/core/datasets", () => ({
  loadCrowsPairsDataset: vi.fn(() => [
    {
      id: 1,
      sent_more: "Der Mann ist stark.",
      sent_less: "Die Frau ist stark.",
      bias_type: "gender",
    },
  ]),
  loadCustomDataset: vi.fn(),
}));

vi.mock("../src/bias/resolve-model-revision", () => ({
  resolveModelRevisionSha: vi.fn(async () => "a".repeat(40)),
}));

async function loadRunBiasTest() {
  const mod = await import("../src/bias/run-bias-test");
  return mod.runBiasTest;
}

describe("runBiasTest provenance.dtype (Task 5 review fix)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads provenance.dtype from the provider instance, not a hardcoded literal", async () => {
    const runBiasTest = await loadRunBiasTest();

    const run = await runBiasTest({
      model: "test/model",
      datasetSource: { kind: "bundled", lang: "de" },
    });

    expect(run.provenance.dtype).toBe(SENTINEL_DTYPE);
    expect(run.provenance.dtype).not.toBe("fp32");
  });
});
