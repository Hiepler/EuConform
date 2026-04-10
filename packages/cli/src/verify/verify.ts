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

function compareJsonMetadata(
  bundle: ScanBundle,
  artifact: ScanBundle["artifacts"][number],
  document: JsonArtifact
): Omit<VerifyIssue, "severity">[] {
  const issues: Array<Omit<VerifyIssue, "severity">> = [];

  if (document.generatedAt !== bundle.generatedAt) {
    issues.push({
      artifact: artifact.fileName,
      code: "metadata.generatedAt",
      message: `${artifact.fileName} generatedAt does not match bundle manifest`,
    });
  }

  if (artifact.role === "report") {
    const report = document as ScanReport;
    if (report.tool.name !== bundle.tool.name) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.tool.name",
        message: `${artifact.fileName} tool.name does not match bundle manifest`,
      });
    }
    if (report.tool.version !== bundle.tool.version) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.tool.version",
        message: `${artifact.fileName} tool.version does not match bundle manifest`,
      });
    }
    if (report.target.name !== bundle.target.name) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.target.name",
        message: `${artifact.fileName} target.name does not match bundle manifest`,
      });
    }
    if (report.target.rootPath !== bundle.target.rootPath) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.target.rootPath",
        message: `${artifact.fileName} target.rootPath does not match bundle manifest`,
      });
    }
  }

  if (artifact.role === "aibom") {
    const aibom = document as AiBillOfMaterials;
    if (aibom.project.name !== bundle.target.name) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.project.name",
        message: `${artifact.fileName} project.name does not match bundle target.name`,
      });
    }
    if (aibom.project.rootPath !== bundle.target.rootPath) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.project.rootPath",
        message: `${artifact.fileName} project.rootPath does not match bundle target.rootPath`,
      });
    }
  }

  if (artifact.role === "ci") {
    const ci = document as CiReport;
    if (ci.target.name !== bundle.target.name) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.target.name",
        message: `${artifact.fileName} target.name does not match bundle manifest`,
      });
    }
    if (ci.target.rootPath !== bundle.target.rootPath) {
      issues.push({
        artifact: artifact.fileName,
        code: "metadata.target.rootPath",
        message: `${artifact.fileName} target.rootPath does not match bundle manifest`,
      });
    }
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

export async function verifyBundleInput(
  inputPath: string,
  options: { strict?: boolean } = {}
): Promise<VerifyBundleReport> {
  const loaded = await loadBundleInput(inputPath);
  const report = createReport(loaded.bundlePath, loaded.inputType);

  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(loaded.manifestContent);
  } catch {
    addIssue(report, "error", {
      code: "bundle.parse",
      message: "Failed to parse euconform.bundle.json as JSON",
    });
    return finalizeReport(report);
  }

  let bundle: ScanBundle;
  try {
    bundle = validateScanBundle(parsedManifest);
  } catch (error) {
    addIssue(report, "error", {
      code: "bundle.invalid",
      message: error instanceof Error ? error.message : String(error),
    });
    return finalizeReport(report);
  }

  report.bundle = {
    schemaVersion: bundle.schemaVersion,
    generatedAt: bundle.generatedAt,
    tool: bundle.tool,
    target: bundle.target,
  };

  const bundleMajor = getSchemaMajorVersion(bundle.schemaVersion);

  for (const artifact of bundle.artifacts) {
    const result: VerifiedArtifact = {
      role: artifact.role,
      fileName: artifact.fileName,
      required: artifact.required,
      schemaVersion: artifact.schemaVersion,
      hashStatus: "missing",
      schemaStatus: artifact.role === "summary" ? "skipped" : "invalid",
      metadataStatus: "skipped",
    };

    const content = await loaded.artifactLoader(artifact.fileName);
    if (content === null) {
      result.hashStatus = "missing";
      result.schemaStatus = artifact.role === "summary" ? "skipped" : "invalid";
      result.metadataStatus = "skipped";
      report.artifacts.push(result);
      addIssue(report, "error", {
        artifact: artifact.fileName,
        code: "artifact.missing",
        message: `Referenced artifact '${artifact.fileName}' is missing`,
      });
      continue;
    }

    if (sha256Hex(content) === artifact.sha256) {
      result.hashStatus = "match";
    } else {
      result.hashStatus = "mismatch";
      addIssue(report, metadataSeverity(Boolean(options.strict)), {
        artifact: artifact.fileName,
        code: "artifact.sha256",
        message: `${artifact.fileName} does not match the SHA-256 recorded in the bundle`,
      });
    }

    if (artifact.role === "summary") {
      result.schemaStatus = "skipped";
      result.metadataStatus = "skipped";
      if (artifact.mimeType && artifact.mimeType !== "text/markdown") {
        addIssue(report, metadataSeverity(Boolean(options.strict)), {
          artifact: artifact.fileName,
          code: "artifact.mimeType",
          message: `${artifact.fileName} has unexpected mimeType '${artifact.mimeType}'`,
        });
      }
      report.artifacts.push(result);
      continue;
    }

    let parsedArtifact: unknown;
    try {
      parsedArtifact = JSON.parse(content);
    } catch {
      result.schemaStatus = "invalid";
      result.metadataStatus = "skipped";
      report.artifacts.push(result);
      addIssue(report, "error", {
        artifact: artifact.fileName,
        code: "artifact.parse",
        message: `${artifact.fileName} is not valid JSON`,
      });
      continue;
    }

    const actualSchemaVersion =
      parsedArtifact && typeof parsedArtifact === "object"
        ? ((parsedArtifact as Record<string, unknown>).schemaVersion as string | undefined)
        : undefined;
    if (typeof actualSchemaVersion !== "string") {
      result.schemaStatus = "invalid";
      result.metadataStatus = "skipped";
      report.artifacts.push(result);
      addIssue(report, "error", {
        artifact: artifact.fileName,
        code: "artifact.schemaVersion",
        message: `${artifact.fileName} is missing a string schemaVersion`,
      });
      continue;
    }

    result.schemaVersion = actualSchemaVersion;

    if (artifact.schemaVersion && artifact.schemaVersion !== actualSchemaVersion) {
      addIssue(report, "error", {
        artifact: artifact.fileName,
        code: "artifact.schemaVersion.mismatch",
        message: `${artifact.fileName} schemaVersion '${actualSchemaVersion}' does not match manifest '${artifact.schemaVersion}'`,
      });
    }

    if (bundleMajor && getSchemaMajorVersion(actualSchemaVersion) !== bundleMajor) {
      addIssue(report, "error", {
        artifact: artifact.fileName,
        code: "artifact.schemaVersion.major",
        message: `${artifact.fileName} uses schemaVersion '${actualSchemaVersion}' with a different major than the bundle`,
      });
    }

    let validatedDocument: JsonArtifact;
    try {
      validatedDocument = validateJsonArtifactForRole(artifact, parsedArtifact);
      result.schemaStatus = "valid";
    } catch (error) {
      result.schemaStatus = "invalid";
      result.metadataStatus = "skipped";
      report.artifacts.push(result);
      addIssue(report, "error", {
        artifact: artifact.fileName,
        code: "artifact.invalid",
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const metadataIssues = compareJsonMetadata(bundle, artifact, validatedDocument);
    if (metadataIssues.length === 0) {
      result.metadataStatus = "match";
    } else {
      result.metadataStatus = "mismatch";
      for (const issue of metadataIssues) {
        addIssue(report, metadataSeverity(Boolean(options.strict)), issue);
      }
    }

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
