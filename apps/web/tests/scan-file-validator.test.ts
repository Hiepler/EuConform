import { describe, expect, it } from "vitest";
import {
  UnrecognizedFileError,
  identifyFileSlot,
  parseFile,
  validateAibomJson,
  validateCiJson,
  validateReportJson,
} from "../lib/utils/scan-file-validator";

// ---------------------------------------------------------------------------
// identifyFileSlot
// ---------------------------------------------------------------------------

describe("identifyFileSlot", () => {
  it("identifies report by filename", () => {
    expect(identifyFileSlot("euconform.report.json")).toBe("report");
  });

  it("identifies aibom by filename", () => {
    expect(identifyFileSlot("euconform.aibom.json")).toBe("aibom");
  });

  it("identifies ci by filename", () => {
    expect(identifyFileSlot("euconform.ci.json")).toBe("ci");
  });

  it("identifies summary by filename", () => {
    expect(identifyFileSlot("euconform.summary.md")).toBe("summary");
  });

  it("returns null for unknown filenames", () => {
    expect(identifyFileSlot("random.json")).toBeNull();
    expect(identifyFileSlot("package.json")).toBeNull();
  });

  it("strips path prefix before matching", () => {
    expect(identifyFileSlot(".euconform/euconform.report.json")).toBe("report");
  });
});

// ---------------------------------------------------------------------------
// validateReportJson
// ---------------------------------------------------------------------------

const VALID_REPORT = {
  schemaVersion: "euconform.report.v1",
  generatedAt: "2026-01-01T00:00:00Z",
  tool: { name: "euconform", version: "1.0.0" },
  target: { rootPath: "/test", name: "test-project", repoType: "web-app", detectedStack: [] },
  aiFootprint: { usesAI: true, inferenceModes: [], providerHints: [], ragHints: [] },
  complianceSignals: {
    disclosure: { status: "absent", confidence: "low", evidence: [] },
    biasTesting: { status: "absent", confidence: "low", evidence: [] },
    reportingExports: { status: "absent", confidence: "low", evidence: [] },
    loggingMonitoring: { status: "absent", confidence: "low", evidence: [] },
    humanOversight: { status: "absent", confidence: "low", evidence: [] },
    dataGovernance: { status: "absent", confidence: "low", evidence: [] },
    incidentReporting: { status: "absent", confidence: "low", evidence: [] },
  },
  assessmentHints: { possibleModes: [], riskIndicators: [], gpaiIndicators: [], openQuestions: [] },
  gaps: [],
  recommendationSummary: [],
};

describe("validateReportJson", () => {
  it("accepts a valid report", () => {
    expect(validateReportJson(VALID_REPORT)).toBe(VALID_REPORT);
  });

  it("rejects wrong schema version", () => {
    expect(() => validateReportJson({ ...VALID_REPORT, schemaVersion: "wrong" })).toThrow(
      'expected "euconform.report.v1"'
    );
  });

  it("rejects missing target", () => {
    const { target, ...rest } = VALID_REPORT;
    expect(() => validateReportJson(rest)).toThrow("missing 'target'");
  });

  it("rejects null input", () => {
    expect(() => validateReportJson(null)).toThrow("expected a JSON object");
  });

  it("rejects missing assessmentHints", () => {
    const { assessmentHints, ...rest } = VALID_REPORT;
    expect(() => validateReportJson(rest)).toThrow("missing 'assessmentHints'");
  });

  it("rejects missing assessmentHints.openQuestions", () => {
    const report = {
      ...VALID_REPORT,
      assessmentHints: { possibleModes: [], riskIndicators: [], gpaiIndicators: [] },
    };
    expect(() => validateReportJson(report)).toThrow("missing 'assessmentHints.openQuestions'");
  });

  it("rejects missing gaps array", () => {
    const { gaps, ...rest } = VALID_REPORT;
    expect(() => validateReportJson(rest)).toThrow("missing 'gaps'");
  });

  it("rejects missing recommendationSummary", () => {
    const { recommendationSummary, ...rest } = VALID_REPORT;
    expect(() => validateReportJson(rest)).toThrow("missing 'recommendationSummary'");
  });

  it("rejects non-string assessmentHints.openQuestions values", () => {
    const report = {
      ...VALID_REPORT,
      assessmentHints: { ...VALID_REPORT.assessmentHints, openQuestions: ["ok", 42] },
    };
    expect(() => validateReportJson(report)).toThrow("must contain strings");
  });

  it("rejects non-string recommendationSummary values", () => {
    const report = { ...VALID_REPORT, recommendationSummary: ["ok", 42] };
    expect(() => validateReportJson(report)).toThrow("must contain strings");
  });

  it("rejects missing generatedAt", () => {
    const { generatedAt, ...rest } = VALID_REPORT;
    expect(() => validateReportJson(rest)).toThrow("missing 'generatedAt'");
  });

  it("rejects missing tool", () => {
    const { tool, ...rest } = VALID_REPORT;
    expect(() => validateReportJson(rest)).toThrow("missing 'tool'");
  });

  it("rejects tool without name", () => {
    const report = { ...VALID_REPORT, tool: { version: "1.0.0" } };
    expect(() => validateReportJson(report)).toThrow("'tool' must have 'name' and 'version'");
  });
});

