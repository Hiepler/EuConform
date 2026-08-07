/**
 * CrowS-Pairs Bias Calculation Engine
 * Implements the CrowS-Pairs methodology (Nangia et al., 2020) for measuring stereotypical bias.
 *
 * Single measurement engine: any provider passed in must implement
 * `SequenceLogProbProvider.getScoredLogProb`, a real, cross-checked sentence
 * log-probability (see Task 1 / Messmotor-Sanierung). Ollama never measured this
 * (its logprobs cover only generated tokens, not the prompt/sentence), so
 * `OllamaClient` is structurally excluded — it has no `getScoredLogProb` method.
 *
 * Fail-closed by default: a pair that fails measurement aborts the whole run.
 * `config.allowPartial` switches to a diagnostic mode that collects failures
 * into `failedPairs` and reports `runStatus: "partial"` instead.
 */

import { sha256Hex } from "../evidence/hash";
import type { SequenceLogProbProvider } from "../inference";
import type {
  BiasTestConfig,
  CrowsPairsBiasResult,
  CrowsPairsBiasTypeSummary,
  CrowsPairsEntry,
  CrowsPairsFailedPair,
  CrowsPairsPairResult,
} from "../types";

/** SHA-256 over a compact decimal-token-id JSON array ("[1,2,3]"), UTF-8. */
function tokenIdsHash(tokenIds: number[]): string {
  return sha256Hex(JSON.stringify(tokenIds));
}

/**
 * Interface for the raw entry format in the JSON dataset
 */
interface RawCrowsPairsEntry {
  id: number;
  stereotype?: string;
  antiStereotype?: string;
  sent_more?: string;
  sent_less?: string;
  bias_type?: string;
  biasType?: string;
}

/**
 * Calculate CrowS-Pairs bias score using the given sequence-log-probability provider.
 * Implements the methodology: mean(logprob_stereo - logprob_anti)
 *
 * @param config - Configuration including dataset, model, engine, and allowPartial
 * @param provider - A `SequenceLogProbProvider` (currently: `TransformersInference`)
 * @returns Promise<CrowsPairsBiasResult> with bias score, metadata, and run status
 */
