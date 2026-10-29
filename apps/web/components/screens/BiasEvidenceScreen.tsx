"use client";

import type { BiasReportV2 } from "@euconform/core/evidence/browser";
import { compareBiasRuns } from "@euconform/core/evidence/browser";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Info, Upload, X } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import {
  BiasArtifactError,
  formatPercent,
  formatSigned,
  formatWilson,
  parseBiasArtifact,
} from "../../lib/bias/bias-artifact";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { BackgroundElements, PageHeader } from "../shared";

interface BiasEvidenceScreenProps {
  onBack: () => void;
}

interface ImportedArtifact {
  fileName: string;
  report: BiasReportV2;
}

type Slot = "baseline" | "candidate";

export function BiasEvidenceScreen({ onBack }: BiasEvidenceScreenProps) {
  const { t } = useLanguage();
  const baselineInput = useRef<HTMLInputElement>(null);
  const candidateInput = useRef<HTMLInputElement>(null);

  const [baseline, setBaseline] = useState<ImportedArtifact | null>(null);
  const [candidate, setCandidate] = useState<ImportedArtifact | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const comparison = useMemo(() => {
    if (!baseline || !candidate) return null;
    return compareBiasRuns(baseline.report, candidate.report, {
      baselinePath: baseline.fileName,
      candidatePath: candidate.fileName,
      topChanges: 10,
    });
  }, [baseline, candidate]);

  const handleFile = async (file: File | undefined, slot: Slot) => {
    if (!file) return;
    const setArtifact = slot === "baseline" ? setBaseline : setCandidate;
    const setError = slot === "baseline" ? setBaselineError : setCandidateError;

    try {
      const report = parseBiasArtifact(await file.text());
      setArtifact({ fileName: file.name, report });
      setError(null);
    } catch (error) {
      setArtifact(null);
      setError(
        error instanceof BiasArtifactError
          ? error.message
          : `Could not read ${file.name}: ${(error as Error).message}`
      );
    }
  };

  const clearSlot = (slot: Slot) => {
    if (slot === "baseline") {
      setBaseline(null);
      setBaselineError(null);
      if (baselineInput.current) baselineInput.current.value = "";
    } else {
      setCandidate(null);
      setCandidateError(null);
      if (candidateInput.current) candidateInput.current.value = "";
    }
  };

  return (
    <main className="min-h-screen relative">
      <BackgroundElements variant="minimal" />

      <div className="absolute top-0 left-0 right-0 z-10">
        <PageHeader />
      </div>

      <div className="mx-auto max-w-4xl px-6 pt-24 pb-16">
        <div className="mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("bias_evidence_back")}
          </button>

          <h1 className="font-serif text-3xl font-bold text-slate-deep dark:text-paper">
            {t("bias_evidence_title")}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {t("bias_evidence_subtitle")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-10">
          <ArtifactSlot
            label={t("bias_evidence_baseline")}
            hint={undefined}
            artifact={baseline}
            error={baselineError}
            inputRef={baselineInput}
            onSelect={(file) => handleFile(file, "baseline")}
            onClear={() => clearSlot("baseline")}
          />
          <ArtifactSlot
            label={t("bias_evidence_candidate")}
            hint={t("bias_evidence_optional")}
            artifact={candidate}
            error={candidateError}
            inputRef={candidateInput}
            onSelect={(file) => handleFile(file, "candidate")}
            onClear={() => clearSlot("candidate")}
          />
        </div>

        {baseline && <BiasReportPanel artifact={baseline} />}

        {comparison && <BiasComparisonPanel comparison={comparison} />}
      </div>
    </main>
  );
}

interface ArtifactSlotProps {
  label: string;
  hint: string | undefined;
  artifact: ImportedArtifact | null;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (file: File | undefined) => void;
  onClear: () => void;
}

function ArtifactSlot({
  label,
  hint,
  artifact,
  error,
  inputRef,
  onSelect,
  onClear,
}: ArtifactSlotProps) {
  const { t } = useLanguage();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSelect(event.target.files?.[0]);
  };

  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white/70 dark:bg-slate-medium/40 p-5">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-slate-deep dark:text-paper">{label}</h2>
        {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
      </div>

      {artifact ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {artifact.fileName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {artifact.report.model} · {artifact.report.analyzedCount} pairs ·{" "}
                {artifact.report.runStatus}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-3 h-3" />
            {t("bias_evidence_clear")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 py-6 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        >
          <Upload className="w-5 h-5" />
          {t("bias_evidence_choose_file")}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleChange}
      />

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
      )}
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white/70 dark:bg-slate-medium/40 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-deep dark:text-paper font-mono">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">{children}</h3>
  );
}