// ---------------------------------------------------------------------------
// validateAibomJson
// ---------------------------------------------------------------------------

const VALID_AIBOM = {
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
};

describe("validateAibomJson", () => {
  it("accepts a valid AIBOM", () => {
    expect(validateAibomJson(VALID_AIBOM)).toBe(VALID_AIBOM);
  });

  it("rejects wrong schema version", () => {
    expect(() => validateAibomJson({ ...VALID_AIBOM, schemaVersion: "v2" })).toThrow(
      'expected "euconform.aibom.v1"'
    );
  });

  it("rejects missing components", () => {
    const { components, ...rest } = VALID_AIBOM;
    expect(() => validateAibomJson(rest)).toThrow("missing 'components'");
  });

  it("rejects missing generatedAt", () => {
    const { generatedAt, ...rest } = VALID_AIBOM;
    expect(() => validateAibomJson(rest)).toThrow("missing 'generatedAt'");
  });

  it("rejects missing project", () => {
    const { project, ...rest } = VALID_AIBOM;
    expect(() => validateAibomJson(rest)).toThrow("missing 'project'");
  });

  it("rejects missing complianceCapabilities", () => {
    const { complianceCapabilities, ...rest } = VALID_AIBOM;
    expect(() => validateAibomJson(rest)).toThrow("missing 'complianceCapabilities'");
  });
});

// ---------------------------------------------------------------------------
// validateCiJson
// ---------------------------------------------------------------------------

const VALID_CI = {
  schemaVersion: "euconform.ci.v1",
  generatedAt: "2026-01-01T00:00:00Z",
  target: { name: "test", rootPath: "/test" },
  status: {
    failOn: "none",
    failing: false,
    gapCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    openQuestions: 0,
  },
  aiDetected: false,
  scanScope: "all",
  artifacts: [],
  complianceOverview: [],
  topGaps: [],
};