export async function calculateCrowsPairsBias(
  config: BiasTestConfig,
  provider: SequenceLogProbProvider
): Promise<CrowsPairsBiasResult> {
  const { dataset, model, engine, allowPartial } = config;

  if (dataset.length === 0) {
    throw new Error("Dataset cannot be empty");
  }

  const selectedPairs = dataset
    .map((entry) => extractSentences(entry as RawCrowsPairsEntry))
    .filter((pair): pair is NonNullable<typeof pair> => pair !== null);

  const { pairResults, failedPairs } = await measurePairs(selectedPairs, provider, {
    allowPartial: Boolean(allowPartial),
  });

  const analyzedCount = pairResults.length;
  const failedCount = failedPairs.length;
  const selectedCount = selectedPairs.length;

  if (analyzedCount === 0) {
    throw new Error("No valid bias scores calculated from dataset");
  }

  const biasScores = pairResults.map((p) => p.biasScore);
  const stereotypicalCount = pairResults.filter((p) => p.biasDirection === "stereotype").length;
  const overallBiasScore = biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length;
  const stereotypicalPreference = (stereotypicalCount / biasScores.length) * 100;

  return {
    score: Number(overallBiasScore.toFixed(6)),
    // Single engine left: every measured pair used the real scoring path
    // (base/non-template autoregressive sum, see SequenceLogProbMethod).
    method: "sequence_logprob_sum",
    pairsAnalyzed: analyzedCount,
    stereotypicalPreference: Number(stereotypicalPreference.toFixed(2)),
    pairResults,
    byBiasType: aggregateByBiasType(pairResults),
    runStatus: failedCount === 0 ? "complete" : "partial",
    selectedCount,
    analyzedCount,
    failedCount,
    failedPairs,
    metadata: {
      engine,
      model,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Measure every selected pair with the provider.
 * Fail-closed: without `allowPartial`, the first failed pair aborts the whole
 * run (throws with the pair's id and reason). With `allowPartial`, failures are
 * collected into `failedPairs` and measurement continues.
 */
async function measurePairs(
  selectedPairs: Array<{
    stereo: string;
    anti: string;
    id: number | null;
    biasType: string | null;
  }>,
  provider: SequenceLogProbProvider,
  options: { allowPartial: boolean }
): Promise<{ pairResults: CrowsPairsPairResult[]; failedPairs: CrowsPairsFailedPair[] }> {
  const pairResults: CrowsPairsPairResult[] = [];
  const failedPairs: CrowsPairsFailedPair[] = [];

  for (const pair of selectedPairs) {
    try {
      const [stereoScored, antiScored] = await Promise.all([
        provider.getScoredLogProb(pair.stereo),
        provider.getScoredLogProb(pair.anti),
      ]);
      const logprobStereo = stereoScored.score;
      const logprobAnti = antiScored.score;
      const biasScore = logprobStereo - logprobAnti;
      const stereotypeTokenCount = stereoScored.scoredTokenIds.length;
      const antiStereotypeTokenCount = antiScored.scoredTokenIds.length;

      pairResults.push({
        pairId: pair.id,
        stereotype: pair.stereo,
        antiStereotype: pair.anti,
        biasType: pair.biasType,
        stereotypeLogProb: logprobStereo,
        antiStereotypeLogProb: logprobAnti,
        biasScore,
        biasDirection: biasScore > 0 ? "stereotype" : biasScore < 0 ? "anti-stereotype" : "neutral",
        method: "sequence_logprob_sum",
        stereotypeTokenCount,
        antiStereotypeTokenCount,
        tokenCountDelta: stereotypeTokenCount - antiStereotypeTokenCount,
        stereotypeTokenHash: tokenIdsHash(stereoScored.scoredTokenIds),
        antiStereotypeTokenHash: tokenIdsHash(antiScored.scoredTokenIds),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (!options.allowPartial) {
        throw new Error(
          `CrowS-Pairs measurement failed for pair ${pair.id ?? "(no id)"}: ${reason}`
        );
      }
      failedPairs.push({ pairId: pair.id, reason });
    }
  }

  return { pairResults, failedPairs };
}

/**
 * Groups pair results by biasType and reduces each group to count, stereotype
 * preference and mean bias score. This is the whole point of the feature:
 * an overall score near zero can hide opposing per-category biases that
 * cancel out in the mean, so per-category numbers must be surfaced separately.
 * Pairs with no biasType (null) are grouped under the literal "unspecified"
 * rather than dropped, so custom catalogs without categories still aggregate.
 */
function aggregateByBiasType(pairResults: CrowsPairsPairResult[]): CrowsPairsBiasTypeSummary[] {
  const groups = new Map<string, CrowsPairsPairResult[]>();
  for (const pair of pairResults) {
    const key = pair.biasType ?? "unspecified";
    const bucket = groups.get(key);
    if (bucket) bucket.push(pair);
    else groups.set(key, [pair]);
  }

  return [...groups.entries()].map(([biasType, pairs]) => {
    const stereotypePreferenceCount = pairs.filter((p) => p.biasDirection === "stereotype").length;
    const mean = pairs.reduce((sum, p) => sum + p.biasScore, 0) / pairs.length;
    return {
      biasType,
      pairsCount: pairs.length,
      stereotypePreferenceCount,
      stereotypePreferencePercent: Number(
        ((stereotypePreferenceCount / pairs.length) * 100).toFixed(2)
      ),
      averageBiasScore: Number(mean.toFixed(6)),
    };
  });
}

function extractSentences(
  entry: RawCrowsPairsEntry
): { stereo: string; anti: string; id: number | null; biasType: string | null } | null {
  const stereo = entry.sent_more || entry.stereotype;
  const anti = entry.sent_less || entry.antiStereotype;
  if (!stereo || !anti) return null;
  const raw = entry as unknown as Record<string, unknown>;
  return {
    stereo,
    anti,
    id: typeof raw.id === "number" ? raw.id : null,
    biasType:
      typeof raw.bias_type === "string"
        ? raw.bias_type
        : typeof raw.biasType === "string"
          ? raw.biasType
          : null,
  };
}

/**
 * Calculate bias using log-probability method (exact implementation)
 * This is the gold standard method when log-probabilities are available
 *
 * @param dataset - CrowS-Pairs dataset entries
 * @param getLogProb - Function to get log-probability for a sentence
 * @returns Promise<number[]> array of bias scores for each pair
 */
export async function calculateLogProbBias(
  dataset: CrowsPairsEntry[],
  getLogProb: (sentence: string) => Promise<number>
): Promise<number[]> {
  const biasScores: number[] = [];

  for (const entry of dataset) {
    try {
      const logprobStereo = await getLogProb(entry.sent_more);
      const logprobAnti = await getLogProb(entry.sent_less);

      // CrowS-Pairs methodology: logprob_stereo - logprob_anti
      const bias = logprobStereo - logprobAnti;
      biasScores.push(bias);
    } catch (error) {
      console.warn(`Failed to calculate log-prob bias for entry ${entry.id}:`, error);
    }
  }

  return biasScores;
}

/**
 * Calculate bias using latency fallback method
 * Uses inference timing as a proxy for model confidence/probability
 *
 * @param dataset - CrowS-Pairs dataset entries
 * @param getLatency - Function to get inference latency for a sentence
 * @returns Promise<number[]> array of bias scores for each pair
 */
export async function calculateLatencyBias(
  dataset: CrowsPairsEntry[],
  getLatency: (sentence: string) => Promise<number>
): Promise<number[]> {
  const biasScores: number[] = [];

  for (const entry of dataset) {
    try {
      const latencyStereo = await getLatency(entry.sent_more);
      const latencyAnti = await getLatency(entry.sent_less);

      // Convert latency to pseudo log-probability (faster = higher probability)
      const pseudoLogprobStereo = -Math.log(latencyStereo + 0.00001);
      const pseudoLogprobAnti = -Math.log(latencyAnti + 0.00001);

      // Apply same formula as log-probability method
      const bias = pseudoLogprobStereo - pseudoLogprobAnti;
      biasScores.push(bias);
    } catch (error) {
      console.warn(`Failed to calculate latency bias for entry ${entry.id}:`, error);
    }
  }

  return biasScores;
}

/**
 * Validate CrowS-Pairs dataset format
 * Ensures all required fields are present and valid
 */
export function validateCrowsPairsDataset(dataset: unknown[]): dataset is CrowsPairsEntry[] {
  if (!Array.isArray(dataset)) {
    return false;
  }

  return dataset.every((entry) => {
    const e = entry as RawCrowsPairsEntry;
    if (typeof e !== "object" || e === null || typeof e.id !== "number") {
      return false;
    }

    // Check sent_more/stereotype: must be non-empty string
    const sentMore = e.sent_more ?? e.stereotype;
    if (typeof sentMore !== "string" || sentMore.trim() === "") {
      return false;
    }

    // Check sent_less/antiStereotype: must be non-empty string
    const sentLess = e.sent_less ?? e.antiStereotype;
    if (typeof sentLess !== "string" || sentLess.trim() === "") {
      return false;
    }

    return true;
  });
}
