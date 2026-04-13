import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  getSchemaMajorVersion,
  sha256Hex,
  validateAiBillOfMaterials,
  validateCiReport,
  validateScanBundle,
  validateScanReport,
} from "@euconform/core/evidence";
import type { AiBillOfMaterials, CiReport, ScanBundle, ScanReport } from "@euconform/core/evidence";
import { strFromU8, unzipSync } from "fflate";

export type VerifySeverity = "warning" | "error";
export type VerifyStatus = "valid" | "warnings" | "errors";
export type VerifyInputType = "bundle-json" | "bundle-dir" | "bundle-zip";
export type VerifyFailOn = "warnings" | "errors";

export interface VerifyIssue {
  artifact?: string;
  code: string;
  message: string;
  severity: VerifySeverity;
}

export interface VerifiedArtifact {
  fileName: string;
  hashStatus: "match" | "mismatch" | "missing";
  metadataStatus: "match" | "mismatch" | "skipped";
  required: boolean;
  role: string;
  schemaStatus: "valid" | "invalid" | "skipped";
  schemaVersion?: string;
}

export interface VerifyBundleReport {
  artifacts: VerifiedArtifact[];
  bundle: {
    generatedAt: string;
    schemaVersion: string;
    target: { name: string; rootPath: string };
    tool: { name: string; version: string };
  } | null;
  bundlePath: string;
  errors: VerifyIssue[];
  inputType: VerifyInputType;
  status: VerifyStatus;
  warnings: VerifyIssue[];
}

interface LoadedBundleInput {
  artifactLoader: (fileName: string) => Promise<string | null>;
  bundlePath: string;
  inputType: VerifyInputType;
  manifestContent: string;
}

function createReport(bundlePath: string, inputType: VerifyInputType): VerifyBundleReport {
  return {
    bundle: null,
    bundlePath,
    inputType,
    artifacts: [],
    warnings: [],
    errors: [],
    status: "valid",
  };
}

function addIssue(
  report: VerifyBundleReport,
  severity: VerifySeverity,
  issue: Omit<VerifyIssue, "severity">
) {
  const finding = { severity, ...issue };
  if (severity === "error") {
    report.errors.push(finding);
  } else {
    report.warnings.push(finding);
  }
}

function finalizeReport(report: VerifyBundleReport): VerifyBundleReport {
  report.status =
    report.errors.length > 0 ? "errors" : report.warnings.length > 0 ? "warnings" : "valid";
  return report;
}

async function loadBundleInput(inputPath: string): Promise<LoadedBundleInput> {
  const resolved = resolve(inputPath);
  const stats = await import("node:fs/promises").then(({ stat }) => stat(resolved));

  if (stats.isDirectory()) {
    const bundlePath = join(resolved, "euconform.bundle.json");
    const manifestContent = await readFile(bundlePath, "utf8");
    return {
      inputType: "bundle-dir",
      bundlePath,
      manifestContent,
      artifactLoader: async (fileName) => {
        try {
          return await readFile(join(resolved, fileName), "utf8");
        } catch {
          return null;
        }
      },
    };
  }

  if (resolved.endsWith(".zip")) {
    const zipData = await readFile(resolved);
    const archive = unzipSync(new Uint8Array(zipData));
    const manifest = archive["euconform.bundle.json"];
    if (!manifest) {
      throw new Error("Bundle ZIP does not contain euconform.bundle.json");
    }

    return {
      inputType: "bundle-zip",
      bundlePath: resolved,
      manifestContent: strFromU8(manifest),
      artifactLoader: async (fileName) => {
        const entry = archive[fileName];
        return entry ? strFromU8(entry) : null;
      },
    };
  }

  const manifestContent = await readFile(resolved, "utf8");
  return {
    inputType: "bundle-json",
    bundlePath: resolved,
    manifestContent,
    artifactLoader: async (fileName) => {
      try {
        return await readFile(join(dirname(resolved), fileName), "utf8");
      } catch {
        return null;
      }
    },
  };
}

type JsonArtifact = ScanReport | AiBillOfMaterials | CiReport;
type MetadataIssue = Omit<VerifyIssue, "severity">;

function mismatchIssue(fileName: string, code: string, field: string): MetadataIssue {
  return {
    artifact: fileName,
    code,
    message: `${fileName} ${field} does not match bundle manifest`,
  };
}

function compareReportMetadata(
  bundle: ScanBundle,
  fileName: string,
  report: ScanReport
): MetadataIssue[] {
  const issues: MetadataIssue[] = [];
  if (report.tool.name !== bundle.tool.name) {
    issues.push(mismatchIssue(fileName, "metadata.tool.name", "tool.name"));
  }
  if (report.tool.version !== bundle.tool.version) {
    issues.push(mismatchIssue(fileName, "metadata.tool.version", "tool.version"));
  }
  if (report.target.name !== bundle.target.name) {
    issues.push(mismatchIssue(fileName, "metadata.target.name", "target.name"));
  }
  if (report.target.rootPath !== bundle.target.rootPath) {
    issues.push(mismatchIssue(fileName, "metadata.target.rootPath", "target.rootPath"));
  }
  return issues;
}

