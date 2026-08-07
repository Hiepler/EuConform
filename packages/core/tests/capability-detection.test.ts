import { describe, expect, it } from "vitest";
import {
  DefaultCapabilityDetectionService,
  EnhancedCapabilityDetectionService,
} from "../src/inference/capability-detection";

/**
 * Browser/transformers.js capability entries are declared from a static model
 * list — no model is actually loaded or tested to produce them. Reporting
 * `status: "available"` with a fresh `lastTested` for that would claim a test
 * ran when it didn't (see Messmotor-Sanierung Task 2). This pins the honest
 * runtime values: `status: "unverified"` and no `lastTested`.
 */
describe("capability detection: browser/transformers entries are not overclaimed", () => {
  it("DefaultCapabilityDetectionService.detectModelCapability reports 'unverified', not 'available', for browser", async () => {
    const service = new DefaultCapabilityDetectionService();
    const capability = await service.detectModelCapability("Xenova/distilgpt2", "browser");

    expect(capability.status).toBe("unverified");
    expect(capability.lastTested).toBeUndefined();
    // The declared method may still be reported (renaming is Task 3's job) —
    // it just must not be dressed up as measured.
    expect(capability.method).toBe("logprobs_exact");
  });

  it("EnhancedCapabilityDetectionService.detectModelCapability reports 'unverified', not 'available', for browser", async () => {
    const service = new EnhancedCapabilityDetectionService();
    const capability = await service.detectModelCapability("Xenova/distilgpt2", "browser");

    expect(capability.status).toBe("unverified");
    expect(capability.lastTested).toBeUndefined();
  });

  it("'unverified' is not scored as 0 by the recommendation ranking (regression guard)", async () => {
    // Exercise the same code path detectAllCapabilities uses, without touching
    // the network (no live Ollama in CI): detect a single browser capability
    // and confirm it sorts ahead of an explicitly zero-scored "error" entry.
    const service = new DefaultCapabilityDetectionService();
    const browserCapability = await service.detectModelCapability("Xenova/distilgpt2", "browser");
    const errorCapability = {
      modelId: "broken-model",
      engine: "ollama" as const,
      method: "logprobs_fallback_latency" as const,
      status: "error" as const,
      lastTested: new Date().toISOString(),
    };

    // sortByRecommendation is protected; reach it through the public
    // detectAllCapabilities-equivalent ordering contract by calling the same
    // scoring indirectly via Array#sort with the class's own comparator is not
    // exposed, so assert the documented invariant directly instead: an
    // "unverified" capability must score above a definitionally-zero one.
    // biome-ignore lint/suspicious/noExplicitAny: reaching a protected method for a focused unit check
    const score = (service as any).getRecommendationScore.bind(service);
    expect(score(browserCapability)).toBeGreaterThan(score(errorCapability));
  });
});
