import Papa from "papaparse";
import type {
  CustomTestEntry,
  NormalizedTestCase,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from "../types/custom-test-suite";

export function parseCSV(fileContent: string): { data: unknown[]; errors: Papa.ParseError[] } {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  return { data: result.data, errors: result.errors };
}

export function parseJSON(fileContent: string): { data: unknown[]; error: string | null } {
  try {
    const parsed = JSON.parse(fileContent);
    const data = Array.isArray(parsed)
      ? parsed
      : parsed.entries || parsed.data || parsed.pairs || [];
    if (!Array.isArray(data)) {
      return { data: [], error: "JSON must contain an array of test cases" };
    }
    return { data, error: null };
  } catch (e) {
    return { data: [], error: `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}` };
  }
}

interface SingleEntryResult {
  entry: CustomTestEntry | null;
  error: ValidationError | null;
  warnings: ValidationWarning[];
}

function validateSingleEntry(entry: unknown, row: number): SingleEntryResult {
  const warnings: ValidationWarning[] = [];

  if (typeof entry !== "object" || entry === null) {
    return {
      entry: null,
      error: { row, field: "entry", message: "Invalid entry format" },
      warnings,
    };
  }

  const record = entry as Record<string, unknown>;
  const prompt = record.prompt ?? record.Prompt ?? record.PROMPT ?? record.input ?? record.text;

  if (typeof prompt !== "string" || prompt.trim() === "") {
    return {
      entry: null,
      error: { row, field: "prompt", message: "Missing or empty 'prompt' field (required)" },
      warnings,
    };
  }

  const label = record.label ?? record.Label ?? record.LABEL ?? record.category ?? record.type;
  if (label !== undefined && typeof label !== "string") {
    warnings.push({ row, field: "label", message: "Label should be a string, ignoring" });
  }

  const trigger =
    record.expected_trigger ?? record.expectedTrigger ?? record.trigger ?? record.triggers;
  if (trigger !== undefined && typeof trigger !== "string" && !Array.isArray(trigger)) {
    warnings.push({
      row,
      field: "expected_trigger",
      message: "Expected trigger should be a string or array, ignoring",
    });
  }

  const validEntry: CustomTestEntry = {
    prompt: String(prompt).trim(),
    label: typeof label === "string" ? label.trim() : undefined,
    expected_trigger:
      typeof trigger === "string"
        ? trigger.trim()
        : Array.isArray(trigger)
          ? trigger.join(",")
          : undefined,
  };

  return { entry: validEntry, error: null, warnings };
}

export function validateEntries(entries: unknown[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const validEntries: CustomTestEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const result = validateSingleEntry(entries[i], i + 1);
    warnings.push(...result.warnings);

    if (result.error) {
      errors.push(result.error);
    } else if (result.entry) {
      validEntries.push(result.entry);
    }
  }

  return {
    isValid: errors.length === 0 && validEntries.length > 0,
    errors,
    warnings,
    validEntries,
  };
}

export function normalizeTestCases(entries: CustomTestEntry[]): NormalizedTestCase[] {
  return entries.map((entry, index) => ({
    id: index + 1,
    prompt: entry.prompt,
    label: entry.label ?? null,
    expectedTriggers: entry.expected_trigger
      ? entry.expected_trigger
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  }));
}

export async function processUploadedFile(
  file: File
): Promise<{ testCases: NormalizedTestCase[]; validation: ValidationResult }> {
  const content = await file.text();
  const extension = file.name.toLowerCase().split(".").pop();

  let rawData: unknown[];
  let parseError: string | null = null;

  if (extension === "csv") {
    const { data, errors } = parseCSV(content);
    rawData = data;
    if (errors.length > 0) {
      parseError = errors.map((e) => e.message).join("; ");
    }
  } else if (extension === "json") {
    const { data, error } = parseJSON(content);
    rawData = data;
    parseError = error;
  } else {
    throw new Error(`Unsupported file format: .${extension}. Use .csv or .json`);
  }

  if (parseError) {
    throw new Error(parseError);
  }

  const validation = validateEntries(rawData);
  const testCases = normalizeTestCases(validation.validEntries);

  return { testCases, validation };
}
