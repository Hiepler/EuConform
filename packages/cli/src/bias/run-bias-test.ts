import { createRequire } from "node:module";
import {
  type CrowsPairsBiasResult,
  type MinimalModelConfig,
  TransformersInference,
  calculateCrowsPairsBias,
  isConditionalGenerationConfig,
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
  templateStrategy: "none" | "fixed_template_span";
  /** Present only when templateStrategy is "fixed_template_span". */
  promptText?: string;
  promptSha256?: string;
  contextTokenHash?: string;
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

/**
 * Pick the measurement dtype BEFORE constructing the provider (dtype is a constructor
 * option). "fp32" is the Task 1 default — full precision, no quantization noise — but
 * Messmotor-Sanierung Task 5 measured fp32 for a conditional-generation model (Gemma-4-E2B)
 * and rejected it: the fp32 weights are ~4x the q4 size and did not finish loading within
 * 900s. Task 5's decision for that model class was "q4" (496-707 ms/pair, ~2.2 GB RSS).
 * Detection reuses `isConditionalGenerationConfig` — the exact same check
 * `TransformersInference` runs internally — rather than guessing from the model id string,
 * so a differently-named repo hosting the same architecture still gets "q4". The extra
 * `AutoConfig.from_pretrained` call here is a second cache hit against the same on-disk
 * cache `TransformersInference.performLoad()` will hit again once construction proceeds —
 * the existing precedent in `transformers-inference.ts` for why that duplicate call is
 * cheap enough to accept.
 */
async function resolveDtype(model: string, revision: string): Promise<"fp32" | "q4"> {
  const transformers = await import("@huggingface/transformers");
  const config = await transformers.AutoConfig.from_pretrained(model, { revision });
  const isTemplateModel = isConditionalGenerationConfig(config as unknown as MinimalModelConfig);
  return isTemplateModel ? "q4" : "fp32";
}

export async function runBiasTest(options: BiasTestOptions): Promise<BiasTestRun> {
  const { model, datasetSource, maxPairs, seed, allowPartial } = options;

  // 1. Create the measurement engine — transformers.js. Resolve the model's revision up
  // front: an immutable commit SHA, not the mutable "main" ref (see
  // resolve-model-revision.ts). The dtype (fp32 vs q4, see `resolveDtype` above) is
  // ergebnisrelevant (Task 1: up to 11.9% deviation quantized vs fp32) and recorded in
  // provenance below via `provider.dtype`. The model itself is loaded lazily on first
  // `getScoredLogProb` call.
  consola.start(`Resolving immutable revision for '${model}'...`);
  const modelRevision = await resolveModelRevisionSha(model);
  const dtype = await resolveDtype(model, modelRevision);
  const provider = new TransformersInference(
    model,
    (status: string) => {
      consola.info(`[${model}] ${status}`);
    },
    { revision: modelRevision, dtype }
  );

  // Base provenance fields known before any pair is scored. templateStrategy (and, in
  // template mode, promptText/promptSha256/contextTokenHash) is filled in AFTER the run
  // from `result.scoringProvenance` — the provider's own report of what it actually did —
  // rather than hardcoded here. Hardcoding it as "none" unconditionally was exactly the
  // bug this task found: it silently discarded Gemma-4 template-mode provenance even when
  // the provider correctly detected the architecture and scored in template mode
  // (Messmotor-Sanierung Task 6, same category of mistake as the once-hardcoded dtype
  // that Task 5 had to fix).
  const baseProvenance = {
    engine: "transformers" as const,
    modelId: model,
    modelRevision,
    tokenizerId: model,
    transformersVersion: resolveTransformersPackageVersion(),
    onnxruntimeVersion: resolveOnnxRuntimeVersion(),
    // Read from the provider actually constructed above, not a second hardcoded literal —
    // duplicating "fp32" here was only correct by coincidence (Messmotor-Sanierung Task 5
    // review finding); it would have silently become a falsehood once a caller constructs
    // the provider with a different dtype (e.g. template mode's "q4").
    dtype: provider.dtype,
    backend: "node-onnx" as const,
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

  // The provider's actually-used template strategy, echoed back via
  // `calculateCrowsPairsBias`'s `scoringProvenance` — never re-derived or assumed here.
  // Guaranteed defined because `result.pairsAnalyzed > 0` (calculateCrowsPairsBias throws
  // otherwise), but the type is optional to keep CrowsPairsBiasResult's other callers
  // (which may not have any measured pairs to report) unaffected.
  const scoring = result.scoringProvenance;
  const templateStrategy = scoring?.templateStrategy ?? "none";
  const provenance: BiasRunProvenance = {
    ...baseProvenance,
    templateStrategy,
    ...(templateStrategy === "fixed_template_span"
      ? {
          promptText: scoring?.promptText,
          promptSha256: scoring?.promptSha256,
          contextTokenHash: scoring?.contextTokenHash,
        }
      : {}),
  };

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
