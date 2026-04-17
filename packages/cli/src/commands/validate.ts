import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { validate } from "@euconform/core/validation";
import { defineCommand } from "citty";
import consola from "consola";

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

    const results: Array<{
      file: string;
      result: ReturnType<typeof validate>;
    }> = [];

    for (const file of files) {
      let data: unknown;
      try {
        const content = await readFile(file, "utf-8");
        data = JSON.parse(content);
      } catch {
        results.push({
          file,
          result: {
            valid: false,
            schemaType: "report.v1",
            errors: [
              {
                path: "",
                message: `Failed to read or parse file: ${file}`,
                keyword: "parse",
              },
            ],
          },
        });
        continue;
      }
      results.push({ file, result: validate(data) });
    }

    if (args.json) {
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
    } else {
      for (const { file, result } of results) {
        const shortName = file.split("/").pop() ?? file;
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
