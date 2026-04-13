import type { AiBillOfMaterials, CiReport, ScanBundle, ScanReport } from "./types";

function assertObject(data: unknown, label: string): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid ${label}: expected a JSON object`);
  }
  return data as Record<string, unknown>;
}

function requireSchemaVersion(obj: Record<string, unknown>, expected: string, label: string): void {
  if (obj.schemaVersion !== expected) {
    throw new Error(
      `Invalid ${label} schema version: expected "${expected}", got "${String(obj.schemaVersion)}"`
    );
  }
}

function requireField(
  obj: Record<string, unknown>,
  key: string,
  type: "string" | "boolean" | "object" | "array" | "number",
  label: string,
  fieldName = key
): unknown {
  if (!(key in obj)) {
    throw new Error(`Invalid ${label}: missing '${fieldName}'`);
  }

  const value = obj[key];
  const isValid =
    (type === "array" && Array.isArray(value)) ||
    (type === "object" && value && typeof value === "object" && !Array.isArray(value)) ||
    (type === "string" && typeof value === "string") ||
    (type === "boolean" && typeof value === "boolean") ||
    (type === "number" && typeof value === "number");

  if (!isValid) {
    throw new Error(`Invalid ${label}: '${fieldName}' must be a ${type}`);
  }

  return value;
}

function requireStringArray(
  obj: Record<string, unknown>,
  key: string,
  label: string,
  fieldName = key
): string[] {
  const value = requireField(obj, key, "array", label, fieldName) as unknown[];
  if (!value.every((item) => typeof item === "string")) {
    throw new Error(`Invalid ${label}: '${fieldName}' must contain strings`);
  }
  return value as string[];
}

function majorVersion(schemaVersion: string): string | null {
  const match = /\.v(\d+)$/.exec(schemaVersion);
  return match?.[1] ?? null;
}

export function getSchemaMajorVersion(schemaVersion: string): string | null {
  return majorVersion(schemaVersion);
}

export function validateScanReport(data: unknown): ScanReport {
  const obj = assertObject(data, "report");
  requireSchemaVersion(obj, "euconform.report.v1", "report");
  requireField(obj, "generatedAt", "string", "report");

  const tool = requireField(obj, "tool", "object", "report") as Record<string, unknown>;
  requireField(tool, "name", "string", "report", "tool.name");
  requireField(tool, "version", "string", "report", "tool.version");

  const target = requireField(obj, "target", "object", "report") as Record<string, unknown>;
  requireField(target, "rootPath", "string", "report", "target.rootPath");
  requireField(target, "name", "string", "report", "target.name");
  requireField(target, "repoType", "string", "report", "target.repoType");
  requireField(target, "detectedStack", "array", "report", "target.detectedStack");

  const aiFootprint = requireField(obj, "aiFootprint", "object", "report") as Record<
    string,
    unknown
  >;
  requireField(aiFootprint, "usesAI", "boolean", "report", "aiFootprint.usesAI");
  requireStringArray(aiFootprint, "inferenceModes", "report", "aiFootprint.inferenceModes");
  requireStringArray(aiFootprint, "providerHints", "report", "aiFootprint.providerHints");
  requireStringArray(aiFootprint, "ragHints", "report", "aiFootprint.ragHints");

  requireField(obj, "complianceSignals", "object", "report");
  const hints = requireField(obj, "assessmentHints", "object", "report") as Record<string, unknown>;
  requireStringArray(hints, "possibleModes", "report", "assessmentHints.possibleModes");
  requireField(hints, "riskIndicators", "array", "report", "assessmentHints.riskIndicators");
  requireField(hints, "gpaiIndicators", "array", "report", "assessmentHints.gpaiIndicators");
  requireStringArray(hints, "openQuestions", "report", "assessmentHints.openQuestions");

  requireField(obj, "gaps", "array", "report");
  requireStringArray(obj, "recommendationSummary", "report");

  return data as ScanReport;
}

export function validateAiBillOfMaterials(data: unknown): AiBillOfMaterials {
  const obj = assertObject(data, "AIBOM");
  requireSchemaVersion(obj, "euconform.aibom.v1", "AIBOM");
  requireField(obj, "generatedAt", "string", "AIBOM");

  const project = requireField(obj, "project", "object", "AIBOM") as Record<string, unknown>;
  requireField(project, "name", "string", "AIBOM", "project.name");
  requireField(project, "rootPath", "string", "AIBOM", "project.rootPath");

  requireField(obj, "components", "array", "AIBOM");
  requireField(obj, "complianceCapabilities", "object", "AIBOM");

  return data as AiBillOfMaterials;
}

export function validateCiReport(data: unknown): CiReport {
  const obj = assertObject(data, "CI report");
  requireSchemaVersion(obj, "euconform.ci.v1", "CI report");
  requireField(obj, "generatedAt", "string", "CI report");

  const target = requireField(obj, "target", "object", "CI report") as Record<string, unknown>;
  requireField(target, "name", "string", "CI report", "target.name");
  requireField(target, "rootPath", "string", "CI report", "target.rootPath");

  const status = requireField(obj, "status", "object", "CI report") as Record<string, unknown>;
  requireField(status, "failOn", "string", "CI report", "status.failOn");
  requireField(status, "failing", "boolean", "CI report", "status.failing");
  requireField(status, "openQuestions", "number", "CI report", "status.openQuestions");

  const gapCounts = requireField(
    status,
    "gapCounts",
    "object",
    "CI report",
    "status.gapCounts"
  ) as Record<string, unknown>;
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

const VALID_BUNDLE_ROLES = new Set(["report", "aibom", "ci", "summary"]);
const SHA256_HEX = /^[a-f0-9]{64}$/;

interface BundleArtifactFields {
  role: string;
  fileName: string;
  sha256: string;
  required: boolean;
  declaredSchemaVersion: string | undefined;
  mimeType: string | undefined;
}

function readBundleArtifactFields(
  raw: Record<string, unknown>,
  index: number
): BundleArtifactFields {
  const scope = "bundle artifact";
  const role = requireField(raw, "role", "string", scope, `artifacts[${index}].role`) as string;
  const fileName = requireField(
    raw,
    "fileName",
    "string",
    scope,
    `artifacts[${index}].fileName`
  ) as string;
  const sha256 = requireField(
    raw,
    "sha256",
    "string",
    scope,
    `artifacts[${index}].sha256`
  ) as string;
  const required = requireField(
    raw,
    "required",
    "boolean",
    scope,
    `artifacts[${index}].required`
  ) as boolean;

  const declaredSchemaVersion = raw.schemaVersion;
  if (declaredSchemaVersion !== undefined && typeof declaredSchemaVersion !== "string") {
    throw new Error(`Invalid bundle artifact: '${fileName}' has non-string schemaVersion`);
  }
  if (raw.mimeType !== undefined && typeof raw.mimeType !== "string") {
    throw new Error(`Invalid bundle artifact: '${fileName}' has non-string mimeType`);
  }

  return {
    role,
    fileName,
    sha256,
    required,
    declaredSchemaVersion: declaredSchemaVersion as string | undefined,
    mimeType: raw.mimeType as string | undefined,
  };
}

function assertBundleArtifactIntegrity(
  fields: BundleArtifactFields,
  seenRoles: Set<string>,
  seenFiles: Set<string>,
  bundleMajor: string | null
): void {
  const { role, fileName, sha256, declaredSchemaVersion } = fields;

  if (!VALID_BUNDLE_ROLES.has(role)) {
    throw new Error(`Invalid bundle artifact: unsupported role '${role}'`);
  }
  if (!SHA256_HEX.test(sha256)) {
    throw new Error(`Invalid bundle artifact: '${fileName}' has invalid sha256`);
  }
  if (seenRoles.has(role)) {
    throw new Error(`Invalid bundle artifact: duplicate role '${role}'`);
  }
  if (seenFiles.has(fileName)) {
    throw new Error(`Invalid bundle artifact: duplicate fileName '${fileName}'`);
  }
  if (declaredSchemaVersion && bundleMajor && majorVersion(declaredSchemaVersion) !== bundleMajor) {
    throw new Error(
      `Invalid bundle artifact: '${fileName}' uses schemaVersion '${declaredSchemaVersion}' with a different major than the bundle`
    );
  }
}

function validateBundleHeader(obj: Record<string, unknown>): void {
  requireSchemaVersion(obj, "euconform.bundle.v1", "bundle");
  requireField(obj, "generatedAt", "string", "bundle");

  const tool = requireField(obj, "tool", "object", "bundle") as Record<string, unknown>;
  requireField(tool, "name", "string", "bundle", "tool.name");
  requireField(tool, "version", "string", "bundle", "tool.version");

  const target = requireField(obj, "target", "object", "bundle") as Record<string, unknown>;
  requireField(target, "name", "string", "bundle", "target.name");
  requireField(target, "rootPath", "string", "bundle", "target.rootPath");
}

export function validateScanBundle(data: unknown): ScanBundle {
  const obj = assertObject(data, "bundle");
  validateBundleHeader(obj);

  const artifacts = requireField(obj, "artifacts", "array", "bundle") as unknown[];
  if (artifacts.length === 0) {
    throw new Error("Invalid bundle: 'artifacts' must contain at least one artifact");
  }

  const seenRoles = new Set<string>();
  const seenFiles = new Set<string>();
  const bundleMajor = majorVersion("euconform.bundle.v1");
  let hasRequiredReport = false;

  for (let index = 0; index < artifacts.length; index++) {
    const raw = assertObject(artifacts[index], "bundle artifact");
    const fields = readBundleArtifactFields(raw, index);
    assertBundleArtifactIntegrity(fields, seenRoles, seenFiles, bundleMajor);

    seenRoles.add(fields.role);
    seenFiles.add(fields.fileName);

    if (fields.role === "report") {
      hasRequiredReport = fields.required;
    }
  }

  if (!hasRequiredReport) {
    throw new Error("Invalid bundle: a required 'report' artifact is mandatory");
  }

  return data as ScanBundle;
}

export function validateEcefJsonDocument(
  schemaVersion: string,
  data: unknown
): ScanReport | AiBillOfMaterials | CiReport | ScanBundle {
  switch (schemaVersion) {
    case "euconform.report.v1":
      return validateScanReport(data);
    case "euconform.aibom.v1":
      return validateAiBillOfMaterials(data);
    case "euconform.ci.v1":
      return validateCiReport(data);
    case "euconform.bundle.v1":
      return validateScanBundle(data);
    default:
      throw new Error(`Unsupported EuConform Evidence Format schemaVersion '${schemaVersion}'`);
  }
}
