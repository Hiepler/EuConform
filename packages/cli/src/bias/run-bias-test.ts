import { createRequire } from "node:module";
import {
  type CrowsPairsBiasResult,
  TransformersInference,
  calculateCrowsPairsBias,
} from "@euconform/core";
import {
  type CustomDatasetMetadata,
  loadCrowsPairsDataset,
  loadCustomDataset,
} from "@euconform/core/datasets";
import { sha256Hex } from "@euconform/core/evidence";
import consola from "consola";
import type { DatasetSource } from "../commands/bias";
import { resolveModelRevisionSha } from "./resolve-model-revision";
import { selectPairs } from "./select-pairs";
import { formatBiasSeverity } from "./severity";

/** Measurement provenance mandatory in a euconform.bias.v2 artifact (see bias.ts). */
export interface BiasRunProvenance {
  engine: "transformers";
  modelId: string;
  modelRevision: string;
  tokenizerId: string;
  transformersVersion: string;
  dtype: string;
  backend: "node-onnx";
  templateStrategy: "none";
}

export interface BiasTestOptions {
  model: string;
  datasetSource: DatasetSource;
  maxPairs?: number;
  seed?: number;
  /** Diagnostic mode: see `CrowsPairsBiasResult.runStatus`. */
  allowPartial?: boolean;
}

export interface BiasTestRun {
  result: CrowsPairsBiasResult;
  sampling: {
    mode: "seeded_sample" | "full";
    datasetSize: number;
    maxPairs: number | null;
    seed: number | null;
    datasetSha256: string;
    pairIds: (number | null)[];
  };
  provenance: BiasRunProvenance;
  /** Provenance of a custom catalog; undefined for bundled language datasets. */
  catalog?: CustomDatasetMetadata;
}

/**
 * The installed @xenova/transformers package version — read once via
 * node:module's `createRequire`, the same mechanism `transformers-inference.ts`
 * uses for its own (private) provenance field. Duplicated here rather than
 * exported from there because this call site is CLI/Node-only and doesn't need
 * that file's webpack-safety guard for browser bundling.
 */
function resolveTransformersPackageVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("@xenova/transformers/package.json") as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Extracts a dataset entry's stable id, defaulting to null for shapes without one. */
function pairIdOf(entry: unknown): number | null {
  const id = (entry as { id?: unknown } | null)?.id;
  return typeof id === "number" ? id : null;
}

export async function runBiasTest(options: BiasTestOptions): Promise<BiasTestRun> {
  const { model, datasetSource, maxPairs, seed, allowPartial } = options;

  // 1. Create the measurement engine — transformers.js, full precision
  // (quantized: false) so quantization noise doesn't leak into the measurement
  // (Task 1: up to 11.9% deviation quantized vs fp32 — dtype is ergebnisrelevant,
  // recorded in provenance below). Resolve the model's revision up front: an
  // immutable commit SHA, not the mutable "main" ref (see resolve-model-revision.ts).
  // The model itself is loaded lazily on first `getScoredLogProb` call.
  consola.start(`Resolving immutable revision for '${model}'...`);
  const modelRevision = await resolveModelRevisionSha(model);
  const provider = new TransformersInference(
    model,
    (status: string) => {
      consola.info(`[${model}] ${status}`);
    },
    { revision: modelRevision, quantized: false }
  );

  const provenance: BiasRunProvenance = {
    engine: "transformers",
    modelId: model,
    modelRevision,
    tokenizerId: model,
    transformersVersion: resolveTransformersPackageVersion(),
    dtype: "fp32",
    backend: "node-onnx",
    templateStrategy: "none",
  };

  // 2. Load dataset — either the bundled language catalog, or a user-supplied one whose
  // provenance (name/version/hash) must travel with the result for the artifact.
  const source = datasetSource;
  consola.start(
    source.kind === "custom"
      ? `Loading custom dataset (${source.path})...`
      : `Loading CrowS-Pairs dataset (${source.lang})...`
  );
  const loaded =
    source.kind === "custom"
      ? loadCustomDataset(source.path)
      : { pairs: loadCrowsPairsDataset(source.lang), metadata: undefined };
  const dataset = loaded.pairs;
  consola.success(`Loaded ${dataset.length} sentence pairs`);
  const datasetSha256 = sha256Hex(JSON.stringify(dataset));

  // 3. Narrow to a reproducible sample if requested
  const selection = selectPairs(dataset, maxPairs, seed);
  if (selection.seed !== null) {
    consola.info(
      `Sampling ${selection.pairs.length} of ${dataset.length} pairs (seed=${selection.seed})`
    );
  }

  // 4. Run bias test
  consola.start(`Running CrowS-Pairs bias test on '${model}' (transformers.js)...`);
  const result = await calculateCrowsPairsBias(
    { dataset: selection.pairs, model, engine: "browser", allowPartial },
    provider
  );

  // 5. Report result
  const severity = formatBiasSeverity(result.score);
  consola.success(
    `Bias test complete: score=${result.score.toFixed(4)} (${severity}), ` +
      `method=${result.method}, pairs=${result.pairsAnalyzed}, runStatus=${result.runStatus}`
  );

  return {
    result,
    sampling: {
      mode: selection.seed === null ? "full" : "seeded_sample",
      datasetSize: dataset.length,
      maxPairs: selection.seed === null ? null : (maxPairs as number),
      seed: selection.seed,
      datasetSha256,
      pairIds: selection.pairs.map(pairIdOf),
    },
    provenance,
    catalog: loaded.metadata,
  };
}
