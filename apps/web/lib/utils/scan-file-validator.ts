import type { AiBillOfMaterials, CiReport, ScanReport } from "@euconform/core/evidence";
import type { ScanFileSlot } from "../types/scan-viewer";

export class UnrecognizedFileError extends Error {
  constructor(fileName: string) {
    super(`Unrecognized file: ${fileName}`);
    this.name = "UnrecognizedFileError";
  }
}

// ---------------------------------------------------------------------------
// File identification
// ---------------------------------------------------------------------------

const FILE_NAME_MAP: Record<string, ScanFileSlot> = {
  "euconform.report.json": "report",
  "euconform.aibom.json": "aibom",
  "euconform.ci.json": "ci",
  "euconform.summary.md": "summary",
};

const SCHEMA_VERSION_MAP: Record<string, ScanFileSlot> = {
  "euconform.report.v1": "report",
  "euconform.aibom.v1": "aibom",
  "euconform.ci.v1": "ci",
};

export function identifyFileSlot(fileName: string): ScanFileSlot | null {
  const baseName = fileName.split("/").pop() ?? fileName;
  return FILE_NAME_MAP[baseName] ?? null;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function validateReportJson(data: unknown): ScanReport {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid report: expected a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== "euconform.report.v1") {
    throw new Error(
      `Invalid report schema version: expected "euconform.report.v1", got "${String(obj.schemaVersion)}"`
    );
  }
  if (!obj.target || typeof obj.target !== "object") {
    throw new Error("Invalid report: missing 'target' field");
  }
  if (!obj.aiFootprint || typeof obj.aiFootprint !== "object") {
    throw new Error("Invalid report: missing 'aiFootprint' field");
  }
  if (!obj.complianceSignals || typeof obj.complianceSignals !== "object") {
    throw new Error("Invalid report: missing 'complianceSignals' field");
  }
  if (!obj.assessmentHints || typeof obj.assessmentHints !== "object") {
    throw new Error("Invalid report: missing 'assessmentHints' field");
  }
  const hints = obj.assessmentHints as Record<string, unknown>;
  if (!Array.isArray(hints.openQuestions)) {
    throw new Error("Invalid report: missing 'assessmentHints.openQuestions' array");
  }
  if (!Array.isArray(obj.gaps)) {
    throw new Error("Invalid report: missing 'gaps' array");
  }
  if (!Array.isArray(obj.recommendationSummary)) {
    throw new Error("Invalid report: missing 'recommendationSummary' array");
  }
  return data as ScanReport;
}

export function validateAibomJson(data: unknown): AiBillOfMaterials {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid AIBOM: expected a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== "euconform.aibom.v1") {
    throw new Error(
      `Invalid AIBOM schema version: expected "euconform.aibom.v1", got "${String(obj.schemaVersion)}"`
    );
  }
  if (!Array.isArray(obj.components)) {
    throw new Error("Invalid AIBOM: missing 'components' array");
  }
  return data as AiBillOfMaterials;
}

export function validateCiJson(data: unknown): CiReport {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid CI report: expected a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== "euconform.ci.v1") {
    throw new Error(
      `Invalid CI report schema version: expected "euconform.ci.v1", got "${String(obj.schemaVersion)}"`
    );
  }
  if (!obj.status || typeof obj.status !== "object") {
    throw new Error("Invalid CI report: missing 'status' field");
  }
  const status = obj.status as Record<string, unknown>;
  if (!status.gapCounts || typeof status.gapCounts !== "object") {
    throw new Error("Invalid CI report: missing 'status.gapCounts' field");
  }
  if (typeof status.failOn !== "string") {
    throw new Error("Invalid CI report: missing 'status.failOn' field");
  }
  if (typeof status.failing !== "boolean") {
    throw new Error("Invalid CI report: missing 'status.failing' field");
  }
  return data as CiReport;
}

// ---------------------------------------------------------------------------
// Parse a single file
// ---------------------------------------------------------------------------

export type ParsedFile =
  | { slot: "report"; data: ScanReport }
  | { slot: "aibom"; data: AiBillOfMaterials }
  | { slot: "ci"; data: CiReport }
  | { slot: "summary"; data: string };

type JsonSlot = "report" | "aibom" | "ci";

const JSON_VALIDATORS: Record<
  JsonSlot,
  (data: unknown) => ScanReport | AiBillOfMaterials | CiReport
> = {
  report: validateReportJson,
  aibom: validateAibomJson,
  ci: validateCiJson,
};

function validateJsonSlot(slot: JsonSlot, parsed: unknown): ParsedFile {
  return { slot, data: JSON_VALIDATORS[slot](parsed) } as ParsedFile;
}

function detectSlotBySchema(parsed: unknown): JsonSlot | null {
  if (!parsed || typeof parsed !== "object") return null;
  const sv = (parsed as Record<string, unknown>).schemaVersion;
  if (typeof sv !== "string") return null;
  return (SCHEMA_VERSION_MAP[sv] as JsonSlot) ?? null;
}

export function parseFile(fileName: string, content: string): ParsedFile {
  const slot = identifyFileSlot(fileName);

  if (slot === "summary") {
    return { slot: "summary", data: content };
  }

  const baseName = fileName.split("/").pop() ?? fileName;
  if (!baseName.endsWith(".json")) {
    throw new UnrecognizedFileError(fileName);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse ${fileName} as JSON`);
  }

  const resolvedSlot = (slot as JsonSlot | null) ?? detectSlotBySchema(parsed);
  if (resolvedSlot) {
    return validateJsonSlot(resolvedSlot, parsed);
  }

  throw new UnrecognizedFileError(fileName);
}
