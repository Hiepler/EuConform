"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  Info,
  Lightbulb,
  MessageCircleQuestion,
} from "lucide-react";
import { useScanViewer } from "../../../lib/hooks/useScanViewer";
import { useLanguage } from "../../../lib/i18n/LanguageContext";
import { BackgroundElements, PageHeader } from "../../shared";
import { BomComponentTable } from "./BomComponentTable";
import { ComplianceSignalGrid } from "./ComplianceSignalGrid";
import { ScanFileImporter } from "./ScanFileImporter";
import { ScanGapsList } from "./ScanGapsList";
import { ScanOverviewCard } from "./ScanOverviewCard";

interface ScanViewerScreenProps {
  onNavigateToWizard: () => void;
  onBack: () => void;
}

function BulletList({
  icon: Icon,
  title,
  items,
}: { icon: LucideIcon; title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
          >
            <span className="text-slate-400 dark:text-slate-500 mt-0.5">&bull;</span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ScanViewerScreen({ onNavigateToWizard, onBack }: ScanViewerScreenProps) {
  const { t } = useLanguage();
  const { bundle, fileStatuses, isImporting, importError, handleFilesSelected, clearImport } =
    useScanViewer();

  const handleBack = () => {
    clearImport();
    onBack();
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
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("scan_viewer_back")}
          </button>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-deep dark:text-paper tracking-tight">
            {t("scan_viewer_title")}
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
            {t("scan_viewer_subtitle")}
          </p>
        </div>

        {!bundle && (
          <ScanFileImporter
            fileStatuses={fileStatuses}
            isImporting={isImporting}
            importError={importError}
            onFilesSelected={handleFilesSelected}
            onClear={clearImport}
          />
        )}

        {bundle && (
          <div className="space-y-8">
            {(bundle.validationErrors.length > 0 || bundle.ignoredFiles.length > 0) && (
              <div className="space-y-2">
                {bundle.validationErrors.map((err) => (
                  <div
                    key={err}
                    className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">{err}</p>
                  </div>
                ))}
                {bundle.ignoredFiles.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                    <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("scan_viewer_ignored_files")}: {bundle.ignoredFiles.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <section>
              <ScanOverviewCard report={bundle.report} ciReport={bundle.ciReport} />
            </section>

            <BulletList
              icon={MessageCircleQuestion}
              title={t("scan_viewer_open_questions")}
              items={bundle.report.assessmentHints.openQuestions}
            />

            <BulletList
              icon={Lightbulb}
              title={t("scan_viewer_recommendations")}
              items={bundle.report.recommendationSummary}
            />

            <section>
              <ComplianceSignalGrid signals={bundle.report.complianceSignals} />
            </section>

            <section>
              <ScanGapsList gaps={bundle.report.gaps} />
            </section>

            {bundle.aibom && (
              <section>
                <BomComponentTable aibom={bundle.aibom} />
              </section>
            )}

            {bundle.summaryMarkdown && (
              <section>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("scan_viewer_summary")}
                </h3>
                <pre className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-slate-medium/50 p-4 text-xs text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                  {bundle.summaryMarkdown}
                </pre>
              </section>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-border dark:border-border-dark">
              <button
                type="button"
                onClick={clearImport}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline transition-colors"
              >
                {t("scan_viewer_clear")}
              </button>
              <button
                type="button"
                onClick={onNavigateToWizard}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-deep dark:border-paper text-slate-deep dark:text-paper font-medium rounded-lg hover:bg-slate-deep hover:text-paper dark:hover:bg-paper dark:hover:text-slate-deep transition-all duration-300"
              >
                {t("scan_viewer_start_classification")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
