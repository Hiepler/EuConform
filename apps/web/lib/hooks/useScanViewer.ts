"use client";

import type { AiBillOfMaterials, CiReport, ScanReport } from "@euconform/core/evidence";
import { useCallback, useState } from "react";
import type { ImportedScanBundle, ScanFileSlot, ScanFileStatus } from "../types/scan-viewer";
import { SCAN_FILE_SLOTS } from "../types/scan-viewer";
import { UnrecognizedFileError, parseFile } from "../utils/scan-file-validator";

const INITIAL_STATUSES: ScanFileStatus[] = (
  Object.entries(SCAN_FILE_SLOTS) as Array<[ScanFileSlot, { pattern: string; required: boolean }]>
).map(([slot, { required }]) => ({ slot, fileName: null, accepted: false, error: null, required }));

export interface UseScanViewerReturn {
  bundle: ImportedScanBundle | null;
  fileStatuses: ScanFileStatus[];
  isImporting: boolean;
  importError: string | null;
  handleFilesSelected: (files: FileList) => void;
  clearImport: () => void;
}

interface ProcessResult {
  report: ScanReport | null;
  aibom: AiBillOfMaterials | null;
  ciReport: CiReport | null;
  summaryMarkdown: string | null;
  validationErrors: string[];
  ignoredFiles: string[];
  statuses: ScanFileStatus[];
}

function markSlotError(statuses: ScanFileStatus[], fileName: string, message: string) {
  const baseName = fileName.split("/").pop() ?? fileName;
  for (const [slot, info] of Object.entries(SCAN_FILE_SLOTS)) {
    if (baseName === info.pattern) {
      const entry = statuses.find((s) => s.slot === slot);
      if (entry) {
        entry.error = message;
        entry.fileName = fileName;
      }
    }
  }
}

function processSingleFile(
  name: string,
  content: string,
  statuses: ScanFileStatus[],
  parsed: Record<string, unknown>,
  validationErrors: string[],
  ignoredFiles: string[]
) {
  try {
    const result = parseFile(name, content);
    const entry = statuses.find((s) => s.slot === result.slot);
    if (entry) {
      entry.fileName = name;
      entry.accepted = true;
    }
    parsed[result.slot] = result.data;
  } catch (err) {
    if (err instanceof UnrecognizedFileError) {
      ignoredFiles.push(name);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      validationErrors.push(`${name}: ${message}`);
      markSlotError(statuses, name, message);
    }
  }
}

function processFiles(entries: Array<{ name: string; content: string }>): ProcessResult {
  const statuses: ScanFileStatus[] = INITIAL_STATUSES.map((s) => ({ ...s }));
  const validationErrors: string[] = [];
  const ignoredFiles: string[] = [];
  const parsed: Record<string, unknown> = {};

  for (const { name, content } of entries) {
    processSingleFile(name, content, statuses, parsed, validationErrors, ignoredFiles);
  }

  return {
    report: (parsed.report as ScanReport) ?? null,
    aibom: (parsed.aibom as AiBillOfMaterials) ?? null,
    ciReport: (parsed.ci as CiReport) ?? null,
    summaryMarkdown: (parsed.summary as string) ?? null,
    validationErrors,
    ignoredFiles,
    statuses,
  };
}

export function useScanViewer(): UseScanViewerReturn {
  const [bundle, setBundle] = useState<ImportedScanBundle | null>(null);
  const [fileStatuses, setFileStatuses] = useState<ScanFileStatus[]>(INITIAL_STATUSES);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFilesSelected = useCallback(async (files: FileList) => {
    setIsImporting(true);
    setImportError(null);

    const contents = await Promise.all(
      Array.from(files).map(async (f) => ({ name: f.name, content: await f.text() }))
    );

    const { report, aibom, ciReport, summaryMarkdown, validationErrors, ignoredFiles, statuses } =
      processFiles(contents);

    setFileStatuses(statuses);

    if (!report) {
      setImportError("scan_viewer_no_report");
      setBundle(null);
    } else {
      setBundle({ report, aibom, ciReport, summaryMarkdown, validationErrors, ignoredFiles });
    }

    setIsImporting(false);
  }, []);

  const clearImport = useCallback(() => {
    setBundle(null);
    setFileStatuses(INITIAL_STATUSES.map((s) => ({ ...s })));
    setIsImporting(false);
    setImportError(null);
  }, []);

  return { bundle, fileStatuses, isImporting, importError, handleFilesSelected, clearImport };
}
