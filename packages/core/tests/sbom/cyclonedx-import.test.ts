import { describe, expect, it } from "vitest";
import { importCycloneDx } from "../../src/sbom/cyclonedx-import";
import minimalBom from "../fixtures/cyclonedx-minimal.json";
import mixedBom from "../fixtures/cyclonedx-mixed.json";
import mlBom from "../fixtures/cyclonedx-ml-bom.json";

describe("cyclonedx-import", () => {
  describe("basic import", () => {
    it("imports a minimal CycloneDX BOM", () => {
      const result = importCycloneDx(minimalBom);
      expect(result.aibom.schemaVersion).toBe("euconform.aibom.v1");
      expect(result.aibom.components).toHaveLength(1);
      expect(result.aibom.components[0].kind).toBe("model");
      expect(result.aibom.components[0].name).toBe("llama-3.2-1b");
      expect(result.aibom.components[0].source).toBe("sbom-import");
    });

    it("produces a valid aibom", () => {
      const result = importCycloneDx(minimalBom);
      expect(result.validation.valid).toBe(true);
    });
  });

  describe("filtering", () => {
    it("filters AI-relevant components from mixed BOM", () => {
      const result = importCycloneDx(mixedBom);
      expect(result.summary.totalComponents).toBe(10);
      expect(result.summary.aiRelevant).toBe(5);
      expect(result.summary.skipped).toBe(5);
    });

    it("correctly maps component kinds in mixed BOM", () => {
      const result = importCycloneDx(mixedBom);
      const kinds = result.aibom.components.map((c) => c.kind).sort();
      expect(kinds).toEqual([
        "ai-framework",
        "inference-provider",
        "model",
        "tool",
        "vector-store",
      ]);
    });

    it("provides byKind summary", () => {
      const result = importCycloneDx(mixedBom);
      expect(result.summary.byKind.model).toBe(1);
      expect(result.summary.byKind["ai-framework"]).toBe(1);
      expect(result.summary.byKind["inference-provider"]).toBe(1);
      expect(result.summary.byKind.tool).toBe(1);
      expect(result.summary.byKind["vector-store"]).toBe(1);
    });
  });

  describe("ML-BOM extensions", () => {
    it("detects modelCard extension", () => {
      const result = importCycloneDx(mlBom);
      const model = result.aibom.components.find((c) => c.name === "custom-bert-model");
      expect(model).toBeDefined();
      expect(model?.kind).toBe("model");
    });

    it("detects data extension as dataset", () => {
      const result = importCycloneDx(mlBom);
      const dataset = result.aibom.components.find((c) => c.name === "sentiment-dataset");
      expect(dataset).toBeDefined();
      expect(dataset?.kind).toBe("dataset");
    });

    it("skips non-AI components even in ML BOM", () => {
      const result = importCycloneDx(mlBom);
      expect(result.summary.totalComponents).toBe(3);
      expect(result.summary.aiRelevant).toBe(2);
      expect(result.summary.skipped).toBe(1);
    });
  });

  describe("input validation", () => {
    it("rejects non-CycloneDX input", () => {
      expect(() => importCycloneDx({ foo: "bar" })).toThrow("bomFormat");
    });

    it("rejects unsupported specVersion", () => {
      expect(() =>
        importCycloneDx({
          bomFormat: "CycloneDX",
          specVersion: "1.0",
          components: [],
        })
      ).toThrow("specVersion");
    });

    it("handles BOM with no components", () => {
      const result = importCycloneDx({
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [],
      });
      expect(result.aibom.components).toEqual([]);
      expect(result.summary.totalComponents).toBe(0);
    });
  });

  describe("scope filtering", () => {
    it("excludes optional-scope components when scope is production", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [
          { type: "machine-learning-model", name: "prod-model", scope: "required" },
          { type: "machine-learning-model", name: "dev-model", scope: "optional" },
        ],
      };
      const result = importCycloneDx(bom, { scope: "production" });
      expect(result.aibom.components).toHaveLength(1);
      expect(result.aibom.components[0].name).toBe("prod-model");
    });

    it("excludes excluded-scope components when scope is production", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [
          { type: "machine-learning-model", name: "prod-model", scope: "required" },
          { type: "machine-learning-model", name: "excluded-model", scope: "excluded" },
        ],
      };
      const result = importCycloneDx(bom, { scope: "production" });
      expect(result.aibom.components).toHaveLength(1);
      expect(result.aibom.components[0].name).toBe("prod-model");
    });

    it("includes components without scope in production mode", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [{ type: "machine-learning-model", name: "no-scope-model" }],
      };
      const result = importCycloneDx(bom, { scope: "production" });
      expect(result.aibom.components).toHaveLength(1);
    });
  });

  describe("complianceCapabilities", () => {
    it("sets all capabilities to false for imports", () => {
      const result = importCycloneDx(minimalBom);
      const caps = result.aibom.complianceCapabilities;
      expect(caps.biasEvaluation).toBe(false);
      expect(caps.jsonExport).toBe(false);
      expect(caps.pdfExport).toBe(false);
      expect(caps.loggingInfrastructure).toBe(false);
      expect(caps.humanReviewFlow).toBe(false);
      expect(caps.incidentHandling).toBe(false);
    });
  });

  describe("component ID generation", () => {
    it("generates id as kind:name", () => {
      const result = importCycloneDx(minimalBom);
      expect(result.aibom.components[0].id).toBe("model:llama-3.2-1b");
    });
  });
});
