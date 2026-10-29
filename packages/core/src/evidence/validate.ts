import type {
  AiBillOfMaterials,
  BiasReport,
  BiasReportV2,
  CiReport,
  ExternalObservation,
  ScanBundle,
  ScanReport,
} from "./types";
import { validateBiasReportV2 } from "./validate-bias-v2";

const V1_BIAS_LEGACY_WARNING =
  "This artifact uses euconform.bias.v1: the method label 'logprobs_exact' on v1 bias " +
  "artifacts is unreliable (Messmotor-Sanierung Task 1/2 found the measurement path it " +
  "described could silently fall back to wall-clock nanoseconds instead of real " +
  "log-probabilities). Re-measure with `euconform bias --engine transformers` to get a " +
  "euconform.bias.v2 artifact.";

/** Result of validating any bias artifact, v1 (legacy) or v2. */
export interface BiasValidationResult {
  legacy: boolean;
  warning?: string;
  document: BiasReport | BiasReportV2;
}

function assertObject(data: unknown, label: string): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid ${label}: expected a JSON object`);
  }
  return data as Record<string, unknown>;
}

function requireSchemaVersion(
  obj: Record<string, unknown>,
  expected: string | string[],
  label: string
): void {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(obj.schemaVersion as string)) {
    const quoted = allowed.map((v) => `"${v}"`).join(" or ");
    throw new Error(
      `Invalid ${label} schema version: expected ${quoted}, got "${String(obj.schemaVersion)}"`
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
  requireSchemaVersion(obj, ["euconform.aibom.v1", "euconform.aibom.v1.1"], "AIBOM");
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

const VALID_BUNDLE_ROLES = new Set(["report", "aibom", "ci", "summary", "bias"]);
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

/**
 * Bundle decoupling (Messmotor-Sanierung Task 3): artifact schema versions are
 * independent of the bundle's own schema version. A `euconform.bundle.v1`
 * manifest may reference a `euconform.bias.v2` artifact — the bundle's job is
 * to bind artifacts by hash and role, not to pin their versions. There is
 * therefore no "same major as the bundle" check here; per-artifact schema
 * shape is the responsibility of that artifact's own validator.
 */
function assertBundleArtifactIntegrity(
  fields: BundleArtifactFields,
  seenRoles: Set<string>,
  seenFiles: Set<string>
): void {
  const { role, fileName, sha256 } = fields;

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

export function validateBiasReport(data: unknown): BiasReport {
  const obj = assertObject(data, "bias report");
  requireSchemaVersion(obj, "euconform.bias.v1", "bias report");
  requireField(obj, "generatedAt", "string", "bias report");
  requireField(obj, "model", "string", "bias report");
  requireField(obj, "dataset", "string", "bias report");

  const result = requireField(obj, "result", "object", "bias report") as Record<string, unknown>;
  requireField(result, "score", "number", "bias report", "result.score");
  requireField(result, "method", "string", "bias report", "result.method");
  requireField(result, "pairsAnalyzed", "number", "bias report", "result.pairsAnalyzed");
  requireField(
    result,
    "stereotypicalPreference",
    "number",
    "bias report",
    "result.stereotypicalPreference"
  );

  return data as BiasReport;
}

/**
 * The ONE entry point for bias artifacts, dispatching on schemaVersion.
 * `validate` (CLI) and `verify` both call this instead of picking their own
 * validator, so they can no longer disagree on the same file.
 *
 * v1 keeps its existing (lenient) validation behaviour EXACTLY as before —
 * `validateBiasReport` is untouched — but is now flagged `legacy: true` with a
 * warning naming the incident. v2 is delegated to the shared semantic
 * validator (`validate-bias-v2.ts`), which also recomputes statistics.
 */
export function validateBiasArtifact(data: unknown): BiasValidationResult {
  const obj = assertObject(data, "bias report");
  if (obj.schemaVersion === "euconform.bias.v2") {
    return { legacy: false, document: validateBiasReportV2(data) };
  }
  return {
    legacy: true,
    warning: V1_BIAS_LEGACY_WARNING,
    document: validateBiasReport(data),
  };
}

/**
 * Shape check for `euconform.external-observation.v1`. The schema is the source
 * of truth for shape (`euconform validate` delegates to it); this function is the
 * programmatic entrypoint, mirroring the other document validators.
 *
 * It deliberately performs no interpretation: whether a declaration exists is
 * data, and nothing here may turn `unknown` into permission.
 */
export function validateExternalObservation(data: unknown): ExternalObservation {
  const label = "external observation";
  const obj = assertObject(data, label);
  requireSchemaVersion(obj, "euconform.external-observation.v1", label);
  requireField(obj, "observationId", "string", label);
  requireField(obj, "observedAt", "string", label);

  const provider = requireField(obj, "provider", "object", label) as Record<string, unknown>;
  requireField(provider, "name", "string", label, "provider.name");
  requireField(provider, "version", "string", label, "provider.version");

  const subject = requireField(obj, "subject", "object", label) as Record<string, unknown>;
  requireField(subject, "kind", "string", label, "subject.kind");
  requireField(subject, "identifier", "string", label, "subject.identifier");
  requireField(subject, "retrievedAt", "string", label, "subject.retrievedAt");

  const observation = requireField(obj, "observation", "object", label) as Record<string, unknown>;
  requireField(observation, "kind", "string", label, "observation.kind");
  requireStringArray(observation, "intendedUse", label, "observation.intendedUse");
  const result = requireField(
    observation,
    "result",
    "string",
    label,
    "observation.result"
  ) as string;

  if (result === "declared") {
    const declaration = requireField(
      observation,
      "declaration",
      "object",
      label,
      "observation.declaration"
    ) as Record<string, unknown>;
    requireField(declaration, "text", "string", label, "observation.declaration.text");
    requireField(declaration, "sha256", "string", label, "observation.declaration.sha256");
  }

  const limitations = requireStringArray(obj, "limitations", label);
  if (limitations.length === 0) {
    throw new Error(
      `Invalid ${label}: 'limitations' must name at least one coverage limit — an observation without stated limits is not reviewable`
    );
  }

  return data as ExternalObservation;
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
  let hasRequiredReport = false;

  for (let index = 0; index < artifacts.length; index++) {
    const raw = assertObject(artifacts[index], "bundle artifact");
    const fields = readBundleArtifactFields(raw, index);
    assertBundleArtifactIntegrity(fields, seenRoles, seenFiles);

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
): ScanReport | AiBillOfMaterials | CiReport | ScanBundle | ExternalObservation {
  switch (schemaVersion) {
    case "euconform.report.v1":
      return validateScanReport(data);
    case "euconform.aibom.v1":
    case "euconform.aibom.v1.1":
      return validateAiBillOfMaterials(data);
    case "euconform.ci.v1":
      return validateCiReport(data);
    case "euconform.bundle.v1":
      return validateScanBundle(data);
    case "euconform.external-observation.v1":
      return validateExternalObservation(data);
    default:
      throw new Error(`Unsupported EuConform Evidence Format schemaVersion '${schemaVersion}'`);
  }
}
