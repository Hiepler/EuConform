import { describe, expect, it } from "vitest";
import { buildBundleManifest } from "../../src/evidence/bundle";

const REPORT_CONTENT = JSON.stringify({
  schemaVersion: "euconform.report.v1",
  generatedAt: "2026-01-01T00:00:00Z",
});

const AIBOM_CONTENT = JSON.stringify({
  schemaVersion: "euconform.aibom.v1",
  generatedAt: "2026-01-01T00:00:00Z",
});

const CI_CONTENT = JSON.stringify({
  schemaVersion: "euconform.ci.v1",
  generatedAt: "2026-01-01T00:00:00Z",
});

const SUMMARY_CONTENT = "# EuConform Scan Report\n\nSummary here.";

const BASE_OPTS = {
  tool: { name: "euconform", version: "1.0.0" },
  target: { name: "test-project", rootPath: "/test" },
  generatedAt: "2026-01-01T00:00:00Z",
};

describe("buildBundleManifest", () => {
  it("produces a valid bundle with all artifacts", () => {
    const bundle = buildBundleManifest({
      ...BASE_OPTS,
      report: { content: REPORT_CONTENT, fileName: "euconform.report.json" },
      aibom: { content: AIBOM_CONTENT, fileName: "euconform.aibom.json" },
      ci: { content: CI_CONTENT, fileName: "euconform.ci.json" },
      summary: { content: SUMMARY_CONTENT, fileName: "euconform.summary.md" },
    });

    expect(bundle.schemaVersion).toBe("euconform.bundle.v1");
    expect(bundle.generatedAt).toBe("2026-01-01T00:00:00Z");
    expect(bundle.tool).toEqual({ name: "euconform", version: "1.0.0" });
    expect(bundle.target).toEqual({ name: "test-project", rootPath: "/test" });
    expect(bundle.artifacts).toHaveLength(4);
  });

  it("sets report as required and others as optional", () => {
    const bundle = buildBundleManifest({
      ...BASE_OPTS,
      report: { content: REPORT_CONTENT, fileName: "euconform.report.json" },
      aibom: { content: AIBOM_CONTENT, fileName: "euconform.aibom.json" },
    });

    const report = bundle.artifacts.find((a) => a.role === "report");
    const aibom = bundle.artifacts.find((a) => a.role === "aibom");
    expect(report?.required).toBe(true);
    expect(aibom?.required).toBe(false);
  });

  it("produces valid SHA-256 hex hashes", () => {
    const bundle = buildBundleManifest({
      ...BASE_OPTS,
      report: { content: REPORT_CONTENT, fileName: "euconform.report.json" },
    });

    for (const artifact of bundle.artifacts) {
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("extracts schemaVersion from JSON artifacts", () => {
    const bundle = buildBundleManifest({
      ...BASE_OPTS,
      report: { content: REPORT_CONTENT, fileName: "euconform.report.json" },
      aibom: { content: AIBOM_CONTENT, fileName: "euconform.aibom.json" },
      ci: { content: CI_CONTENT, fileName: "euconform.ci.json" },
    });

    expect(bundle.artifacts.find((a) => a.role === "report")?.schemaVersion).toBe(
      "euconform.report.v1"
    );
    expect(bundle.artifacts.find((a) => a.role === "aibom")?.schemaVersion).toBe(
      "euconform.aibom.v1"
    );
    expect(bundle.artifacts.find((a) => a.role === "ci")?.schemaVersion).toBe("euconform.ci.v1");
  });

  it("sets mimeType for non-JSON artifacts", () => {
    const bundle = buildBundleManifest({
      ...BASE_OPTS,
      report: { content: REPORT_CONTENT, fileName: "euconform.report.json" },
      summary: { content: SUMMARY_CONTENT, fileName: "euconform.summary.md" },
    });

    const summary = bundle.artifacts.find((a) => a.role === "summary");
    expect(summary?.mimeType).toBe("text/markdown");
    expect(summary?.schemaVersion).toBeUndefined();

    const report = bundle.artifacts.find((a) => a.role === "report");
    expect(report?.mimeType).toBeUndefined();
  });

  it("excludes missing optional artifacts", () => {
    const bundle = buildBundleManifest({
      ...BASE_OPTS,
      report: { content: REPORT_CONTENT, fileName: "euconform.report.json" },
    });

    expect(bundle.artifacts).toHaveLength(1);
    expect(bundle.artifacts[0]?.role).toBe("report");
  });

  it("produces different hashes for different content", () => {
    const bundle1 = buildBundleManifest({
      ...BASE_OPTS,
      report: {
        content: '{"schemaVersion":"euconform.report.v1","a":1}',
        fileName: "euconform.report.json",
      },
    });
    const bundle2 = buildBundleManifest({
      ...BASE_OPTS,
      report: {
        content: '{"schemaVersion":"euconform.report.v1","a":2}',
        fileName: "euconform.report.json",
      },
    });

    expect(bundle1.artifacts[0]?.sha256).not.toBe(bundle2.artifacts[0]?.sha256);
  });
});
