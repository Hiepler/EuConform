import type { AiBillOfMaterials, BomComponent } from "../evidence/types";
import type { ValidationResult } from "../validation/schema-validator";
import { validate } from "../validation/schema-validator";
import { mapComponent } from "./component-mapper";
import type { CycloneDxBom } from "./types";
import { SUPPORTED_SPEC_VERSIONS } from "./types";

export interface ImportSummary {
  totalComponents: number;
  aiRelevant: number;
  skipped: number;
  byKind: Record<string, number>;
  warnings: ImportWarning[];
}

export interface ImportWarning {
  component: string;
  message: string;
}

export interface ImportOptions {
  scope?: "all" | "production";
}

export interface CycloneDxImportResult {
  aibom: AiBillOfMaterials;
  summary: ImportSummary;
  validation: ValidationResult;
}

export function importCycloneDx(sbom: unknown, options?: ImportOptions): CycloneDxImportResult {
  const bom = parseBom(sbom);
  const scope = options?.scope ?? "all";

  const components = bom.components ?? [];
  const warnings: ImportWarning[] = [];
  const mapped: BomComponent[] = [];
  const byKind: Record<string, number> = {};

  for (const comp of components) {
    if (scope === "production" && (comp.scope === "optional" || comp.scope === "excluded")) {
      continue;
    }

    const mapping = mapComponent(comp);
    if (!mapping) continue;

    if (!comp.version) {
      warnings.push({
        component: comp.name,
        message: "Missing version field",
      });
    }

    const bomComponent: BomComponent = {
      id: `${mapping.kind}:${comp.name}`,
      kind: mapping.kind,
      name: comp.name,
      ...(comp.version ? { version: comp.version } : {}),
      source: "sbom-import",
    };

    mapped.push(bomComponent);
    byKind[mapping.kind] = (byKind[mapping.kind] ?? 0) + 1;
  }

  const totalAfterScope =
    scope === "production"
      ? components.filter((c) => c.scope !== "optional" && c.scope !== "excluded").length
      : components.length;

  const aibom: AiBillOfMaterials = {
    schemaVersion: "euconform.aibom.v1",
    generatedAt: new Date().toISOString(),
    project: {
      name: "sbom-import",
      rootPath: ".",
    },
    components: mapped,
    complianceCapabilities: {
      biasEvaluation: false,
      jsonExport: false,
      pdfExport: false,
      loggingInfrastructure: false,
      humanReviewFlow: false,
      incidentHandling: false,
    },
  };

  const validation = validate(aibom);

  return {
    aibom,
    summary: {
      totalComponents: totalAfterScope,
      aiRelevant: mapped.length,
      skipped: totalAfterScope - mapped.length,
      byKind,
      warnings,
    },
    validation,
  };
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
