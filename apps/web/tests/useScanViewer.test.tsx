import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useScanViewer } from "../lib/hooks/useScanViewer";

interface MockFile {
  name: string;
  text: () => Promise<string>;
}

function createMockFile(name: string, content: string): MockFile {
  return {
    name,
    text: async () => content,
  };
}

function createFileList(files: MockFile[]): FileList {
  return Object.assign(files, {
    item: (index: number) => files[index] ?? null,
  }) as unknown as FileList;
}

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

describe("useScanViewer", () => {
  it("keeps valid report imports even when optional files are invalid or ignored", async () => {
    const { result } = renderHook(() => useScanViewer());
    const files = createFileList([
      createMockFile("euconform.report.json", JSON.stringify(VALID_REPORT)),
      createMockFile("euconform.ci.json", '{"schemaVersion":"euconform.ci.v1","status":{}}'),
      createMockFile("README.md", "# Unrelated"),
    ]);

    await act(async () => {
      await result.current.handleFilesSelected(files);
    });

    expect(result.current.bundle).not.toBeNull();
    expect(result.current.bundle?.report.schemaVersion).toBe("euconform.report.v1");
    expect(result.current.bundle?.ciReport).toBeNull();
    expect(result.current.bundle?.ignoredFiles).toEqual(["README.md"]);
    expect(
      result.current.bundle?.validationErrors.some((error) => error.includes("euconform.ci.json"))
    ).toBe(true);
    expect(result.current.importError).toBeNull();
  });

  it("reports a hard import error when no valid report is present", async () => {
    const { result } = renderHook(() => useScanViewer());
    const files = createFileList([
      createMockFile("README.md", "# Not a scan summary"),
      createMockFile("random.json", '{"foo":"bar"}'),
    ]);

    await act(async () => {
      await result.current.handleFilesSelected(files);
    });

    expect(result.current.bundle).toBeNull();
    expect(result.current.importError).toBe("scan_viewer_no_report");
    expect(result.current.fileStatuses.find((status) => status.slot === "report")?.accepted).toBe(
      false
    );
  });
});
