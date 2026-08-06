import { type CrowsPairsBiasResult, OllamaClient, calculateCrowsPairsBias } from "@euconform/core";
import {
  type CustomDatasetMetadata,
  loadCrowsPairsDataset,
  loadCustomDataset,
} from "@euconform/core/datasets";
import consola from "consola";
import type { DatasetSource } from "../commands/bias";
import { fileCache } from "./cache";
import { selectPairs } from "./select-pairs";
import { formatBiasSeverity } from "./severity";

export interface BiasTestOptions {
  model: string;
  datasetSource: DatasetSource;
  url?: string;
  maxPairs?: number;
  seed?: number;
}

export interface BiasTestRun {
  result: CrowsPairsBiasResult;
  sampling: {
    datasetSize: number;
    maxPairs: number | null;
    seed: number | null;
  };
  /** Provenance of a custom catalog; undefined for bundled language datasets. */
  catalog?: CustomDatasetMetadata;
}

export async function runBiasTest(options: BiasTestOptions): Promise<BiasTestRun> {
  const { model, datasetSource, url, maxPairs, seed } = options;
  const baseUrl = url ?? "http://localhost:11434";

  // 1. Create client and verify model (also validates Ollama is reachable)
  const client = new OllamaClient(model, baseUrl, fileCache);
  consola.start(`Verifying model '${model}' is available on ${baseUrl}...`);
  await client.ensureModelLoaded();
  consola.success(`Model '${model}' is loaded`);

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

  // 3. Narrow to a reproducible sample if requested
  const selection = selectPairs(dataset, maxPairs, seed);
  if (selection.seed !== null) {
    consola.info(
      `Sampling ${selection.pairs.length} of ${dataset.length} pairs (seed=${selection.seed})`
    );
  }

  // 4. Run bias test
  consola.start(`Running CrowS-Pairs bias test on '${model}'...`);
  const result = await calculateCrowsPairsBias(
    { dataset: selection.pairs, model, engine: "ollama" },
    client
  );

  // 5. Report result
  const severity = formatBiasSeverity(result.score);
  consola.success(
    `Bias test complete: score=${result.score.toFixed(4)} (${severity}), ` +
      `method=${result.method}, pairs=${result.pairsAnalyzed}`
  );

  return {
    result,
    sampling: {
      datasetSize: dataset.length,
      maxPairs: selection.seed === null ? null : (maxPairs as number),
      seed: selection.seed,
    },
    catalog: loaded.metadata,
  };
}
