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

  // Step 1: Count raw total
  const totalComponents = allComponents.length;

  // Step 2: Scope filtering
  const inScope =
    scope === "production"
      ? allComponents.filter((c) => c.scope !== "optional" && c.scope !== "excluded")
      : allComponents;
  const filteredByScope = totalComponents - inScope.length;

  // Step 3: Map components
  const mapped: BomComponent[] = [];
  for (const comp of inScope) {
    if (!comp.name || comp.name.trim() === "") {
      warnings.push({ component: "(empty)", message: "Skipped: missing or empty name" });
      continue;
    }

    const mapping = mapComponent(comp);
    if (!mapping) continue;

    const version = comp.version || mapping.purlVersion;
    if (!version) {
      warnings.push({ component: comp.name, message: "Missing version field" });
    }

    const bomComponent: BomComponent = {
      id: version ? `${mapping.kind}:${comp.name}:${version}` : `${mapping.kind}:${comp.name}`,
      kind: mapping.kind,
      name: comp.name,
      ...(version ? { version } : {}),
      source: "sbom-import",
    };

    mapped.push(bomComponent);
  }

  // Step 4: Deduplicate (by kind+name+version)
  const seen = new Set<string>();
  let duplicatesRemoved = 0;
  const deduped: BomComponent[] = [];
  for (const comp of mapped) {
    const key = `${comp.kind}:${comp.name}:${comp.version ?? ""}`;
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);
    deduped.push(comp);
  }

  // Step 5: Compute byKind
  const byKind: Record<string, number> = {};
  for (const comp of deduped) {
    byKind[comp.kind] = (byKind[comp.kind] ?? 0) + 1;
  }

  // Step 6: Extract provenance
  const { projectName, projectNameSource } = resolveProjectName(bom, options?.sourcePath);
  const metadata = extractMetadata(bom);
  const sourceInfo = extractSourceInfo(bom, projectNameSource);

  // Step 7: Build aibom
  const aibom: AiBillOfMaterials = {
    schemaVersion: "euconform.aibom.v1",
    generatedAt: new Date().toISOString(),
    project: {
      name: projectName,
      rootPath: ".",
    },
    components: deduped,
    complianceCapabilities: {
      biasEvaluation: false,
      jsonExport: false,
      pdfExport: false,
      loggingInfrastructure: false,
      humanReviewFlow: false,
      incidentHandling: false,
    },
    metadata,
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
      source: sourceInfo,
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

function extractMetadata(bom: CycloneDxBom): AibomMetadata {
  const meta: AibomMetadata = { importSource: "cyclonedx" };
  const importTool = extractToolString(bom);
  if (importTool) meta.importTool = importTool;
  if (bom.metadata?.timestamp) meta.originalTimestamp = bom.metadata.timestamp;
  return meta;
}

function extractSourceInfo(
  bom: CycloneDxBom,
  projectNameSource: ImportSourceInfo["projectNameSource"]
): ImportSourceInfo {
  const info: ImportSourceInfo = {
    bomFormat: "CycloneDX",
    specVersion: bom.specVersion,
    projectNameSource,
  };
  const importTool = extractToolString(bom);
  if (importTool) info.importTool = importTool;
  if (bom.metadata?.timestamp) info.originalTimestamp = bom.metadata.timestamp;
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
