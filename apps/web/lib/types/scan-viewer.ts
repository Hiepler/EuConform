import type { AiBillOfMaterials, CiReport, ScanReport } from "@euconform/core/evidence";

export interface ImportedScanBundle {
  report: ScanReport;
  aibom: AiBillOfMaterials | null;
  ciReport: CiReport | null;
  summaryMarkdown: string | null;
  validationErrors: string[];
  ignoredFiles: string[];
}

export type ScanFileSlot = "report" | "aibom" | "ci" | "summary";

export interface ScanFileStatus {
  slot: ScanFileSlot;
  fileName: string | null;
  accepted: boolean;
  error: string | null;
  required: boolean;
}

export const SCAN_FILE_SLOTS: Record<ScanFileSlot, { pattern: string; required: boolean }> = {
  report: { pattern: "euconform.report.json", required: true },
  aibom: { pattern: "euconform.aibom.json", required: false },
  ci: { pattern: "euconform.ci.json", required: false },
  summary: { pattern: "euconform.summary.md", required: false },
};
