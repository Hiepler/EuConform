/**
 * Browser-safe subset of `@euconform/core/evidence`.
 *
 * Everything exported here is pure TypeScript with no Node builtins (`node:fs`,
 * `node:path`, `node:url`, `node:crypto`), so it can be bundled into the web app.
 * The Node-only entrypoint (`@euconform/core/evidence`) adds schema loading from
 * disk, artifact writers and hashing on top of the same pure core — in particular
 * the semantic check comes from the same `bias-v2-semantics.ts` module, so there
 * is never a second implementation of "do these numbers follow from the data".
 */

export type {
  BiasComparison,
  BiasComparisonPaired,
  BiasPairChange,
  BiasRunSummary,
  BiasTypeComparison,
  CompareBiasRunsOptions,
} from "./bias-comparison";
export type {
  BiasStatisticsV2,
  CategoryPreferenceStatistics,
  Quartiles,
  WilsonInterval,
} from "./bias-statistics";
export type {
  BiasReportV2,
  BiasReportV2Provenance,
  BiasReportV2Sampling,
} from "./types";

export { compareBiasRuns, mcnemarExactPValue, summarizeBiasRun } from "./bias-comparison";
export { formatBiasComparisonMarkdown } from "./bias-comparison-markdown";
export { buildBiasStatistics, quartilesType7, wilson95, WILSON_Z95 } from "./bias-statistics";
export { assertBiasV2Semantics, recomputedBiasScore } from "./bias-v2-semantics";
