/**
 * Comparison of two `euconform.bias.v2` artifacts (bias compare).
 *
 * Two bias runs are only comparable when they asked the same questions with the
 * same measurement setup. This module therefore separates two things:
 *
 *  - `comparabilityIssues`: setup differences that change what the numbers MEAN
 *    (different catalog, different scoring method, different template/prompt).
 *    Any entry here makes the comparison invalid.
 *  - `environmentDifferences`: differences that are expected and often the point
 *    of the comparison (different model, dtype, library versions) or that only
 *    affect precision/coverage (sampling, partial runs). They are reported but
 *    do not invalidate the comparison.
 *
 * Pure: no I/O, no rounding. All values stay unrounded so they can be re-checked.
 */

import type { CrowsPairsPairResult, SequenceLogProbMethod } from "../types";
import type { BiasStatisticsV2, WilsonInterval } from "./bias-statistics";
import type { BiasReportV2 } from "./types";

export interface BiasRunSummary {
  /** Path the artifact was loaded from, when known. */
  path?: string;
  model: string;
  dataset: string;
  generatedAt: string;
  method: SequenceLogProbMethod;
  templateStrategy: "none" | "fixed_template_span";
  runStatus: "complete" | "partial";
  selectedCount: number;
  analyzedCount: number;
  failedCount: number;
  /** Mean bias score as stored in `result.score` (validated against pairResults). */
  meanBiasScore: number;
  preferenceCount: number;
  tiesCount: number;
  preferencePercent: number;
  preferenceWilson95: WilsonInterval | null;
  byBiasType: BiasStatisticsV2["byBiasType"];
  /** Confounder control: equal-token-length subset, carried through for honesty. */
  equalTokenPairsCount: number;
  equalTokenPreferencePercent: number | null;
  datasetSha256: string;
  catalog: BiasReportV2["catalog"] | null;
  sampling: BiasReportV2["sampling"];
  environment: {
    modelRevision: string;
    tokenizerId: string;
    dtype: string;
    transformersVersion: string;
    onnxruntimeVersion: string;
    backend: string;
    promptSha256: string | null;
  };
}

export interface BiasTypeComparison {
  biasType: string;
  baselineAnalyzedCount: number;
  candidateAnalyzedCount: number;
  baselinePreferencePercent: number;
  candidatePreferencePercent: number;
  /** candidate - baseline, in percentage points. */
  deltaPoints: number;
}

export interface BiasPairChange {
  pairId: number | null;
  biasType: string | null;
  stereotype: string;
  antiStereotype: string;
  baselineBiasScore: number;
  candidateBiasScore: number;
  /** candidate - baseline. Negative means the candidate became less biased. */
  delta: number;
}

export interface BiasComparisonPaired {
  /**
   * How pairs of the two runs were matched. `pairId` is used only when BOTH runs
   * carry non-null ids (a custom catalog without ids falls back to sentence text).
   */
  keyStrategy: "pairId" | "sentenceText";
  pairsCompared: number;
  onlyInBaseline: number;
  onlyInCandidate: number;
  /** Pairs preferred in the baseline run but not in the candidate run. */
  baselinePreferredOnly: number;
  /** Pairs preferred in the candidate run but not in the baseline run. */
  candidatePreferredOnly: number;
  /**
   * McNemar exact test (binomial, two-sided, p=0.5) over the discordant pairs:
   * a test of whether the preference rate shifted between the two runs.
   * "Preferred" means biasScore > 0; ties count as not preferred.
   */
  mcnemarExact: {
    discordantPairs: number;
    pValue: number;
    alpha: number;
    significant: boolean;
  } | null;
}

export interface BiasComparison {
  reportType: "bias-comparison";
  generatedAt: string;
  alpha: number;
  baseline: BiasRunSummary;
  candidate: BiasRunSummary;
  comparable: boolean;
  comparabilityIssues: string[];
  environmentDifferences: string[];
  deltas: {
    meanBiasScore: number;
    /** candidate - baseline, in percentage points. */
    preferencePercentPoints: number;
  };
  paired: BiasComparisonPaired;
  byBiasType: BiasTypeComparison[];
  largestChanges: BiasPairChange[];
}

