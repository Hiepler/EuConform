import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { validate } from "@euconform/core/validation";
import type { ValidationResult } from "@euconform/core/validation";
import { defineCommand } from "citty";
import consola from "consola";

interface FileResult {
  file: string;
  result: ValidationResult;
}

async function validateFile(file: string): Promise<FileResult> {
  try {
    const content = await readFile(file, "utf-8");
    const data: unknown = JSON.parse(content);
    return { file, result: validate(data) };
  } catch {
    return {
      file,
      result: {
        valid: false,
        schemaType: "report.v1",
        errors: [{ path: "", message: `Failed to read or parse file: ${file}`, keyword: "parse" }],
      },
    };
  }
}

function printJsonResults(results: FileResult[]): void {
  process.stdout.write(
    `${JSON.stringify(
      results.map((r) => ({
        file: r.file,
        valid: r.result.valid,
        schemaType: r.result.schemaType,
        errors: r.result.errors,
      })),
      null,
      2
    )}\n`
  );
}

function printHumanResults(results: FileResult[]): void {
  for (const { file, result } of results) {
    const shortName = basename(file);
    if (result.valid) {
      consola.success(`${shortName} \u2014 valid (euconform.${result.schemaType})`);
    } else {
      consola.error(
        `${shortName} \u2014 ${result.errors.length} error(s) (euconform.${result.schemaType})`
      );
      for (const err of result.errors) {
        consola.log(`  ${err.path || "/"} \u2014 ${err.message}`);
      }
    }
  }
}

export default defineCommand({
  meta: {
    name: "validate",
    description: "Validate EuConform JSON files against published schemas",
  },
  args: {
    path: {
      type: "positional",
      required: true,
      description: "Path to a EuConform JSON file or directory containing EuConform JSON files",
    },
    json: {
      type: "boolean",
      default: false,
      description: "Output results as JSON",
    },
  },
  async run({ args }) {
    const inputPath = resolve(args.path as string);
    const files = await resolveInputFiles(inputPath);

    if (files.length === 0) {
      consola.error("No EuConform JSON files found at the given path.");
      process.exit(2);
    }

    const results = await Promise.all(files.map(validateFile));

    if (args.json) {
      printJsonResults(results);
    } else {
      printHumanResults(results);
    }

    const hasErrors = results.some((r) => !r.result.valid);
    process.exit(hasErrors ? 1 : 0);
  },
});

async function resolveInputFiles(inputPath: string): Promise<string[]> {
  const info = await stat(inputPath).catch(() => null);
  if (!info) return [];

  if (info.isFile()) {
    return inputPath.endsWith(".json") ? [inputPath] : [];
  }

  if (info.isDirectory()) {
    const entries = await readdir(inputPath);
    return entries
      .filter((name) => name.startsWith("euconform.") && name.endsWith(".json"))
      .map((name) => join(inputPath, name))
      .sort();
  }

  return [];
}
