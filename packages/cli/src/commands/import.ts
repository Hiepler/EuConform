import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { importCycloneDx } from "@euconform/core/sbom";
import { defineCommand } from "citty";
import consola from "consola";

export default defineCommand({
  meta: {
    name: "import",
    description:
      "Import a CycloneDX SBOM and extract AI-relevant components into an EuConform AI BOM",
  },
  args: {
    path: {
      type: "positional",
      required: true,
      description: "Path to a CycloneDX JSON SBOM file",
    },
    scope: {
      type: "string",
      default: "all",
      description:
        'Component scope filter: "all" includes everything, "production" excludes optional-scope components',
    },
    json: {
      type: "boolean",
      default: false,
      description: "Output results as JSON to stdout",
    },
    output: {
      type: "string",
      alias: "o",
      default: ".euconform",
      description: "Output directory for the generated aibom file",
    },
  },
  async run({ args }) {
    const inputPath = resolve(args.path as string);
    const outputDir = resolve(args.output as string);
    const scope = (args.scope as string) === "production" ? "production" : "all";

    let data: unknown;
    try {
      const content = await readFile(inputPath, "utf-8");
      data = JSON.parse(content);
    } catch {
      consola.error(`Failed to read or parse file: ${inputPath}`);
      process.exit(2);
    }

    let result: ReturnType<typeof importCycloneDx>;
    try {
      result = importCycloneDx(data, { scope });
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    if (args.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            aibom: result.aibom,
            summary: result.summary,
            validation: {
              valid: result.validation.valid,
              errors: result.validation.errors,
            },
          },
          null,
          2
        )}\n`
      );
      return;
    }

    // Human-readable output
    const fileName = basename(inputPath);
    consola.log("");
    consola.log("CycloneDX Import");
    consola.log("\u2500".repeat(40));
    consola.log(`Source:      ${fileName} (CycloneDX)`);
    consola.log(
      `Components:  ${result.summary.totalComponents} total \u2192 ${result.summary.aiRelevant} AI-relevant, ${result.summary.skipped} skipped`
    );
    consola.log("");

    for (const [kind, count] of Object.entries(result.summary.byKind).sort((a, b) => b[1] - a[1])) {
      const names = result.aibom.components
        .filter((c) => c.kind === kind)
        .map((c) => c.name)
        .join(", ");
      consola.log(`  ${kind.padEnd(20)} ${String(count).padStart(2)}  (${names})`);
    }

    if (result.summary.warnings.length > 0) {
      consola.log("");
      for (const w of result.summary.warnings) {
        consola.warn(`${w.component}: ${w.message}`);
      }
    }

    // Write output
    await mkdir(outputDir, { recursive: true });
    const aibomPath = join(outputDir, "euconform.aibom.json");
    await writeFile(aibomPath, JSON.stringify(result.aibom, null, 2), "utf-8");
    consola.log("");
    consola.success(`${aibomPath} ${result.validation.valid ? "(valid)" : "(validation errors!)"}`);

    if (!result.validation.valid) {
      for (const err of result.validation.errors) {
        consola.error(`  ${err.path || "/"} \u2014 ${err.message}`);
      }
      process.exit(1);
    }
  },
});
