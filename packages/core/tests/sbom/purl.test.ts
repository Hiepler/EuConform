import { describe, expect, it } from "vitest";
import { parsePurl } from "../../src/sbom/purl";

describe("parsePurl", () => {
  it("parses a simple pypi purl", () => {
    const result = parsePurl("pkg:pypi/transformers@4.38.0");
    expect(result).toEqual({
      scheme: "pkg",
      type: "pypi",
      namespace: undefined,
      name: "transformers",
      version: "4.38.0",
    });
  });

  it("parses npm purl with namespace", () => {
    const result = parsePurl("pkg:npm/%40langchain/core@0.1.22");
    expect(result).toEqual({
      scheme: "pkg",
      type: "npm",
      namespace: "@langchain",
      name: "core",
      version: "0.1.22",
    });
  });

  it("parses npm purl with unencoded @ namespace", () => {
    const result = parsePurl("pkg:npm/@huggingface/transformers@2.0.0");
    expect(result).toEqual({
      scheme: "pkg",
      type: "npm",
      namespace: "@huggingface",
      name: "transformers",
      version: "2.0.0",
    });
  });

  it("parses generic purl without version", () => {
    const result = parsePurl("pkg:generic/llama-3.2-1b");
    expect(result).toEqual({
      scheme: "pkg",
      type: "generic",
      namespace: undefined,
      name: "llama-3.2-1b",
      version: undefined,
    });
  });

  it("parses purl with qualifiers (ignores them)", () => {
    const result = parsePurl("pkg:npm/openai@1.12.0?vcs_url=github.com/openai");
    expect(result).toEqual({
      scheme: "pkg",
      type: "npm",
      namespace: undefined,
      name: "openai",
      version: "1.12.0",
    });
  });

  it("parses purl with subpath (ignores it)", () => {
    const result = parsePurl("pkg:pypi/torch@2.2.0#cuda");
    expect(result).toEqual({
      scheme: "pkg",
      type: "pypi",
      namespace: undefined,
      name: "torch",
      version: "2.2.0",
    });
  });

  it("parses maven purl with deep namespace", () => {
    const result = parsePurl("pkg:maven/org.tensorflow/tensorflow-core-api@0.5.0");
    expect(result).toEqual({
      scheme: "pkg",
      type: "maven",
      namespace: "org.tensorflow",
      name: "tensorflow-core-api",
      version: "0.5.0",
    });
  });

  it("returns null for empty string", () => {
    expect(parsePurl("")).toBeNull();
  });

  it("returns null for non-pkg scheme", () => {
    expect(parsePurl("http://example.com")).toBeNull();
  });

  it("returns null for malformed purl", () => {
    expect(parsePurl("pkg:")).toBeNull();
    expect(parsePurl("pkg:/")).toBeNull();
  });
});