function BiasReportPanel({ artifact }: { artifact: ImportedArtifact }) {
  const { t } = useLanguage();
  const { report } = artifact;
  const statistics = report.statistics;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper">
          {t("bias_evidence_report")}
        </h2>
        <StatusBadge status={report.runStatus} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label={t("bias_evidence_mean_score")} value={report.result.score.toFixed(4)} />
        <StatCard
          label={t("bias_evidence_preference")}
          value={formatPercent(statistics.preferencePercent)}
          detail={`95% Wilson ${formatWilson(statistics.preferenceWilson95)}`}
        />
        <StatCard
          label={t("bias_evidence_analyzed")}
          value={`${report.analyzedCount} / ${report.selectedCount} / ${report.failedCount}`}
        />
        <StatCard
          label={t("bias_evidence_ties")}
          value={String(statistics.tiesCount)}
          detail={`${t("bias_evidence_run_status")}: ${report.runStatus}`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <div>
          <SectionTitle>{t("bias_evidence_catalog")}</SectionTitle>
          <dl className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
            <InfoRow label="Dataset" value={report.dataset} />
            {report.catalog && (
              <InfoRow
                label="Catalog"
                value={`${report.catalog.name}@${report.catalog.version} (${report.catalog.pairCount} pairs)`}
              />
            )}
            <InfoRow label={t("bias_evidence_generated")} value={report.generatedAt} />
          </dl>
        </div>
        <div>
          <SectionTitle>{t("bias_evidence_provenance")}</SectionTitle>
          <dl className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
            <InfoRow
              label="Engine"
              value={`${report.provenance.engine} · ${report.provenance.backend}`}
            />
            <InfoRow label="Model" value={report.provenance.modelId} />
            <InfoRow label="Revision" value={report.provenance.modelRevision} mono />
            <InfoRow label="Dtype" value={report.provenance.dtype} />
            <InfoRow
              label="Runtime"
              value={`transformers ${report.provenance.transformersVersion} · onnxruntime ${report.provenance.onnxruntimeVersion}`}
            />
            <InfoRow label="Template" value={report.provenance.templateStrategy} />
          </dl>
        </div>
      </div>

      <SectionTitle>{t("bias_evidence_by_type")}</SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-border dark:border-border-dark mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Bias type</th>
              <th className="px-4 py-2 font-medium">Pairs</th>
              <th className="px-4 py-2 font-medium">Preference</th>
              <th className="px-4 py-2 font-medium">95% Wilson</th>
            </tr>
          </thead>
          <tbody>
            {statistics.byBiasType.map((row) => (
              <tr key={row.biasType} className="border-t border-border dark:border-border-dark">
                <td className="px-4 py-2">{row.biasType}</td>
                <td className="px-4 py-2 font-mono">{row.analyzedCount}</td>
                <td className="px-4 py-2 font-mono">{formatPercent(row.preferencePercent)}</td>
                <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400">
                  {formatWilson(row.preferenceWilson95)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.failedPairs.length > 0 && (
        <>
          <SectionTitle>{t("bias_evidence_failed_pairs")}</SectionTitle>
          <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400 mb-6">
            {report.failedPairs.map((pair) => (
              <li key={`${pair.pairId ?? "none"}-${pair.reason}`}>
                <span className="font-mono">{pair.pairId ?? "—"}</span>: {pair.reason}
              </li>
            ))}
          </ul>
        </>
      )}

      {report.limitations && report.limitations.length > 0 && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-slate-700 dark:text-slate-300">
          <p className="flex items-center gap-2 font-medium mb-2">
            <Info className="w-4 h-4" />
            Limitations
          </p>
          <ul className="space-y-1 list-disc pl-5">
            {report.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function BiasComparisonPanel({
  comparison,
}: {
  comparison: ReturnType<typeof compareBiasRuns>;
}) {
  const { t } = useLanguage();
  const paired = comparison.paired;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-serif text-xl font-bold text-slate-deep dark:text-paper">
          {t("bias_evidence_comparison")}
        </h2>
        {comparison.comparable ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            {t("bias_evidence_comparable")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-300">
            <AlertTriangle className="w-3 h-3" />
            {t("bias_evidence_not_comparable")}
          </span>
        )}
      </div>

      {!comparison.comparable && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 mb-6 text-sm text-red-800 dark:text-red-300">
          <ul className="space-y-1 list-disc pl-5">
            {comparison.comparabilityIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <StatCard
          label={`${t("bias_evidence_mean_score")} (${t("bias_evidence_delta")})`}
          value={formatSigned(comparison.deltas.meanBiasScore)}
          detail={`${comparison.baseline.meanBiasScore.toFixed(4)} → ${comparison.candidate.meanBiasScore.toFixed(4)}`}
        />
        <StatCard
          label={`${t("bias_evidence_preference")} (${t("bias_evidence_delta")})`}
          value={`${formatSigned(comparison.deltas.preferencePercentPoints, 1)} pp`}
          detail={`${formatPercent(comparison.baseline.preferencePercent)} → ${formatPercent(comparison.candidate.preferencePercent)}`}
        />
        <StatCard
          label={t("bias_evidence_pairs_compared")}
          value={String(paired.pairsCompared)}
          detail={`${t("bias_evidence_flips")}: ${paired.baselinePreferredOnly} / ${paired.candidatePreferredOnly}`}
        />
      </div>

      <div className="rounded-xl border border-border dark:border-border-dark bg-white/70 dark:bg-slate-medium/40 p-4 mb-6 text-sm text-slate-700 dark:text-slate-300">
        {paired.mcnemarExact ? (
          <p>
            {t("bias_evidence_mcnemar")}: p ={" "}
            <span className="font-mono">
              {paired.mcnemarExact.pValue < 0.0001
                ? paired.mcnemarExact.pValue.toExponential(2)
                : paired.mcnemarExact.pValue.toFixed(4)}
            </span>{" "}
            (alpha {paired.mcnemarExact.alpha}, {paired.mcnemarExact.discordantPairs} discordant
            pairs) →{" "}
            <span
              className={
                paired.mcnemarExact.significant
                  ? "font-semibold text-red-700 dark:text-red-400"
                  : "font-semibold text-slate-700 dark:text-slate-200"
              }
            >
              {paired.mcnemarExact.significant
                ? t("bias_evidence_significant")
                : t("bias_evidence_not_significant")}
            </span>
          </p>
        ) : (
          <p>
            {t("bias_evidence_mcnemar")}: {t("bias_evidence_no_changes")}
          </p>
        )}
      </div>

      <SectionTitle>{t("bias_evidence_by_type")}</SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-border dark:border-border-dark mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Bias type</th>
              <th className="px-4 py-2 font-medium">Baseline</th>
              <th className="px-4 py-2 font-medium">Candidate</th>
              <th className="px-4 py-2 font-medium">{t("bias_evidence_delta")}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.byBiasType.map((row) => (
              <tr key={row.biasType} className="border-t border-border dark:border-border-dark">
                <td className="px-4 py-2">{row.biasType}</td>
                <td className="px-4 py-2 font-mono">
                  {formatPercent(row.baselinePreferencePercent)}
                </td>
                <td className="px-4 py-2 font-mono">
                  {formatPercent(row.candidatePreferencePercent)}
                </td>
                <td className="px-4 py-2 font-mono">{formatSigned(row.deltaPoints, 1)} pp</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>{t("bias_evidence_changes")}</SectionTitle>
      {comparison.largestChanges.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("bias_evidence_no_changes")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border dark:border-border-dark mb-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Pair</th>
                <th className="px-4 py-2 font-medium">Bias type</th>
                <th className="px-4 py-2 font-medium">Baseline</th>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">{t("bias_evidence_delta")}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.largestChanges.map((change) => (
                <tr
                  key={`${change.pairId ?? change.stereotype}-${change.antiStereotype}`}
                  className="border-t border-border dark:border-border-dark"
                >
                  <td className="px-4 py-2 font-mono">{change.pairId ?? "—"}</td>
                  <td className="px-4 py-2">{change.biasType ?? "unspecified"}</td>
                  <td className="px-4 py-2 font-mono">{change.baselineBiasScore.toFixed(4)}</td>
                  <td className="px-4 py-2 font-mono">{change.candidateBiasScore.toFixed(4)}</td>
                  <td className="px-4 py-2 font-mono">{formatSigned(change.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comparison.environmentDifferences.length > 0 && (
        <>
          <SectionTitle>{t("bias_evidence_env_diff")}</SectionTitle>
          <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
            {comparison.environmentDifferences.map((difference) => (
              <li key={difference} className="font-mono text-xs">
                {difference}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-slate-500 dark:text-slate-500">{label}:</dt>
      <dd className={`min-w-0 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: "complete" | "partial" }) {
  const isComplete = status === "complete";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isComplete
          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
          : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
      }`}
    >
      {status}
    </span>
  );
}
