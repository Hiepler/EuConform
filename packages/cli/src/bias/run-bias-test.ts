import {
  type CrowsPairsBiasResult,
  OllamaClient,
  calculateCrowsPairsBias,
  loadCrowsPairsDataset,
} from "@euconform/core";
import consola from "consola";
import { fileCache } from "./cache";
import { formatBiasSeverity } from "./severity";

export interface BiasTestOptions {
  model: string;
  lang: "en" | "de";
  url?: string;
}

export async function runBiasTest(options: BiasTestOptions): Promise<CrowsPairsBiasResult> {
  const { model, lang, url } = options;
  const baseUrl = url ?? "http://localhost:11434";

  // 1. Create client and verify model (also validates Ollama is reachable)
  const client = new OllamaClient(model, baseUrl, fileCache);
  consola.start(`Verifying model '${model}' is available on ${baseUrl}...`);
  await client.ensureModelLoaded();
  consola.success(`Model '${model}' is loaded`);

  // 2. Load dataset
  consola.start(`Loading CrowS-Pairs dataset (${lang})...`);
  const dataset = loadCrowsPairsDataset(lang);
  consola.success(`Loaded ${dataset.length} sentence pairs`);

  // 3. Run bias test
  consola.start(`Running CrowS-Pairs bias test on '${model}'...`);
  const result = await calculateCrowsPairsBias({ dataset, model, engine: "ollama" }, client);

  // 4. Report result
  const severity = formatBiasSeverity(result.score);
  consola.success(
    `Bias test complete: score=${result.score.toFixed(4)} (${severity}), ` +
      `method=${result.method}, pairs=${result.pairsAnalyzed}`
  );

  return result;
}
