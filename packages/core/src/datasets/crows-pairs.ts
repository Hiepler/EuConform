import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CrowsPairsEntry } from "../types";

interface CrowsPairsDataset {
  metadata: {
    name: string;
    description: string;
    version: string;
    license: string;
    source: string;
  };
  pairs: Array<{
    id: number;
    stereotype: string;
    antiStereotype: string;
    biasType: string;
  }>;
}

function findDatasetPath(language: "en" | "de"): string {
  const fileName = `crows-pairs-${language}.json`;

  // Strategy 1: Relative to this source file (works in unbundled tsc builds)
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const fromSource = resolve(currentDir, `../../assets/datasets/${fileName}`);
  if (existsSync(fromSource)) return fromSource;

  // Strategy 2: Relative to process.cwd() (works in monorepo context)
  const fromCwd = resolve(process.cwd(), `packages/core/assets/datasets/${fileName}`);
  if (existsSync(fromCwd)) return fromCwd;

  // Strategy 3: Walk up from the entry script to find the monorepo root
  if (process.argv[1]) {
    let dir = dirname(resolve(process.argv[1]));
    for (let i = 0; i < 5; i++) {
      const candidate = resolve(dir, `packages/core/assets/datasets/${fileName}`);
      if (existsSync(candidate)) return candidate;
      dir = dirname(dir);
    }
  }

  throw new Error(
    `CrowS-Pairs dataset (${language}) not found. Ensure packages/core/assets/datasets/ exists.`
  );
}

/**
 * Load CrowS-Pairs dataset from bundled assets.
 * Converts the structured JSON format to CrowsPairsEntry[] for the bias engine.
 */
export function loadCrowsPairsDataset(language: "en" | "de"): CrowsPairsEntry[] {
  const filePath = findDatasetPath(language);
  const raw = readFileSync(filePath, "utf-8");
  const dataset: CrowsPairsDataset = JSON.parse(raw);

  return dataset.pairs.map((pair) => ({
    id: pair.id,
    sent_more: pair.stereotype,
    sent_less: pair.antiStereotype,
    bias_type: pair.biasType,
  }));
}

export interface CustomDatasetMetadata {
  name: string;
  version: string;
  sha256: string;
  pairCount: number;
}

/**
 * Load a user-supplied question catalog.
 *
 * Deliberately separate from loadCrowsPairsDataset: that one resolves a bundled
 * asset by language code, this one takes a path the caller chose. The hash goes
 * into the evidence artifact so "Fragekatalog + Version" is verifiable rather
 * than merely stated.
 */
export function loadCustomDataset(filePath: string): {
  pairs: CrowsPairsEntry[];
  metadata: CustomDatasetMetadata;
} {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Fragekatalog nicht gefunden: ${resolved}`);
  }

  const raw = readFileSync(resolved, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Fragekatalog ist kein gültiges JSON: ${resolved}`);
  }

  const doc = parsed as { metadata?: Record<string, unknown>; pairs?: unknown[] };
  if (!Array.isArray(doc.pairs) || doc.pairs.length === 0) {
    throw new Error(`Fragekatalog enthält keine Paare: ${resolved}`);
  }

  const pairs: CrowsPairsEntry[] = doc.pairs.map((entry, index) => {
    const p = entry as Record<string, unknown>;
    const stereotype = typeof p.stereotype === "string" ? p.stereotype : undefined;
    const antiStereotype = typeof p.antiStereotype === "string" ? p.antiStereotype : undefined;
    if (!stereotype || !antiStereotype) {
      throw new Error(
        `Fragekatalog: Paar ${p.id ?? index} braucht 'stereotype' und 'antiStereotype' (${resolved})`
      );
    }
    return {
      id: typeof p.id === "number" ? p.id : index + 1,
      sent_more: stereotype,
      sent_less: antiStereotype,
      bias_type: typeof p.biasType === "string" ? p.biasType : "unspecified",
    };
  });

  const meta = doc.metadata ?? {};
  return {
    pairs,
    metadata: {
      name: typeof meta.name === "string" ? meta.name : "unbenannter Katalog",
      version: typeof meta.version === "string" ? meta.version : "unversioniert",
      sha256: createHash("sha256").update(raw).digest("hex"),
      // Deliberately NOT the resolved absolute filesystem path: euconform.bias.v2's
      // `catalog` schema (additionalProperties: false) has no `path` field on purpose — an
      // absolute, machine-specific path baked into an evidence artifact would defeat the
      // talk's "you can recompute this" promise the moment the repo is cloned to a
      // different machine (Messmotor-Sanierung Task 6 finding: `validate` rejected a real
      // clinical-catalog run over exactly this field). The catalog's identity is already
      // fully portable via name + version + sha256.
      pairCount: pairs.length,
    },
  };
}
