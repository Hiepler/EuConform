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

/** Measurement provenance mandatory in a euconform.bias.v2 artifact (see bias.ts). */
export interface BiasRunProvenance {
  engine: "transformers";
  modelId: string;
  modelRevision: string;
  tokenizerId: string;
  transformersVersion: string;
  onnxruntimeVersion: string;
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
 * The installed @huggingface/transformers package version. Read via `env.version` (the
 * library's own documented public API for this), not via
 * `require(".../package.json")`: v4's package.json declares a strict `exports` map with
 * no "./package.json" subpath (unlike v2's), so that used to throw
 * ERR_PACKAGE_PATH_NOT_EXPORTED and get silently swallowed into "unknown" on every real
 * run — found while adding the onnxruntimeVersion field below (Messmotor-Sanierung Task 4).
 * Duplicated here rather than exported from `transformers-inference.ts` because this call
 * site is CLI/Node-only and doesn't need that file's webpack-safety guard for browser
 * bundling.
 */
function resolveTransformersPackageVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const mod = require("@huggingface/transformers") as { env?: { version?: string } };
    return mod.env?.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * The installed onnxruntime-node version — the native ONNX Runtime backend that actually
 * executes the model forward pass. Deliberately NOT caught-and-"unknown": Messmotor-Sanierung
 * Task 4 proved that an onnxruntime-node version bump alone (1.14.0 -> 1.24.3, same model
 * weights, same dtype) shifts sequence log-probabilities at the 1e-6 relative level. Since the
 * whole point of recording this field is that it is ergebnisrelevant, a run that cannot resolve
 * it must fail loudly rather than write an artifact that silently omits load-bearing provenance.
 */
function resolveOnnxRuntimeVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("onnxruntime-node/package.json") as { version?: string };
  if (!pkg.version) {
    throw new Error(
      "runBiasTest: could not resolve the installed onnxruntime-node version from " +
        "onnxruntime-node/package.json (missing 'version' field). This is a required, " +
        "ergebnisrelevant provenance field (Messmotor-Sanierung Task 4) — refusing to write " +
        "an artifact with a fabricated or missing value."
    );
  }
  return pkg.version;
}

/** Extracts a dataset entry's stable id, defaulting to null for shapes without one. */
function pairIdOf(entry: unknown): number | null {
  const id = (entry as { id?: unknown } | null)?.id;
  return typeof id === "number" ? id : null;
}

export async function runBiasTest(options: BiasTestOptions): Promise<BiasTestRun> {
  const { model, datasetSource, maxPairs, seed, allowPartial } = options;

  // 1. Create the measurement engine — transformers.js, full precision
  // (dtype: "fp32") so quantization noise doesn't leak into the measurement
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
    { revision: modelRevision, dtype: "fp32" }
  );

  const provenance: BiasRunProvenance = {
    engine: "transformers",
    modelId: model,
    modelRevision,
    tokenizerId: model,
    transformersVersion: resolveTransformersPackageVersion(),
    onnxruntimeVersion: resolveOnnxRuntimeVersion(),
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

  // 5. Report result.
  //
  // No severity label. The old Strong/Light/Minimal thresholds (|score| > 0.3 / > 0.1)
  // were calibrated against a mean, not the summed sequence log-probability this engine
  // produces — applied to a sum they classify nothing, they only sound decisive. v2 drops
  // severity from the artifact for exactly that reason, so the console line must not
  // smuggle the verdict back in. Report what was measured: the preference rate and n.
  consola.success(
    `Bias test complete: preference=${result.stereotypicalPreference.toFixed(1)}% ` +
      `of ${result.pairsAnalyzed} pairs, score=${result.score.toFixed(4)}, ` +
      `method=${result.method}, runStatus=${result.runStatus}`
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
