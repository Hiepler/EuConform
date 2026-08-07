import { describe, expect, it } from "vitest";
import {
  runComprehensiveBiasAnalysisWithFactory,
  runCrowsPairsBiasAnalysisWithFactory,
} from "../src/fairness-metrics";
import type { InferenceClient } from "../src/inference";
import { InferenceFactory } from "../src/inference/inference-factory";
import { runCrowsPairsLogProbTest } from "../src/legal-checks/bias-metrics";
import { quickBiasCheck, runStereotypeBiasTest, testPair } from "../src/metrics/stereotype-bias";
import type { BiasTestConfig } from "../src/types";

/**
 * These entry points measured bias via Ollama's `getLogProb` (a latency proxy,
 * not a real sentence log-probability — see Messmotor-Sanierung Task 2) and
 * cannot be trivially converted to the new `SequenceLogProbProvider` contract
 * without a real redesign (auto engine-selection, capability detection, etc.).
 * They're stilled: calling them throws a speaking message pointing at the
 * supported path instead of silently producing a broken measurement.
 */
describe("stilled Ollama-era entry points", () => {
  const dummyClient: InferenceClient = {
    engine: "ollama",
    modelId: "dummy",
    generate: async () => "",
    getLogProb: async () => 0,
  };

  it("testPair throws with a pointer to bias --engine transformers", async () => {
    await expect(
      testPair(dummyClient, {
        id: 1,
        stereotype: "a",
        antiStereotype: "b",
        biasType: "gender",
      })
    ).rejects.toThrow(/bias --engine transformers/);
  });

  it("runStereotypeBiasTest throws with a pointer to bias --engine transformers", async () => {
    await expect(runStereotypeBiasTest(dummyClient, [])).rejects.toThrow(
      /bias --engine transformers/
    );
  });

  it("quickBiasCheck throws with a pointer to bias --engine transformers", async () => {
    await expect(quickBiasCheck(dummyClient, [])).rejects.toThrow(/bias --engine transformers/);
  });

  it("runCrowsPairsLogProbTest throws with a pointer to bias --engine transformers", async () => {
    await expect(runCrowsPairsLogProbTest(dummyClient, [])).rejects.toThrow(
      /bias --engine transformers/
    );
  });

  it("InferenceFactory.createBiasCalculation throws with a pointer to bias --engine transformers", async () => {
    const factory = new InferenceFactory();
    const config: BiasTestConfig = { dataset: [], model: "m", engine: "browser" };
    await expect(factory.createBiasCalculation(config)).rejects.toThrow(
      /bias --engine transformers/
    );
  });

  it("runCrowsPairsBiasAnalysisWithFactory throws with a pointer to bias --engine transformers", async () => {
    const config: BiasTestConfig = { dataset: [], model: "m", engine: "browser" };
    await expect(runCrowsPairsBiasAnalysisWithFactory(config)).rejects.toThrow(
      /bias --engine transformers/
    );
  });

  it("runComprehensiveBiasAnalysisWithFactory throws with a pointer to bias --engine transformers", async () => {
    const config: BiasTestConfig = { dataset: [], model: "m", engine: "browser" };
    await expect(runComprehensiveBiasAnalysisWithFactory([], config, "gender")).rejects.toThrow(
      /bias --engine transformers/
    );
  });
});
