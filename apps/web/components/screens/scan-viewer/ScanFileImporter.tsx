"use client";

import { AlertCircle, CheckCircle2, Minus, Upload } from "lucide-react";
import { type DragEvent, useCallback, useRef, useState } from "react";
import { useLanguage } from "../../../lib/i18n/LanguageContext";
import type { ScanFileStatus } from "../../../lib/types/scan-viewer";
import { SCAN_FILE_SLOTS } from "../../../lib/types/scan-viewer";

interface ScanFileImporterProps {
  fileStatuses: ScanFileStatus[];
  isImporting: boolean;
  importError: string | null;
  onFilesSelected: (files: FileList) => void;
  onClear: () => void;
}

function SlotIndicator({ status }: { status: ScanFileStatus }) {
  const { t } = useLanguage();
  const label = SCAN_FILE_SLOTS[status.slot].pattern;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status.accepted ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : status.error ? (
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      ) : (
        <Minus className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
      )}
      <span
        className={
          status.accepted
            ? "text-slate-700 dark:text-slate-300"
            : "text-slate-400 dark:text-slate-500"
        }
      >
        {label}
      </span>
      {status.required && !status.accepted && !status.error && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {t("scan_viewer_file_required")}
        </span>
      )}
      {!status.required && !status.accepted && !status.error && (
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {t("scan_viewer_file_optional")}
        </span>
      )}
      {status.error && (
        <span
          className="text-xs text-red-500 dark:text-red-400 truncate max-w-[200px]"
          title={status.error}
        >
          {status.error}
        </span>
      )}
    </div>
  );
}

export function ScanFileImporter({
  fileStatuses,
  isImporting,
  importError,
  onFilesSelected,
  onClear,
}: ScanFileImporterProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const hasAnyFile = fileStatuses.some((s) => s.accepted || s.error);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <button
        type="button"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative w-full cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragOver
            ? "border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/10"
            : "border-border dark:border-border-dark hover:border-slate-400 dark:hover:border-slate-500"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json,.md"
          onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
          className="hidden"
        />

        {isImporting ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-slate-600 dark:text-slate-400">{t("loading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            <p className="text-slate-600 dark:text-slate-400">{t("scan_viewer_import_prompt")}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">.json, .md</p>
          </div>
        )}
      </button>

      <div className="mt-4 space-y-1.5">
        {fileStatuses.map((status) => (
          <SlotIndicator key={status.slot} status={status} />
        ))}
      </div>

      {importError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{t(importError)}</p>
        </div>
      )}

      {hasAnyFile && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="mt-3 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
        >
          {t("scan_viewer_clear")}
        </button>
      )}
    </div>
  );
}
