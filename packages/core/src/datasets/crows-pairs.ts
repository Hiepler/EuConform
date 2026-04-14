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
