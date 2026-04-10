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
// Validation helpers
// ---------------------------------------------------------------------------

function assertObject(data: unknown, label: string): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    throw new Error(`Invalid ${label}: expected a JSON object`);
  }
  return data as Record<string, unknown>;
}

function requireField(
  obj: Record<string, unknown>,
  field: string,
  type: "string" | "boolean" | "number" | "object" | "array",
  label: string,
  path = field
): unknown {
  const value = obj[field];
  if (type === "array") {
    if (!Array.isArray(value)) throw new Error(`Invalid ${label}: missing '${path}' array`);
    return value;
  }
  if (type === "object") {
    if (!value || typeof value !== "object")
      throw new Error(`Invalid ${label}: missing '${path}' field`);
    return value as Record<string, unknown>;
  }
  if (type === "string" && typeof value !== "string") {
    throw new Error(`Invalid ${label}: missing '${path}' field`);
  }
  if (type === "boolean" && typeof value !== "boolean") {
    throw new Error(`Invalid ${label}: missing '${path}' field`);
  }
  if (type === "number" && typeof value !== "number") {
    throw new Error(`Invalid ${label}: missing '${path}' field`);
  }
  return value;
}

function requireSchemaVersion(obj: Record<string, unknown>, expected: string, label: string): void {
  if (obj.schemaVersion !== expected) {
    throw new Error(
      `Invalid ${label} schema version: expected "${expected}", got "${String(obj.schemaVersion)}"`
    );
  }
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function validateReportJson(data: unknown): ScanReport {
  const obj = assertObject(data, "report");
  requireSchemaVersion(obj, "euconform.report.v1", "report");
  requireField(obj, "generatedAt", "string", "report");
  const tool = requireField(obj, "tool", "object", "report") as Record<string, unknown>;
  if (typeof tool.name !== "string" || typeof tool.version !== "string") {
    throw new Error("Invalid report: 'tool' must have 'name' and 'version' strings");
  }
  requireField(obj, "target", "object", "report");
  requireField(obj, "aiFootprint", "object", "report");
  requireField(obj, "complianceSignals", "object", "report");
  const hints = requireField(obj, "assessmentHints", "object", "report") as Record<string, unknown>;
  const openQuestions = requireField(
    hints,
    "openQuestions",
    "array",
    "report",
    "assessmentHints.openQuestions"
  ) as unknown[];
  if (!openQuestions.every((item) => typeof item === "string")) {
    throw new Error("Invalid report: 'assessmentHints.openQuestions' must contain strings");
  }
  requireField(obj, "gaps", "array", "report");
  const recommendations = requireField(
    obj,
    "recommendationSummary",
    "array",
    "report"
  ) as unknown[];
  if (!recommendations.every((item) => typeof item === "string")) {
    throw new Error("Invalid report: 'recommendationSummary' must contain strings");
  }
  return data as ScanReport;
}

export function validateAibomJson(data: unknown): AiBillOfMaterials {
  const obj = assertObject(data, "AIBOM");
  requireSchemaVersion(obj, "euconform.aibom.v1", "AIBOM");
  requireField(obj, "generatedAt", "string", "AIBOM");
  const project = requireField(obj, "project", "object", "AIBOM") as Record<string, unknown>;
  if (typeof project.name !== "string") {
    throw new Error("Invalid AIBOM: 'project' must have a 'name' string");
  }
  requireField(obj, "components", "array", "AIBOM");
  requireField(obj, "complianceCapabilities", "object", "AIBOM");
  return data as AiBillOfMaterials;
}

export function validateCiJson(data: unknown): CiReport {
  const obj = assertObject(data, "CI report");
  requireSchemaVersion(obj, "euconform.ci.v1", "CI report");
  requireField(obj, "generatedAt", "string", "CI report");
  requireField(obj, "target", "object", "CI report");
  const status = requireField(obj, "status", "object", "CI report") as Record<string, unknown>;
  const gapCounts = requireField(
    status,
    "gapCounts",
    "object",
    "CI report",
    "status.gapCounts"
  ) as Record<string, unknown>;
  requireField(status, "failOn", "string", "CI report", "status.failOn");
  requireField(status, "failing", "boolean", "CI report", "status.failing");
  for (const key of ["critical", "high", "medium", "low"] as const) {
    requireField(gapCounts, key, "number", "CI report", `status.gapCounts.${key}`);
  }
  requireField(obj, "aiDetected", "boolean", "CI report");
  requireField(obj, "scanScope", "string", "CI report");
  requireField(obj, "artifacts", "array", "CI report");
  requireField(obj, "complianceOverview", "array", "CI report");
  requireField(obj, "topGaps", "array", "CI report");
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
