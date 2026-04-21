import { describe, expect, it } from "vitest";
import { validate } from "../../src/validation/schema-validator";

describe("schema-validator", () => {
  describe("auto-detection", () => {
    it("detects report.v1 schema type", () => {
      const result = validate({
        schemaVersion: "euconform.report.v1",
        generatedAt: "2026-01-01T00:00:00Z",
        tool: { name: "euconform", version: "1.0.0" },
        target: {
          name: "test",
          rootPath: "/test",
          repoType: "unknown",
          detectedStack: [],
        },
        aiFootprint: {
          usesAI: false,
          inferenceModes: [],
          providerHints: [],
          ragHints: [],
        },
        complianceSignals: {
          disclosure: { status: "unknown", confidence: "low", evidence: [] },
          biasTesting: { status: "unknown", confidence: "low", evidence: [] },
          reportingExports: { status: "unknown", confidence: "low", evidence: [] },
          loggingMonitoring: { status: "unknown", confidence: "low", evidence: [] },
          humanOversight: { status: "unknown", confidence: "low", evidence: [] },
          dataGovernance: { status: "unknown", confidence: "low", evidence: [] },
          incidentReporting: { status: "unknown", confidence: "low", evidence: [] },
        },
        assessmentHints: {
          possibleModes: [],
          riskIndicators: [],
          gpaiIndicators: [],
          openQuestions: [],
        },
        gaps: [],
        recommendationSummary: [],
      });
      expect(result.schemaType).toBe("report.v1");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("detects aibom.v1 schema type", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1",
        generatedAt: "2026-01-01T00:00:00Z",
        project: { name: "test", rootPath: "/test" },
        components: [],
        complianceCapabilities: {
          biasEvaluation: false,
          jsonExport: true,
          pdfExport: false,
          loggingInfrastructure: false,
          humanReviewFlow: false,
          incidentHandling: false,
        },
      });
      expect(result.schemaType).toBe("aibom.v1");
      expect(result.valid).toBe(true);
    });

    it("returns error for missing schemaVersion", () => {
      const result = validate({ foo: "bar" });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("schemaVersion");
    });

    it("returns error for unknown schemaVersion", () => {
      const result = validate({ schemaVersion: "euconform.unknown.v9" });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("unknown");
    });
  });

  describe("validation errors", () => {
    it("reports missing required fields", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("");
    });

    it("reports invalid enum values", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1",
        generatedAt: "2026-01-01T00:00:00Z",
        project: { name: "test", rootPath: "/test" },
        components: [
          {
            id: "bad:component",
            kind: "invalid-kind",
            name: "Bad",
            source: "package.json",
          },
        ],
        complianceCapabilities: {
          biasEvaluation: false,
          jsonExport: false,
          pdfExport: false,
          loggingInfrastructure: false,
          humanReviewFlow: false,
          incidentHandling: false,
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.keyword === "enum")).toBe(true);
    });

    it("reports additional properties", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1",
        generatedAt: "2026-01-01T00:00:00Z",
        project: { name: "test", rootPath: "/test" },
        components: [],
        complianceCapabilities: {
          biasEvaluation: false,
          jsonExport: false,
          pdfExport: false,
          loggingInfrastructure: false,
          humanReviewFlow: false,
          incidentHandling: false,
        },
        extraField: "should fail",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
    });

    it("accepts sbom-import as valid source", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1",
        generatedAt: "2026-01-01T00:00:00Z",
        project: { name: "test", rootPath: "/test" },
        components: [
          {
            id: "ai-framework:torch",
            kind: "ai-framework",
            name: "torch",
            version: "2.0.0",
            source: "sbom-import",
          },
        ],
        complianceCapabilities: {
          biasEvaluation: false,
          jsonExport: false,
          pdfExport: false,
          loggingInfrastructure: false,
          humanReviewFlow: false,
          incidentHandling: false,
        },
      });
      expect(result.valid).toBe(true);
    });

    it("accepts aibom v1.1 with metadata field", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1.1",
        generatedAt: "2026-01-01T00:00:00Z",
        project: { name: "test", rootPath: "/test" },
        components: [],
        complianceCapabilities: {
          biasEvaluation: false,
          jsonExport: false,
          pdfExport: false,
          loggingInfrastructure: false,
          humanReviewFlow: false,
          incidentHandling: false,
        },
        metadata: {
          importSource: "cyclonedx",
          importTool: "cdxgen 10.0.0",
          originalTimestamp: "2026-04-19T10:00:00Z",
        },
      });
      expect(result.valid).toBe(true);
    });

    it("rejects aibom v1 with metadata field", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1",
        generatedAt: "2026-01-01T00:00:00Z",
        project: { name: "test", rootPath: "/test" },
        components: [],
        complianceCapabilities: {
          biasEvaluation: false,
          jsonExport: false,
          pdfExport: false,
          loggingInfrastructure: false,
          humanReviewFlow: false,
          incidentHandling: false,
        },
        metadata: {
          importSource: "cyclonedx",
        },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("ValidationResult structure", () => {
    it("returns structured errors with path, message, keyword", () => {
      const result = validate({
        schemaVersion: "euconform.aibom.v1",
      });
      expect(result.valid).toBe(false);
      for (const error of result.errors) {
        expect(error).toHaveProperty("path");
        expect(error).toHaveProperty("message");
        expect(error).toHaveProperty("keyword");
      }
    });
  });
});
