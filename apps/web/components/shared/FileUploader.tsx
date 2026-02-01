"use client";

import { Button } from "@euconform/ui/button";
import { cn } from "@euconform/ui/lib/utils";
import { AlertCircle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { type ChangeEvent, type DragEvent, useCallback, useRef, useState } from "react";
import type { NormalizedTestCase, ValidationResult } from "../../lib/types/custom-test-suite";
import { processUploadedFile } from "../../lib/utils/custom-test-parser";

interface FileUploaderProps {
  onUploadComplete: (testCases: NormalizedTestCase[], fileName: string) => void;
  onClear: () => void;
  isActive: boolean;
  className?: string;
}

interface DropZoneContentProps {
  isLoading: boolean;
  error: string | null;
  isDragOver: boolean;
  onClear: () => void;
}

function DropZoneContent({ isLoading, error, isDragOver, onClear }: DropZoneContentProps) {
  if (isLoading) {
    return (
      <>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-slate-600 dark:text-slate-400">Processing file...</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="font-medium text-red-700 dark:text-red-400">Import Failed</p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onClear();
          }}
        >
          Try Again
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
        {isDragOver ? (
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        ) : (
          <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        )}
      </div>
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100">
          {isDragOver ? "Drop file here" : "Upload Custom Test Suite"}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Drag & drop or click to select (.csv, .json)
        </p>
      </div>
      <div className="flex gap-2 text-xs text-slate-400">
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">prompt (required)</span>
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">label (optional)</span>
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1">
          expected_trigger (optional)
        </span>
      </div>
    </>
  );
}

export function FileUploader({
  onUploadComplete,
  onClear,
  isActive,
  className,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<NormalizedTestCase[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setValidation(null);

      try {
        const { testCases, validation: validationResult } = await processUploadedFile(file);

        if (!validationResult.isValid) {
          const errorMsg = validationResult.errors
            .slice(0, 3)
            .map((e) => `Row ${e.row}: ${e.message}`)
            .join("\n");
          setError(errorMsg);
          setIsLoading(false);
          return;
        }

        setValidation(validationResult);
        setPreview(testCases.slice(0, 5));
        setFileName(file.name);
        setTotalCount(testCases.length);
        onUploadComplete(testCases, file.name);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to process file");
      } finally {
        setIsLoading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setError(null);
    setValidation(null);
    setPreview([]);
    setFileName(null);
    setTotalCount(0);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }, [onClear]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  // Success state with preview
  if (isActive && preview.length > 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-xl p-6",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                {totalCount} Test-Cases ready
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{fileName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                  #
                </th>
                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                  Prompt
                </th>
                <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
                  Label
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 text-slate-500">{item.id}</td>
                  <td className="py-2 px-3 text-slate-900 dark:text-slate-100 max-w-[300px] truncate">
                    {item.prompt}
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                    {item.label || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalCount > 5 && (
            <p className="text-center text-sm text-slate-500 mt-2">
              + {totalCount - 5} more test cases
            </p>
          )}
        </div>

        {/* Warnings */}
        {validation?.warnings && validation.warnings.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {validation.warnings.length} warning(s) during import
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone - using div with role="button" because we need drag-and-drop support */}
      {/* biome-ignore lint/a11y/useSemanticElements: div is required for drag-and-drop functionality */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-200",
          "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl",
          isDragOver
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            : "border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50",
          error && "border-red-400 bg-red-50/50 dark:bg-red-950/20",
          isLoading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <DropZoneContent
            isLoading={isLoading}
            error={error}
            isDragOver={isDragOver}
            onClear={handleClear}
          />
        </div>
      </div>
    </div>
  );
}
