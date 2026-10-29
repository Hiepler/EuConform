/**
 * Markdown rendering for `compareBiasRuns` output.
 *
 * Kept separate from the comparison logic so the numbers stay pure and testable;
 * this module only formats. Mirrors the tone of the existing bias report: no
 * severity labels, no pass/fail verdict — just the self-checkable numbers and
 * the significance of the observed shift.
 */

import type { BiasComparison, BiasRunSummary } from "./bias-comparison";
import type { WilsonInterval } from "./bias-statistics";

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function signed(value: number, digits: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function points(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} pp`;
}

function wilson(interval: WilsonInterval | null): string {
  if (!interval) return "n/a";
  return `[${percent(interval.lower * 100)}, ${percent(interval.upper * 100)}]`;
}

function pValue(value: number): string {
  return value < 0.0001 ? value.toExponential(2) : value.toFixed(4);
}

function runHeading(label: string, run: BiasRunSummary): string {
  return `**${label}:** ${run.model} — ${run.dataset} (${run.generatedAt})`;
}

function summarySection(comparison: BiasComparison): string[] {
  const { baseline, candidate, deltas } = comparison;
  const rows = [
    `| Model | ${baseline.model} | ${candidate.model} | — |`,
    `| Mean bias score | ${baseline.meanBiasScore.toFixed(4)} | ${candidate.meanBiasScore.toFixed(4)} | ${signed(deltas.meanBiasScore, 4)} |`,
    `| Preference quote (bias > 0) | ${percent(baseline.preferencePercent)} (95% Wilson ${wilson(baseline.preferenceWilson95)}) | ${percent(candidate.preferencePercent)} (95% Wilson ${wilson(candidate.preferenceWilson95)}) | ${points(deltas.preferencePercentPoints)} |`,
    `| Analyzed pairs | ${baseline.analyzedCount} | ${candidate.analyzedCount} | ${candidate.analyzedCount - baseline.analyzedCount} |`,
    `| Ties (bias = 0) | ${baseline.tiesCount} | ${candidate.tiesCount} | ${candidate.tiesCount - baseline.tiesCount} |`,
    `| Equal-token subset | ${baseline.equalTokenPairsCount} pairs | ${candidate.equalTokenPairsCount} pairs | ${candidate.equalTokenPairsCount - baseline.equalTokenPairsCount} |`,
    `| Run status | ${baseline.runStatus} | ${candidate.runStatus} | — |`,
  ];

  return [
    "## Run Summary",
    "",
    "| Metric | Baseline | Candidate | Delta |",
    "|--------|----------|-----------|-------|",
    ...rows,
    "",
  ];
}

function pairedSection(comparison: BiasComparison): string[] {
  const { paired } = comparison;
  const lines = [
    "## Paired Comparison",
    "",
    `- Pairs measured in both runs: ${paired.pairsCompared} (paired by ${paired.keyStrategy === "pairId" ? "pair id" : "sentence text"})`,
    `- Only in baseline: ${paired.onlyInBaseline}, only in candidate: ${paired.onlyInCandidate}`,
    `- Preference flips: baseline only ${paired.baselinePreferredOnly}, candidate only ${paired.candidatePreferredOnly}`,
  ];

  if (!paired.mcnemarExact) {
    lines.push("- McNemar exact test: n/a (no discordant pairs)");
  } else {
    const { discordantPairs, pValue: p, alpha, significant } = paired.mcnemarExact;
    lines.push(
      `- McNemar exact test (two-sided, ${discordantPairs} discordant pairs): p = ${pValue(p)} (alpha ${alpha}) → ${
        significant ? "significant shift" : "no significant shift"
      }`
    );
  }

  return [...lines, ""];
}

function biasTypeSection(comparison: BiasComparison): string[] {
  if (comparison.byBiasType.length === 0) return [];

  return [
    "## Preference By Bias Type",
    "",
    "| Bias type | Baseline | Candidate | Delta | Pairs (baseline / candidate) |",
    "|-----------|----------|-----------|-------|------------------------------|",
    ...comparison.byBiasType.map(
      (row) =>
        `| ${row.biasType} | ${percent(row.baselinePreferencePercent)} | ${percent(row.candidatePreferencePercent)} | ${points(row.deltaPoints)} | ${row.baselineAnalyzedCount} / ${row.candidateAnalyzedCount} |`
    ),
    "",
  ];
}

function changesSection(comparison: BiasComparison): string[] {
  if (comparison.largestChanges.length === 0) {
    return ["## Per-Pair Changes", "", "No pairs changed between the two runs.", ""];
  }

  return [
    "## Largest Per-Pair Changes",
    "",
    "| Pair | Bias type | Baseline | Candidate | Delta |",
    "|------|-----------|----------|-----------|-------|",
    ...comparison.largestChanges.map(
      (change) =>
        `| ${change.pairId ?? "—"} | ${change.biasType ?? "unspecified"} | ${change.baselineBiasScore.toFixed(4)} | ${change.candidateBiasScore.toFixed(4)} | ${signed(change.delta, 4)} |`
    ),
    "",
  ];
}

function comparabilitySection(comparison: BiasComparison): string[] {
  const lines = [`**Comparable:** ${comparison.comparable ? "yes" : "no"}`, ""];

  if (!comparison.comparable) {
    lines.push(
      "The two runs did not answer the same question with the same measurement setup. The deltas below are not a measurement of model behaviour and MUST NOT be read as one:",
      "",
      ...comparison.comparabilityIssues.map((issue) => `- ${issue}`),
      ""
    );
  }

  if (comparison.environmentDifferences.length > 0) {
    lines.push(
      "## Environment Differences",
      "",
      "Expected for model-to-model comparisons; listed so the difference stays visible:",
      "",
      ...comparison.environmentDifferences.map((difference) => `- ${difference}`),
      ""
    );
  }

  return lines;
}

export function formatBiasComparisonMarkdown(comparison: BiasComparison): string {
  return [
    "# EuConform Bias Comparison",
    "",
    runHeading("Baseline", comparison.baseline),
    "",
    runHeading("Candidate", comparison.candidate),
    "",
    ...comparabilitySection(comparison),
    ...summarySection(comparison),
    ...pairedSection(comparison),
    ...biasTypeSection(comparison),
    ...changesSection(comparison),
    "---",
    "",
    "*Generated by [EuConform CLI](https://github.com/Hiepler/EuConform). Comparison of reproducible CrowS-Pairs measurements; preference means the stereotype sentence scored higher than the anti-stereotype sentence.*",
    "",
  ].join("\n");
}