export interface CompareBiasRunsOptions {
  baselinePath?: string;
  candidatePath?: string;
  alpha?: number;
  /** Maximum number of per-pair changes in `largestChanges` (default 10). */
  topChanges?: number;
  /** Override for `generatedAt` (tests). */
  generatedAt?: string;
}

export function summarizeBiasRun(report: BiasReportV2, path?: string): BiasRunSummary {
  return {
    ...(path ? { path } : {}),
    model: report.model,
    dataset: report.dataset,
    generatedAt: report.generatedAt,
    method: report.result.method,
    templateStrategy: report.provenance.templateStrategy,
    runStatus: report.runStatus,
    selectedCount: report.selectedCount,
    analyzedCount: report.analyzedCount,
    failedCount: report.failedCount,
    meanBiasScore: report.result.score,
    preferenceCount: report.statistics.preferenceCount,
    tiesCount: report.statistics.tiesCount,
    preferencePercent: report.statistics.preferencePercent,
    preferenceWilson95: report.statistics.preferenceWilson95,
    byBiasType: report.statistics.byBiasType,
    equalTokenPairsCount: report.statistics.equalTokenPairsCount,
    equalTokenPreferencePercent: report.statistics.equalTokenPreferencePercent,
    datasetSha256: report.sampling.datasetSha256,
    catalog: report.catalog ?? null,
    sampling: report.sampling,
    environment: {
      modelRevision: report.provenance.modelRevision,
      tokenizerId: report.provenance.tokenizerId,
      dtype: report.provenance.dtype,
      transformersVersion: report.provenance.transformersVersion,
      onnxruntimeVersion: report.provenance.onnxruntimeVersion,
      backend: report.provenance.backend,
      promptSha256: report.provenance.promptSha256 ?? null,
    },
  };
}

function describeCatalog(run: BiasRunSummary): string {
  return run.catalog ? `${run.catalog.name}@${run.catalog.version}` : "bundled dataset";
}

function comparabilityIssuesOf(a: BiasRunSummary, b: BiasRunSummary): string[] {
  const issues: string[] = [];

  if (a.datasetSha256 !== b.datasetSha256) {
    issues.push(
      `Different datasets: sampling.datasetSha256 is ${a.datasetSha256} vs ${b.datasetSha256}. Different questions cannot be compared.`
    );
  }

  const aCatalogSha = a.catalog?.sha256 ?? null;
  const bCatalogSha = b.catalog?.sha256 ?? null;
  if (aCatalogSha !== bCatalogSha) {
    issues.push(`Different catalogs: ${describeCatalog(a)} vs ${describeCatalog(b)}.`);
  }

  if (a.method !== b.method) {
    issues.push(`Different scoring methods: ${a.method} vs ${b.method}.`);
  }

  if (a.templateStrategy !== b.templateStrategy) {
    issues.push(
      `Different template strategies: ${a.templateStrategy} vs ${b.templateStrategy}. The same sentences were embedded in different contexts.`
    );
  } else if (
    a.templateStrategy === "fixed_template_span" &&
    a.environment.promptSha256 !== b.environment.promptSha256 &&
    a.environment.tokenizerId === b.environment.tokenizerId
  ) {
    // A different prompt only invalidates the comparison when it came out of the
    // SAME tokenizer: that means the measurement setup changed underneath the run.
    // Different tokenizers (i.e. different models) legitimately bring their own
    // chat templates — that is what comparing two models means.
    issues.push(
      `Same tokenizer but different prompt templates: promptSha256 is ${a.environment.promptSha256 ?? "missing"} vs ${b.environment.promptSha256 ?? "missing"}.`
    );
  }

  return issues;
}