function compareAibomMetadata(
  bundle: ScanBundle,
  fileName: string,
  aibom: AiBillOfMaterials
): MetadataIssue[] {
  const issues: MetadataIssue[] = [];
  if (aibom.project.name !== bundle.target.name) {
    issues.push({
      artifact: fileName,
      code: "metadata.project.name",
      message: `${fileName} project.name does not match bundle target.name`,
    });
  }
  if (aibom.project.rootPath !== bundle.target.rootPath) {
    issues.push({
      artifact: fileName,
      code: "metadata.project.rootPath",
      message: `${fileName} project.rootPath does not match bundle target.rootPath`,
    });
  }
  return issues;
}

function compareCiMetadata(bundle: ScanBundle, fileName: string, ci: CiReport): MetadataIssue[] {
  const issues: MetadataIssue[] = [];
  if (ci.target.name !== bundle.target.name) {
    issues.push(mismatchIssue(fileName, "metadata.target.name", "target.name"));
  }
  if (ci.target.rootPath !== bundle.target.rootPath) {
    issues.push(mismatchIssue(fileName, "metadata.target.rootPath", "target.rootPath"));
  }
  return issues;
}

function compareJsonMetadata(
  bundle: ScanBundle,
  artifact: ScanBundle["artifacts"][number],
  document: JsonArtifact
): MetadataIssue[] {
  const issues: MetadataIssue[] = [];

  if (document.generatedAt !== bundle.generatedAt) {
    issues.push(mismatchIssue(artifact.fileName, "metadata.generatedAt", "generatedAt"));
  }

  switch (artifact.role) {
    case "report":
      issues.push(...compareReportMetadata(bundle, artifact.fileName, document as ScanReport));
      break;
    case "aibom":
      issues.push(
        ...compareAibomMetadata(bundle, artifact.fileName, document as AiBillOfMaterials)
      );
      break;
    case "ci":
      issues.push(...compareCiMetadata(bundle, artifact.fileName, document as CiReport));
      break;
  }

  return issues;
}

function validateJsonArtifactForRole(
  artifact: ScanBundle["artifacts"][number],
  parsed: unknown
): JsonArtifact {
  switch (artifact.role) {
    case "report":
      return validateScanReport(parsed);
    case "aibom":
      return validateAiBillOfMaterials(parsed);
    case "ci":
      return validateCiReport(parsed);
    default:
      throw new Error(`Unsupported JSON artifact role '${artifact.role}'`);
  }
}

function metadataSeverity(strict: boolean): VerifySeverity {
  return strict ? "error" : "warning";
}

interface ArtifactContext {
  artifact: ScanBundle["artifacts"][number];
  bundle: ScanBundle;
  content: string;
  report: VerifyBundleReport;
  result: VerifiedArtifact;
  strict: boolean;
}

