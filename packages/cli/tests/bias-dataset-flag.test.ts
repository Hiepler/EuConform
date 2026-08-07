import consola from "consola";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceExactMethod, resolveDatasetSource } from "../src/commands/bias";

describe("resolveDatasetSource", () => {
  it("uses the bundled language dataset by default", () => {
    expect(resolveDatasetSource({ lang: "de" })).toEqual({ kind: "bundled", lang: "de" });
  });

  it("uses a custom catalog when --dataset is given", () => {
    expect(resolveDatasetSource({ dataset: "/pfad/katalog.json" })).toEqual({
      kind: "custom",
      path: "/pfad/katalog.json",
    });
  });

  it("rejects --dataset together with --lang", () => {
    expect(() => resolveDatasetSource({ lang: "de", dataset: "/pfad/katalog.json" })).toThrow(
      /nicht gleichzeitig/i
    );
  });

  it("still rejects an unknown language", () => {
    expect(() => resolveDatasetSource({ lang: "fr" })).toThrow(/fr/);
  });
});

describe("enforceExactMethod", () => {
  // exitWithError logs via consola.error and then calls process.exit(1). In tests we make
  // process.exit throw instead of tearing down the test runner, so "aborts" is asserted by
  // the thrown error, not merely by checking that some function was invoked.
  const EXIT_SENTINEL = new Error("process.exit called");
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consolaErrorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function withSpies() {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw EXIT_SENTINEL;
    });
    consolaErrorSpy = vi.spyOn(consola, "error").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  }

  it("does not abort or warn when every pair matches the declared method, even with --require-exact", () => {
    withSpies();
    const result = {
      method: "sequence_logprob_sum",
      pairResults: [{ method: "sequence_logprob_sum" }, { method: "sequence_logprob_sum" }],
    };

    expect(() => enforceExactMethod(result, true)).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(consolaErrorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("aborts via exitWithError when a pair deviates from the declared method and --require-exact is set", () => {
    withSpies();
    const result = {
      method: "sequence_logprob_sum",
      pairResults: [
        { method: "sequence_logprob_sum" },
        { method: "conditional_sequence_logprob_sum" },
      ],
    };

    expect(() => enforceExactMethod(result, true)).toThrow(EXIT_SENTINEL);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consolaErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Lauf verworfen (--require-exact)")
    );
  });

  it("warns but does not abort when a pair deviates from the declared method and --require-exact is absent", () => {
    withSpies();
    const result = {
      method: "sequence_logprob_sum",
      pairResults: [
        { method: "sequence_logprob_sum" },
        { method: "conditional_sequence_logprob_sum" },
      ],
    };

    expect(() => enforceExactMethod(result, false)).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(consolaErrorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("1 von 2"));
  });
});
