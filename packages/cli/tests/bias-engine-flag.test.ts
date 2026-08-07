import { describe, expect, it } from "vitest";
import { resolveEngine } from "../src/commands/bias";

/**
 * Ollama never measured sentence log-probabilities (its logprobs cover only
 * generated tokens — see Messmotor-Sanierung Task 2), so `bias --engine ollama`
 * must fail with an explanation, not a network error. `resolveEngine` is a pure,
 * throwing function so this is testable without spawning the CLI or the network.
 */
describe("resolveEngine", () => {
  it("defaults to transformers when --engine is not given", () => {
    expect(resolveEngine({})).toBe("transformers");
  });

  it("accepts --engine transformers explicitly", () => {
    expect(resolveEngine({ engine: "transformers" })).toBe("transformers");
  });

  it("rejects --engine ollama with an explanation, not a network attempt", () => {
    expect(() => resolveEngine({ engine: "ollama" })).toThrow(/logprobs/i);
    expect(() => resolveEngine({ engine: "ollama" })).toThrow(/generierte/i);
  });

  it("rejects an unknown --engine value", () => {
    expect(() => resolveEngine({ engine: "vllm" })).toThrow(/vllm/);
  });

  it("rejects --url together with the (default) transformers engine", () => {
    expect(() => resolveEngine({ url: "http://localhost:11434" })).toThrow(/--url/);
  });

  it("rejects --url together with an explicit --engine transformers", () => {
    expect(() => resolveEngine({ engine: "transformers", url: "http://localhost:11434" })).toThrow(
      /--url/
    );
  });

  it("--engine ollama wins over --url: the Ollama-disabled error is what's reported", () => {
    expect(() => resolveEngine({ engine: "ollama", url: "http://localhost:11434" })).toThrow(
      /logprobs/i
    );
  });
});
