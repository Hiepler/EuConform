import type { BomComponentKind } from "../evidence/types";
import { lookupKnownPackage } from "./known-packages";
import { parsePurl } from "./purl";
import type { CycloneDxComponent } from "./types";

export interface ComponentMapping {
  kind: BomComponentKind;
  source: "sbom-import";
  confidence: "high" | "medium";
  purlVersion?: string;
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

/** Tiers 7-8: Try to find a kind via purl namespace/name and name-only lookups. */
function lookupViaPurl(
  parsed: ReturnType<typeof parsePurl>
): { kind: BomComponentKind; confidence: "high" | "medium" } | null {
  if (!parsed) return null;

  // Tier 7: namespace/name (e.g. @langchain/core)
  if (parsed.namespace) {
    const scopedName = `${parsed.namespace}/${parsed.name}`;
    const scopedKind = lookupKnownPackage(scopedName);
    if (scopedKind) return { kind: scopedKind, confidence: "high" };
  }

  // Tier 8: purl name only
  const purlKind = lookupKnownPackage(parsed.name);
  if (purlKind) return { kind: purlKind, confidence: "medium" };

  return null;
}

/**
 * Map a CycloneDX component to an EuConform aibom component kind.
 *
 * 8-tier detection (descending priority):
 * 1. ML-BOM extensions (modelCard, data)
 * 2. CycloneDX component type mapping
 * 3. Exact package name in registry
 * 4. Explicit scoped name in registry (@langchain/core)
 * 5. Scope mapping via KNOWN_AI_SCOPES (@langchain -> tool)
 * 6. Scope-stripped name in registry (@huggingface/transformers -> transformers)
 * 7. Purl namespace/name against registry
 * 8. Purl name-only against registry
 *
 * Steps 3-6 are handled by lookupKnownPackage().
 * Returns null if the component is not AI-relevant or has empty name.
 */
export function mapComponent(component: CycloneDxComponent): ComponentMapping | null {
  // Name validation
  if (!component.name || component.name.trim() === "") {
    return null;
  }

  // Extract purl info (used for fallback and version)
  const parsed = component.purl ? parsePurl(component.purl) : null;
  const purlVersion = parsed?.version;

  // Tier 1: ML-BOM extensions
  if (component.modelCard != null) {
    return { kind: "model", source: "sbom-import", confidence: "high", purlVersion };
  }

  if (Array.isArray(component.data) && component.data.some((d) => d.type === "dataset")) {
    return { kind: "dataset", source: "sbom-import", confidence: "high", purlVersion };
  }

  // Tier 2: CycloneDX component type
  const typeMapping = CYCLONEDX_TYPE_MAP[component.type];
  if (typeMapping) {
    return {
      kind: typeMapping.kind,
      source: "sbom-import",
      confidence: typeMapping.confidence,
      purlVersion,
    };
  }

  // Tiers 3-6: Known-package registry (handles exact, scoped, scope-fallback, scope-stripped)
  const knownKind = lookupKnownPackage(component.name);
  if (knownKind) {
    return { kind: knownKind, source: "sbom-import", confidence: "high", purlVersion };
  }

  // Tiers 7-8: Purl fallback
  const purlMatch = lookupViaPurl(parsed);
  if (purlMatch) {
    return {
      kind: purlMatch.kind,
      source: "sbom-import",
      confidence: purlMatch.confidence,
      purlVersion,
    };
  }

  return null;
}
