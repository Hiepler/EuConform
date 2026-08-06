import { describe, expect, it } from "vitest";
import { resolveDatasetSource } from "../src/commands/bias";

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