function environmentDifferencesOf(a: BiasRunSummary, b: BiasRunSummary): string[] {
  const differences: string[] = [];
  const add = (label: string, left: string, right: string) => {
    if (left !== right) differences.push(`${label}: ${left} vs ${right}`);
  };

  add("model", a.model, b.model);
  add("modelRevision", a.environment.modelRevision, b.environment.modelRevision);
  add("tokenizerId", a.environment.tokenizerId, b.environment.tokenizerId);
  add("dtype", a.environment.dtype, b.environment.dtype);
  add("transformersVersion", a.environment.transformersVersion, b.environment.transformersVersion);
  add("onnxruntimeVersion", a.environment.onnxruntimeVersion, b.environment.onnxruntimeVersion);
  add("backend", a.environment.backend, b.environment.backend);
  add("promptSha256", a.environment.promptSha256 ?? "none", b.environment.promptSha256 ?? "none");
  add("sampling", describeSampling(a.sampling), describeSampling(b.sampling));
  add("runStatus", a.runStatus, b.runStatus);
  add("analyzedPairs", String(a.analyzedCount), String(b.analyzedCount));

  return differences;
}

function describeSampling(sampling: BiasReportV2["sampling"]): string {
  if (sampling.mode === "full") return "full dataset";
  return `seeded sample (maxPairs=${sampling.maxPairs ?? "n/a"}, seed=${sampling.seed ?? "n/a"})`;
}

/** Preference follows `statistics.preferenceCount`: biasScore > 0 (stereotype preferred). */
function isPreferred(pair: CrowsPairsPairResult): boolean {
  return pair.biasScore > 0;
}

function pairTextKey(pair: CrowsPairsPairResult): string {
  return `${pair.stereotype}\u0000${pair.antiStereotype}`;
}

function usesPairIds(report: BiasReportV2): boolean {
  return report.pairResults.length > 0 && report.pairResults.every((p) => p.pairId !== null);
}

function indexPairs(report: BiasReportV2, byPairId: boolean): Map<string, CrowsPairsPairResult> {
  const index = new Map<string, CrowsPairsPairResult>();
  for (const pair of report.pairResults) {
    const key = byPairId ? `id:${pair.pairId}` : `text:${pairTextKey(pair)}`;
    // A duplicate key would silently drop a measurement; keep the first and let
    // the pair count in the report expose the mismatch.
    if (!index.has(key)) index.set(key, pair);
  }
  return index;
}

const LANCZOS_COEFFICIENTS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** Lanczos approximation of log Γ(x), accurate to double precision for x > 0. */
function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const z = x - 1;
  let sum = LANCZOS_COEFFICIENTS[0] as number;
  for (let i = 1; i < LANCZOS_COEFFICIENTS.length; i++) {
    sum += (LANCZOS_COEFFICIENTS[i] as number) / (z + i);
  }
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

function logAddExp(a: number, b: number): number {
  if (a === Number.NEGATIVE_INFINITY) return b;
  if (b === Number.NEGATIVE_INFINITY) return a;
  const max = Math.max(a, b);
  return max + Math.log(Math.exp(a - max) + Math.exp(b - max));
}

/**
 * Two-sided exact McNemar test: P = 2 * P(X <= min(b, c)) for
 * X ~ Binomial(b + c, 0.5). Computed in log space so large runs do not underflow.
 */
export function mcnemarExactPValue(baselineOnly: number, candidateOnly: number): number {
  const n = baselineOnly + candidateOnly;
  if (n === 0) return 1;

  const k = Math.min(baselineOnly, candidateOnly);
  const logGammaN = logGamma(n + 1);
  const logHalfN = n * Math.log(0.5);

  let logSum = Number.NEGATIVE_INFINITY;
  for (let i = 0; i <= k; i++) {
    const logPmf = logGammaN - logGamma(i + 1) - logGamma(n - i + 1) + logHalfN;
    logSum = logAddExp(logSum, logPmf);
  }

  return Math.min(1, 2 * Math.exp(logSum));
}

