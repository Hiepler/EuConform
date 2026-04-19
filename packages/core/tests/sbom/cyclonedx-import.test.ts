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
      expect(result.aibom.components[0].id).toBe("model:llama-3.2-1b:1.0.0");
    });
  });

  describe("deduplication", () => {
    it("removes exact duplicates (same kind+name+version)", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [
          { type: "library", name: "openai", version: "1.12.0" },
          { type: "library", name: "openai", version: "1.12.0" },
          { type: "library", name: "openai", version: "1.12.0" },
        ],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.components).toHaveLength(1);
      expect(result.summary.duplicatesRemoved).toBe(2);
    });

    it("keeps different versions of the same package", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [
          { type: "library", name: "torch", version: "2.0.0" },
          { type: "library", name: "torch", version: "2.2.0" },
        ],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.components).toHaveLength(2);
      expect(result.summary.duplicatesRemoved).toBe(0);
    });
  });

  describe("ID format", () => {
    it("uses kind:name:version when version present", () => {
      const result = importCycloneDx(minimalBom);
      expect(result.aibom.components[0].id).toBe("model:llama-3.2-1b:1.0.0");
    });

    it("uses kind:name when version absent", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [{ type: "machine-learning-model", name: "some-model" }],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.components[0].id).toBe("model:some-model");
    });
  });

  describe("provenance", () => {
    it("sets metadata from BOM metadata", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        metadata: {
          timestamp: "2026-04-17T10:00:00Z",
          tools: [{ name: "cdxgen", version: "10.0.0" }],
          component: { type: "application", name: "my-ai-app" },
        },
        components: [{ type: "machine-learning-model", name: "test-model", version: "1.0" }],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.metadata).toEqual({
        importSource: "cyclonedx",
        importTool: "cdxgen 10.0.0",
        originalTimestamp: "2026-04-17T10:00:00Z",
      });
    });

    it("omits importTool when no tools in metadata", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [{ type: "machine-learning-model", name: "test-model", version: "1.0" }],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.metadata).toEqual({
        importSource: "cyclonedx",
      });
    });

    it("includes source info in summary", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        metadata: {
          timestamp: "2026-04-17T10:00:00Z",
          tools: [{ name: "trivy", version: "0.50.0" }],
        },
        components: [],
      };
      const result = importCycloneDx(bom);
      expect(result.summary.source.bomFormat).toBe("CycloneDX");
      expect(result.summary.source.specVersion).toBe("1.5");
      expect(result.summary.source.importTool).toBe("trivy 0.50.0");
      expect(result.summary.source.originalTimestamp).toBe("2026-04-17T10:00:00Z");
    });
  });

  describe("project name", () => {
    it("uses metadata.component.name when available", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        metadata: {
          component: { type: "application", name: "my-ai-app" },
        },
        components: [],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.project.name).toBe("my-ai-app");
      expect(result.summary.source.projectNameSource).toBe("metadata.component.name");
    });

    it("falls back to sourcePath basename", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [],
      };
      const result = importCycloneDx(bom, { sourcePath: "/path/to/cyclonedx-bom.json" });
      expect(result.aibom.project.name).toBe("cyclonedx-bom");
      expect(result.summary.source.projectNameSource).toBe("sourcePath");
    });

    it("falls back to sbom-import when no metadata or sourcePath", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.project.name).toBe("sbom-import");
      expect(result.summary.source.projectNameSource).toBe("fallback");
    });
  });

  describe("filteredByScope in summary", () => {
    it("counts scope-filtered components", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [
          { type: "machine-learning-model", name: "prod", scope: "required" },
          { type: "machine-learning-model", name: "opt", scope: "optional" },
          { type: "machine-learning-model", name: "excl", scope: "excluded" },
          { type: "library", name: "express", scope: "required" },
        ],
      };
      const result = importCycloneDx(bom, { scope: "production" });
      expect(result.summary.totalComponents).toBe(4);
      expect(result.summary.filteredByScope).toBe(2);
      expect(result.summary.aiRelevant).toBe(1);
    });
  });

  describe("version fallback from purl", () => {
    it("uses purl version when component version missing", () => {
      const bom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: [{ type: "library", name: "openai", purl: "pkg:pypi/openai@1.30.0" }],
      };
      const result = importCycloneDx(bom);
      expect(result.aibom.components[0].version).toBe("1.30.0");
    });
  });
});
