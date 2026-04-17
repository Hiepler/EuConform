import type { BomComponentKind } from "../evidence/types";
import { lookupKnownPackage } from "./known-packages";
import type { CycloneDxComponent } from "./types";

export interface ComponentMapping {
  kind: BomComponentKind;
  source: "sbom-import";
  confidence: "high" | "medium";
}

const CYCLONEDX_TYPE_MAP: Record<
  string,
  { kind: BomComponentKind; confidence: "high" | "medium" }
> = {
  "machine-learning-model": { kind: "model", confidence: "high" },
  data: { kind: "dataset", confidence: "medium" },
  platform: { kind: "inference-provider", confidence: "medium" },
  service: { kind: "inference-provider", confidence: "medium" },
};

/**
 * Map a CycloneDX component to an EuConform aibom component kind.
 *
 * Three-tier detection (descending priority):
 * 1. CycloneDX ML-BOM extensions (modelCard, data)
 * 2. CycloneDX component type mapping
 * 3. Known AI package registry lookup
 *
 * Returns null if the component is not AI-relevant.
 */
export function mapComponent(component: CycloneDxComponent): ComponentMapping | null {
  // Tier 1: ML-BOM extensions
  if (component.modelCard != null) {
    return { kind: "model", source: "sbom-import", confidence: "high" };
  }

  if (Array.isArray(component.data) && component.data.some((d) => d.type === "dataset")) {
    return { kind: "dataset", source: "sbom-import", confidence: "high" };
  }

  // Tier 2: CycloneDX component type
  const typeMapping = CYCLONEDX_TYPE_MAP[component.type];
  if (typeMapping) {
    return { kind: typeMapping.kind, source: "sbom-import", confidence: typeMapping.confidence };
  }

  // Tier 3: Known-package registry
  const knownKind = lookupKnownPackage(component.name);
  if (knownKind) {
    return { kind: knownKind, source: "sbom-import", confidence: "high" };
  }

  return null;
}