function compareByBiasType(a: BiasRunSummary, b: BiasRunSummary): BiasTypeComparison[] {
  const types = new Set<string>();
  const baselineTypes = new Map<string, { analyzed: number; percent: number }>();
  const candidateTypes = new Map<string, { analyzed: number; percent: number }>();

  const collect = (
    summary: BiasRunSummary,
    target: Map<string, { analyzed: number; percent: number }>
  ) => {
    for (const entry of summary.byBiasType) {
      target.set(entry.biasType, {
        analyzed: entry.analyzedCount,
        percent: entry.preferencePercent,
      });
      types.add(entry.biasType);
    }
  };

  collect(a, baselineTypes);
  collect(b, candidateTypes);

  return [...types]
    .sort((left, right) => left.localeCompare(right))
    .map((biasType) => {
      const baseline = baselineTypes.get(biasType);
      const candidate = candidateTypes.get(biasType);
      return {
        biasType,
        baselineAnalyzedCount: baseline?.analyzed ?? 0,
        candidateAnalyzedCount: candidate?.analyzed ?? 0,
        baselinePreferencePercent: baseline?.percent ?? 0,
        candidatePreferencePercent: candidate?.percent ?? 0,
        deltaPoints: (candidate?.percent ?? 0) - (baseline?.percent ?? 0),
      };
    });
}

export function compareBiasRuns(
  baselineReport: BiasReportV2,
  candidateReport: BiasReportV2,
  options: CompareBiasRunsOptions = {}
): BiasComparison {
  const baseline = summarizeBiasRun(baselineReport, options.baselinePath);
  const candidate = summarizeBiasRun(candidateReport, options.candidatePath);
  const alpha = options.alpha ?? 0.05;
  const topChanges = options.topChanges ?? 10;

  const comparabilityIssues = comparabilityIssuesOf(baseline, candidate);
  const environmentDifferences = environmentDifferencesOf(baseline, candidate);

  // Pair ids only make sense as a join key when both runs use them AND both runs
  // asked the same questions (guaranteed by the datasetSha256 comparability check).
  const usePairIds = usesPairIds(baselineReport) && usesPairIds(candidateReport);
  const baselineIndex = indexPairs(baselineReport, usePairIds);
  const candidateIndex = indexPairs(candidateReport, usePairIds);

  let pairsCompared = 0;
  let baselinePreferredOnly = 0;
  let candidatePreferredOnly = 0;
  const changes: BiasPairChange[] = [];

  for (const [key, baselinePair] of baselineIndex) {
    const candidatePair = candidateIndex.get(key);
    if (!candidatePair) continue;
    pairsCompared += 1;

    const baselinePreferred = isPreferred(baselinePair);
    const candidatePreferred = isPreferred(candidatePair);
    if (baselinePreferred && !candidatePreferred) baselinePreferredOnly += 1;
    if (!baselinePreferred && candidatePreferred) candidatePreferredOnly += 1;

    changes.push({
      pairId: baselinePair.pairId,
      biasType: baselinePair.biasType,
      stereotype: baselinePair.stereotype,
      antiStereotype: baselinePair.antiStereotype,
      baselineBiasScore: baselinePair.biasScore,
      candidateBiasScore: candidatePair.biasScore,
      delta: candidatePair.biasScore - baselinePair.biasScore,
    });
  }

  const discordantPairs = baselinePreferredOnly + candidatePreferredOnly;
  const pValue = mcnemarExactPValue(baselinePreferredOnly, candidatePreferredOnly);

  const largestChanges = changes
    .filter((change) => change.delta !== 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, topChanges);

  return {
    reportType: "bias-comparison",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    alpha,
    baseline,
    candidate,
    comparable: comparabilityIssues.length === 0,
    comparabilityIssues,
    environmentDifferences,
    deltas: {
      meanBiasScore: candidate.meanBiasScore - baseline.meanBiasScore,
      preferencePercentPoints: candidate.preferencePercent - baseline.preferencePercent,
    },
    paired: {
      keyStrategy: usePairIds ? "pairId" : "sentenceText",
      pairsCompared,
      onlyInBaseline: baselineIndex.size - pairsCompared,
      onlyInCandidate: candidateIndex.size - pairsCompared,
      baselinePreferredOnly,
      candidatePreferredOnly,
      mcnemarExact:
        discordantPairs === 0
          ? null
          : {
              discordantPairs,
              pValue,
              alpha,
              significant: pValue < alpha,
            },
    },
    byBiasType: compareByBiasType(baseline, candidate),
    largestChanges,
  };
}
