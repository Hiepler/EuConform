import { describe, expect, it } from "vitest";
import { mapComponent } from "../../src/sbom/component-mapper";
import { lookupKnownPackage } from "../../src/sbom/known-packages";
import type { CycloneDxComponent } from "../../src/sbom/types";

describe("known-packages", () => {
  it("recognizes torch as ai-framework", () => {
    expect(lookupKnownPackage("torch")).toBe("ai-framework");
  });

  it("recognizes openai as inference-provider", () => {
    expect(lookupKnownPackage("openai")).toBe("inference-provider");
  });

  it("recognizes chromadb as vector-store", () => {
    expect(lookupKnownPackage("chromadb")).toBe("vector-store");
  });

  it("recognizes langchain as tool", () => {
    expect(lookupKnownPackage("langchain")).toBe("tool");
  });

  it("returns null for unknown packages", () => {
    expect(lookupKnownPackage("express")).toBeNull();
    expect(lookupKnownPackage("lodash")).toBeNull();
    expect(lookupKnownPackage("react")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(lookupKnownPackage("Transformers")).toBe("ai-framework");
    expect(lookupKnownPackage("OPENAI")).toBe("inference-provider");
  });
});

describe("component-mapper", () => {
  describe("tier 1: ML-BOM extensions", () => {
    it("maps component with modelCard to model", () => {
      const comp: CycloneDxComponent = {
        type: "library",
        name: "my-custom-model",
        modelCard: { modelParameters: {} },
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("model");
      expect(result!.confidence).toBe("high");
    });

    it("maps component with data array containing ml type to dataset", () => {
      const comp: CycloneDxComponent = {
        type: "library",
        name: "training-data",
        data: [{ type: "dataset" }],
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("dataset");
      expect(result!.confidence).toBe("high");
    });
  });

  describe("tier 2: CycloneDX component type", () => {
    it("maps machine-learning-model to model", () => {
      const comp: CycloneDxComponent = {
        type: "machine-learning-model",
        name: "llama-3",
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("model");
      expect(result!.confidence).toBe("high");
    });

    it("maps data type to dataset", () => {
      const comp: CycloneDxComponent = {
        type: "data",
        name: "training-corpus",
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("dataset");
      expect(result!.confidence).toBe("medium");
    });

    it("maps platform type to inference-provider", () => {
      const comp: CycloneDxComponent = {
        type: "platform",
        name: "inference-platform",
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("inference-provider");
      expect(result!.confidence).toBe("medium");
    });

    it("maps service type to inference-provider", () => {
      const comp: CycloneDxComponent = {
        type: "service",
        name: "model-api",
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("inference-provider");
      expect(result!.confidence).toBe("medium");
    });
  });

  describe("tier 3: known-package registry", () => {
    it("maps known framework-type package to ai-framework", () => {
      const comp: CycloneDxComponent = {
        type: "framework",
        name: "transformers",
        version: "4.38.0",
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("ai-framework");
      expect(result!.confidence).toBe("high");
    });

    it("maps known library-type package", () => {
      const comp: CycloneDxComponent = {
        type: "library",
        name: "openai",
        version: "1.12.0",
      };
      const result = mapComponent(comp);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("inference-provider");
      expect(result!.confidence).toBe("high");
    });
  });

  describe("non-AI components", () => {
    it("returns null for unknown library", () => {
      const comp: CycloneDxComponent = {
        type: "library",
        name: "express",
        version: "4.18.0",
      };
      expect(mapComponent(comp)).toBeNull();
    });

    it("returns null for unknown framework", () => {
      const comp: CycloneDxComponent = {
        type: "framework",
        name: "react",
        version: "18.2.0",
      };
      expect(mapComponent(comp)).toBeNull();
    });
  });

  describe("source field", () => {
    it("always sets source to sbom-import", () => {
      const comp: CycloneDxComponent = {
        type: "machine-learning-model",
        name: "test-model",
      };
      const result = mapComponent(comp);
      expect(result!.source).toBe("sbom-import");
    });
  });
});