function parseBundleManifest(
  report: VerifyBundleReport,
  manifestContent: string
): ScanBundle | null {
  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(manifestContent);
  } catch {
    addIssue(report, "error", {
      code: "bundle.parse",
      message: "Failed to parse euconform.bundle.json as JSON",
    });
    return null;
  }

  try {
    return validateScanBundle(parsedManifest);
  } catch (error) {
    addIssue(report, "error", {
      code: "bundle.invalid",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function createArtifactResult(
  artifact: ScanBundle["artifacts"][number],
  overrides: Partial<VerifiedArtifact> = {}
): VerifiedArtifact {
  return {
    role: artifact.role,
    fileName: artifact.fileName,
    required: artifact.required,
    schemaVersion: artifact.schemaVersion,
    hashStatus: "missing",
    schemaStatus: artifact.role === "summary" ? "skipped" : "invalid",
    metadataStatus: "skipped",
    ...overrides,
  };
}

function checkHash(ctx: ArtifactContext): void {
  if (sha256Hex(ctx.content) === ctx.artifact.sha256) {
    ctx.result.hashStatus = "match";
  } else {
    ctx.result.hashStatus = "mismatch";
    addIssue(ctx.report, metadataSeverity(ctx.strict), {
      artifact: ctx.artifact.fileName,
      code: "artifact.sha256",
      message: `${ctx.artifact.fileName} does not match the SHA-256 recorded in the bundle`,
    });
  }
}

function handleSummaryArtifact(ctx: ArtifactContext): void {
  ctx.result.schemaStatus = "skipped";
  ctx.result.metadataStatus = "skipped";
  if (ctx.artifact.mimeType && ctx.artifact.mimeType !== "text/markdown") {
    addIssue(ctx.report, metadataSeverity(ctx.strict), {
      artifact: ctx.artifact.fileName,
      code: "artifact.mimeType",
      message: `${ctx.artifact.fileName} has unexpected mimeType '${ctx.artifact.mimeType}'`,
    });
  }
}

function extractSchemaVersion(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object") return undefined;
  const candidate = (parsed as Record<string, unknown>).schemaVersion;
  return typeof candidate === "string" ? candidate : undefined;
}

function checkSchemaVersionConsistency(ctx: ArtifactContext, actualSchemaVersion: string): void {
  if (ctx.artifact.schemaVersion && ctx.artifact.schemaVersion !== actualSchemaVersion) {
    addIssue(ctx.report, "error", {
      artifact: ctx.artifact.fileName,
      code: "artifact.schemaVersion.mismatch",
      message: `${ctx.artifact.fileName} schemaVersion '${actualSchemaVersion}' does not match manifest '${ctx.artifact.schemaVersion}'`,
    });
  }

  const bundleMajor = getSchemaMajorVersion(ctx.bundle.schemaVersion);
  if (bundleMajor && getSchemaMajorVersion(actualSchemaVersion) !== bundleMajor) {
    addIssue(ctx.report, "error", {
      artifact: ctx.artifact.fileName,
      code: "artifact.schemaVersion.major",
      message: `${ctx.artifact.fileName} uses schemaVersion '${actualSchemaVersion}' with a different major than the bundle`,
    });
  }
}

function recordMetadataIssues(ctx: ArtifactContext, validatedDocument: JsonArtifact): void {
  const metadataIssues = compareJsonMetadata(ctx.bundle, ctx.artifact, validatedDocument);
  if (metadataIssues.length === 0) {
    ctx.result.metadataStatus = "match";
    return;
  }
  ctx.result.metadataStatus = "mismatch";
  for (const issue of metadataIssues) {
    addIssue(ctx.report, metadataSeverity(ctx.strict), issue);
  }
}

function verifyJsonArtifact(ctx: ArtifactContext): void {
  let parsedArtifact: unknown;
  try {
    parsedArtifact = JSON.parse(ctx.content);
  } catch {
    ctx.result.schemaStatus = "invalid";
    addIssue(ctx.report, "error", {
      artifact: ctx.artifact.fileName,
      code: "artifact.parse",
      message: `${ctx.artifact.fileName} is not valid JSON`,
    });
    return;
  }

  const actualSchemaVersion = extractSchemaVersion(parsedArtifact);
  if (!actualSchemaVersion) {
    ctx.result.schemaStatus = "invalid";
    addIssue(ctx.report, "error", {
      artifact: ctx.artifact.fileName,
      code: "artifact.schemaVersion",
      message: `${ctx.artifact.fileName} is missing a string schemaVersion`,
    });
    return;
  }

  ctx.result.schemaVersion = actualSchemaVersion;
  checkSchemaVersionConsistency(ctx, actualSchemaVersion);

  let validatedDocument: JsonArtifact;
  try {
    validatedDocument = validateJsonArtifactForRole(ctx.artifact, parsedArtifact);
    ctx.result.schemaStatus = "valid";
  } catch (error) {
    ctx.result.schemaStatus = "invalid";
    addIssue(ctx.report, "error", {
      artifact: ctx.artifact.fileName,
      code: "artifact.invalid",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  recordMetadataIssues(ctx, validatedDocument);
}

async function verifyArtifact(
  artifact: ScanBundle["artifacts"][number],
  bundle: ScanBundle,
  loaded: LoadedBundleInput,
  report: VerifyBundleReport,
  strict: boolean
): Promise<VerifiedArtifact> {
  const result = createArtifactResult(artifact);
  const content = await loaded.artifactLoader(artifact.fileName);

  if (content === null) {
    addIssue(report, "error", {
      artifact: artifact.fileName,
      code: "artifact.missing",
      message: `Referenced artifact '${artifact.fileName}' is missing`,
    });
    return result;
  }

  const ctx: ArtifactContext = { artifact, bundle, content, report, result, strict };
  checkHash(ctx);

  if (artifact.role === "summary") {
    handleSummaryArtifact(ctx);
    return result;
  }

  verifyJsonArtifact(ctx);
  return result;
}

export async function verifyBundleInput(
  inputPath: string,
  options: { strict?: boolean } = {}
): Promise<VerifyBundleReport> {
  const loaded = await loadBundleInput(inputPath);
  const report = createReport(loaded.bundlePath, loaded.inputType);

  const bundle = parseBundleManifest(report, loaded.manifestContent);
  if (!bundle) {
    return finalizeReport(report);
  }

  report.bundle = {
    schemaVersion: bundle.schemaVersion,
    generatedAt: bundle.generatedAt,
    tool: bundle.tool,
    target: bundle.target,
  };

  const strict = Boolean(options.strict);

  for (const artifact of bundle.artifacts) {
    const result = await verifyArtifact(artifact, bundle, loaded, report, strict);
    report.artifacts.push(result);
  }

  return finalizeReport(report);
}

export function shouldFailVerifyReport(report: VerifyBundleReport, failOn: VerifyFailOn): boolean {
  if (report.errors.length > 0) {
    return true;
  }
  if (failOn === "warnings" && report.warnings.length > 0) {
    return true;
  }
  return false;
}
