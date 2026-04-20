import { basename, extname } from "node:path";
import type { AiBillOfMaterials, AibomMetadata, BomComponent } from "../evidence/types";
import type { ValidationResult } from "../validation/schema-validator";
import { validate } from "../validation/schema-validator";
import { mapComponent } from "./component-mapper";
import type { CycloneDxBom } from "./types";
import { SUPPORTED_SPEC_VERSIONS } from "./types";

export interface ImportWarning {
  component: string;
  message: string;
}

export interface ImportSourceInfo {
  bomFormat: "CycloneDX";
  specVersion: string;
  projectNameSource: "metadata.component.name" | "sourcePath" | "fallback";
  importTool?: string;
  originalTimestamp?: string;
}

export interface ImportSummary {
  totalComponents: number;
  filteredByScope: number;
  aiRelevant: number;
  skipped: number;
  duplicatesRemoved: number;
  byKind: Record<string, number>;
  warnings: ImportWarning[];
  source: ImportSourceInfo;
}

export interface ImportOptions {
  scope?: "all" | "production";
  sourcePath?: string;
}

export interface CycloneDxImportResult {
  aibom: AiBillOfMaterials;
  summary: ImportSummary;
  validation: ValidationResult;
}

export function importCycloneDx(sbom: unknown, options?: ImportOptions): CycloneDxImportResult {
  const bom = parseBom(sbom);
  const scope = options?.scope ?? "all";

  const allComponents = bom.components ?? [];
  const warnings: ImportWarning[] = [];
  const totalComponents = allComponents.length;

  const inScope =
    scope === "production"
      ? allComponents.filter((c) => c.scope !== "optional" && c.scope !== "excluded")
      : allComponents;
  const filteredByScope = totalComponents - inScope.length;

  const mapped: BomComponent[] = [];
  for (const comp of inScope) {
    const mapping = mapComponent(comp);
    if (!mapping) {
      if (!comp.name || comp.name.trim() === "") {
        warnings.push({ component: "(empty)", message: "Skipped: missing or empty name" });
      }
      continue;
    }

    const version = comp.version || mapping.purlVersion;
    if (!version) {
      warnings.push({ component: comp.name, message: "Missing version field" });
    }

    mapped.push({
      id: version ? `${mapping.kind}:${comp.name}:${version}` : `${mapping.kind}:${comp.name}`,
      kind: mapping.kind,
      name: comp.name,
      ...(version ? { version } : {}),
      source: "sbom-import",
    });
  }

  const seen = new Set<string>();
  let duplicatesRemoved = 0;
  const deduped: BomComponent[] = [];
  for (const comp of mapped) {
    if (seen.has(comp.id)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(comp.id);
    deduped.push(comp);
  }

  const byKind: Record<string, number> = {};
  for (const comp of deduped) {
    byKind[comp.kind] = (byKind[comp.kind] ?? 0) + 1;
  }

  const { projectName, projectNameSource } = resolveProjectName(bom, options?.sourcePath);
  const importTool = extractToolString(bom);
  const originalTimestamp = bom.metadata?.timestamp;

  const aibom: AiBillOfMaterials = {
    schemaVersion: "euconform.aibom.v1",
    generatedAt: new Date().toISOString(),
    project: { name: projectName, rootPath: "." },
    components: deduped,
    complianceCapabilities: {
      biasEvaluation: false,
      jsonExport: false,
      pdfExport: false,
      loggingInfrastructure: false,
      humanReviewFlow: false,
      incidentHandling: false,
    },
    metadata: buildMetadata(importTool, originalTimestamp),
  };

  const validation = validate(aibom);

  return {
    aibom,
    summary: {
      totalComponents,
      filteredByScope,
      aiRelevant: deduped.length,
      skipped: inScope.length - mapped.length,
      duplicatesRemoved,
      byKind,
      warnings,
      source: buildSourceInfo(bom.specVersion, projectNameSource, importTool, originalTimestamp),
    },
    validation,
  };
}

function resolveProjectName(
  bom: CycloneDxBom,
  sourcePath?: string
): { projectName: string; projectNameSource: ImportSourceInfo["projectNameSource"] } {
  const metaName = bom.metadata?.component?.name;
  if (metaName) {
    return { projectName: metaName, projectNameSource: "metadata.component.name" };
  }

  if (sourcePath) {
    const name = basename(sourcePath, extname(sourcePath));
    return { projectName: name, projectNameSource: "sourcePath" };
  }

  return { projectName: "sbom-import", projectNameSource: "fallback" };
}

function extractToolString(bom: CycloneDxBom): string | undefined {
  const tool = bom.metadata?.tools?.[0];
  if (!tool?.name) return undefined;
  return tool.version ? `${tool.name} ${tool.version}` : tool.name;
}

function buildMetadata(importTool?: string, originalTimestamp?: string): AibomMetadata {
  const meta: AibomMetadata = { importSource: "cyclonedx" };
  if (importTool) meta.importTool = importTool;
  if (originalTimestamp) meta.originalTimestamp = originalTimestamp;
  return meta;
}

function buildSourceInfo(
  specVersion: string,
  projectNameSource: ImportSourceInfo["projectNameSource"],
  importTool?: string,
  originalTimestamp?: string
): ImportSourceInfo {
  const info: ImportSourceInfo = { bomFormat: "CycloneDX", specVersion, projectNameSource };
  if (importTool) info.importTool = importTool;
  if (originalTimestamp) info.originalTimestamp = originalTimestamp;
  return info;
}

function parseBom(sbom: unknown): CycloneDxBom {
  if (typeof sbom !== "object" || sbom === null) {
    throw new Error("Input must be a JSON object");
  }

  const record = sbom as Record<string, unknown>;

  if (record.bomFormat !== "CycloneDX") {
    throw new Error(`Invalid bomFormat: expected "CycloneDX", got "${String(record.bomFormat)}"`);
  }

  const specVersion = String(record.specVersion ?? "");
  if (!SUPPORTED_SPEC_VERSIONS.includes(specVersion as (typeof SUPPORTED_SPEC_VERSIONS)[number])) {
    throw new Error(
      `Unsupported specVersion "${specVersion}". Supported: ${SUPPORTED_SPEC_VERSIONS.join(", ")}`
    );
  }

  return sbom as CycloneDxBom;
}