describe("validateCiJson", () => {
  it("accepts a valid CI report", () => {
    expect(validateCiJson(VALID_CI)).toBe(VALID_CI);
  });

  it("rejects wrong schema version", () => {
    expect(() => validateCiJson({ ...VALID_CI, schemaVersion: "wrong" })).toThrow(
      'expected "euconform.ci.v1"'
    );
  });

  it("rejects missing status", () => {
    const { status, ...rest } = VALID_CI;
    expect(() => validateCiJson(rest)).toThrow("missing 'status'");
  });

  it("rejects missing status.gapCounts", () => {
    const ci = { ...VALID_CI, status: { failOn: "none", failing: false, openQuestions: 0 } };
    expect(() => validateCiJson(ci)).toThrow("missing 'status.gapCounts'");
  });

  it("rejects missing status.failOn", () => {
    const ci = {
      ...VALID_CI,
      status: {
        failing: false,
        gapCounts: { critical: 0, high: 0, medium: 0, low: 0 },
        openQuestions: 0,
      },
    };
    expect(() => validateCiJson(ci)).toThrow("missing 'status.failOn'");
  });

  it("rejects missing status.failing", () => {
    const ci = {
      ...VALID_CI,
      status: {
        failOn: "none",
        gapCounts: { critical: 0, high: 0, medium: 0, low: 0 },
        openQuestions: 0,
      },
    };
    expect(() => validateCiJson(ci)).toThrow("missing 'status.failing'");
  });

  it("rejects missing nested gap count fields", () => {
    const ci = {
      ...VALID_CI,
      status: {
        ...VALID_CI.status,
        gapCounts: { critical: 0, high: 0, medium: 0 },
      },
    };
    expect(() => validateCiJson(ci)).toThrow("missing 'status.gapCounts.low'");
  });

  it("rejects missing generatedAt", () => {
    const { generatedAt, ...rest } = VALID_CI;
    expect(() => validateCiJson(rest)).toThrow("missing 'generatedAt'");
  });

  it("rejects missing target", () => {
    const { target, ...rest } = VALID_CI;
    expect(() => validateCiJson(rest)).toThrow("missing 'target'");
  });

  it("rejects missing aiDetected", () => {
    const { aiDetected, ...rest } = VALID_CI;
    expect(() => validateCiJson(rest)).toThrow("missing 'aiDetected'");
  });

  it("rejects missing artifacts", () => {
    const { artifacts, ...rest } = VALID_CI;
    expect(() => validateCiJson(rest)).toThrow("missing 'artifacts'");
  });

  it("rejects missing complianceOverview", () => {
    const { complianceOverview, ...rest } = VALID_CI;
    expect(() => validateCiJson(rest)).toThrow("missing 'complianceOverview'");
  });

  it("rejects missing topGaps", () => {
    const { topGaps, ...rest } = VALID_CI;
    expect(() => validateCiJson(rest)).toThrow("missing 'topGaps'");
  });
});

// ---------------------------------------------------------------------------
// parseFile
// ---------------------------------------------------------------------------

describe("parseFile", () => {
  it("parses report by filename", () => {
    const result = parseFile("euconform.report.json", JSON.stringify(VALID_REPORT));
    expect(result.slot).toBe("report");
  });

  it("parses aibom by filename", () => {
    const result = parseFile("euconform.aibom.json", JSON.stringify(VALID_AIBOM));
    expect(result.slot).toBe("aibom");
  });

  it("parses ci by filename", () => {
    const result = parseFile("euconform.ci.json", JSON.stringify(VALID_CI));
    expect(result.slot).toBe("ci");
  });

  it("parses summary as plain text", () => {
    const result = parseFile("euconform.summary.md", "# Hello\nWorld");
    expect(result.slot).toBe("summary");
    expect(result.data).toBe("# Hello\nWorld");
  });

  it("detects report by schemaVersion when filename is unknown", () => {
    const result = parseFile("scan-output.json", JSON.stringify(VALID_REPORT));
    expect(result.slot).toBe("report");
  });

  it("detects aibom by schemaVersion when filename is unknown", () => {
    const result = parseFile("bom.json", JSON.stringify(VALID_AIBOM));
    expect(result.slot).toBe("aibom");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseFile("euconform.report.json", "not json")).toThrow("Failed to parse");
  });

  it("throws UnrecognizedFileError on unrecognized JSON file", () => {
    expect(() => parseFile("random.json", '{"foo": "bar"}')).toThrow(UnrecognizedFileError);
  });

  it("throws UnrecognizedFileError for arbitrary .md files", () => {
    expect(() => parseFile("README.md", "# Hello")).toThrow(UnrecognizedFileError);
    expect(() => parseFile("notes.md", "Some text")).toThrow(UnrecognizedFileError);
  });
});
