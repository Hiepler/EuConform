/**
 * CrowS-Pairs Bias Calculation Engine
 * Implements the CrowS-Pairs methodology (Nangia et al., 2020) for measuring stereotypical bias
 * Uses log-probabilities as the gold standard with latency fallback when needed
 */

import { BrowserInference } from "../inference/browser-inference";
import { OllamaClient } from "../inference/ollama-client";
import type {
  BiasCalculationMethod,
  BiasTestConfig,
  CrowsPairsBiasResult,
  CrowsPairsEntry,
} from "../types";

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
 * Calculate CrowS-Pairs bias score using the specified inference client
 * Implements the methodology: mean(logprob_stereo - logprob_anti)
 *
 * @param config - Configuration including dataset, model, and engine
 * @param inferenceClient - Either BrowserInference or OllamaClient instance
 * @returns Promise<CrowsPairsBiasResult> with bias score and metadata
 */
export async function calculateCrowsPairsBias(
  config: BiasTestConfig,
  inferenceClient: BrowserInference | OllamaClient
): Promise<CrowsPairsBiasResult> {
  const { dataset, model, engine } = config;

  if (dataset.length === 0) {
    throw new Error("Dataset cannot be empty");
  }

  const method = await determineCalculationMethod(engine, inferenceClient);
  const { biasScores, stereotypicalCount, finalMethod } = await processDataset(
    dataset,
    engine,
    inferenceClient,
    method
  );

  if (biasScores.length === 0) {
    throw new Error("No valid bias scores calculated from dataset");
  }

  const overallBiasScore = biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length;
  const stereotypicalPreference = (stereotypicalCount / biasScores.length) * 100;

  return {
    score: Number(overallBiasScore.toFixed(6)),
    method: finalMethod,
    pairsAnalyzed: biasScores.length,
    stereotypicalPreference: Number(stereotypicalPreference.toFixed(2)),
    metadata: {
      engine,
      model,
      timestamp: new Date().toISOString(),
    },
  };
}

async function determineCalculationMethod(
  engine: string,
  inferenceClient: BrowserInference | OllamaClient
): Promise<BiasCalculationMethod> {
  if (engine === "browser") return "logprobs_exact";
  if (engine === "ollama" && inferenceClient instanceof OllamaClient) {
    const supportsLogProbs = await inferenceClient.detectLogProbSupport();
    return supportsLogProbs ? "logprobs_exact" : "logprobs_fallback_latency";
  }
  throw new Error(`Unsupported engine: ${engine}`);
}

async function processDataset(
  dataset: unknown[],
  engine: string,
  inferenceClient: BrowserInference | OllamaClient,
  initialMethod: BiasCalculationMethod
) {
  const biasScores: number[] = [];
  let stereotypicalCount = 0;
  let finalMethod = initialMethod;

  for (const entry of dataset) {
    try {
      const pair = extractSentences(entry as RawCrowsPairsEntry);
      if (!pair) continue;

      const { logprobStereo, logprobAnti, actualMethod } = await getLogProbsForPair(
        pair,
        engine,
        inferenceClient
      );

      if (actualMethod) finalMethod = actualMethod;

      const pairBias = logprobStereo - logprobAnti;
      biasScores.push(pairBias);
      if (pairBias > 0) stereotypicalCount++;
    } catch (error) {
      console.warn("Failed to process entry:", error);
    }
  }

  return { biasScores, stereotypicalCount, finalMethod };
}

function extractSentences(entry: RawCrowsPairsEntry): { stereo: string; anti: string } | null {
  const stereo = entry.sent_more || entry.stereotype;
  const anti = entry.sent_less || entry.antiStereotype;
  if (!stereo || !anti) return null;
  return { stereo, anti };
}

async function getLogProbsForPair(
  pair: { stereo: string; anti: string },
  engine: string,
  inferenceClient: BrowserInference | OllamaClient
) {
  if (engine === "browser" && inferenceClient instanceof BrowserInference) {
    const logprobStereo = await inferenceClient.getLogProb(pair.stereo);
    const logprobAnti = await inferenceClient.getLogProb(pair.anti);
    return { logprobStereo, logprobAnti };
  }

  if (engine === "ollama" && inferenceClient instanceof OllamaClient) {
    const stereoResult = await inferenceClient.getLogProbWithFallback(pair.stereo);
    const antiResult = await inferenceClient.getLogProbWithFallback(pair.anti);
    return {
      logprobStereo: stereoResult.logprob,
      logprobAnti: antiResult.logprob,
      actualMethod: stereoResult.method,
    };
  }

  throw new Error("Invalid inference client for engine");
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
