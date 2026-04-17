/**
 * Minimal CycloneDX types covering fields relevant to AI component detection.
 * Supports CycloneDX JSON format versions 1.4, 1.5, 1.6.
 */

export interface CycloneDxBom {
  bomFormat: "CycloneDX";
  specVersion: string;
  version?: number;
  metadata?: CycloneDxMetadata;
  components?: CycloneDxComponent[];
}

export interface CycloneDxMetadata {
  timestamp?: string;
  tools?: Array<{ name?: string; version?: string }>;
  component?: CycloneDxComponent;
}

export interface CycloneDxComponent {
  type: string;
  name: string;
  version?: string;
  purl?: string;
  group?: string;
  description?: string;
  scope?: "required" | "optional" | "excluded";
  properties?: Array<{ name: string; value: string }>;
  /** CycloneDX ML-BOM extensions (1.5+) */
  modelCard?: unknown;
  data?: Array<{ type?: string }>;
}

export const SUPPORTED_SPEC_VERSIONS = ["1.4", "1.5", "1.6"] as const;
