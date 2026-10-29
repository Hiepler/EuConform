import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BiasReportV2 } from "@euconform/core/evidence";
import {
  compareBiasRuns,
  formatBiasComparisonMarkdown,
  validateBiasReportV2,
} from "@euconform/core/evidence";
import { defineCommand } from "citty";
import consola from "consola";
import { exitWithError } from "../utils/exit";

const VALID_OUTPUTS = new Set(["md", "json", "all"]);
const BIAS_ARTIFACT_NAME = "euconform.bias.json";

/**
 * Accepts either the artifact file itself or the directory a bias run wrote it
 * to, so `compare a/ b/` works like `compare a/euconform.bias.json ...`.
 */
async function resolveArtifactPath(rawPath: string): Promise<string> {
  const absolute = resolve(rawPath);
  try {
    const info = await stat(absolute);
    if (info.isDirectory()) return join(absolute, BIAS_ARTIFACT_NAME);
    return absolute;
  } catch {
    return exitWithError(`Pfad nicht gefunden: ${rawPath}`);
  }
}

async function loadBiasReport(path: string): Promise<BiasReportV2> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf-8"));
  } catch (error) {
    return exitWithError(`${path} konnte nicht gelesen werden: ${(error as Error).message}`);
  }

  try {
    return validateBiasReportV2(parsed);
  } catch (error) {
    return exitWithError(
      `${path} ist kein gültiges euconform.bias.v2 Artefakt: ${(error as Error).message}`
    );
  }
}

function parseTop(raw: string | undefined): number {
  if (raw === undefined) return 10;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    return exitWithError(`Ungültiges --top: ${raw}. Erwartet eine ganze Zahl >= 1.`);
  }
  return value;
}

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 0.05;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value >= 1) {
    return exitWithError(`Ungültiges --alpha: ${raw}. Erwartet eine Zahl zwischen 0 und 1.`);
  }
  return value;
}

export default defineCommand({
  meta: {
    name: "compare",
    description:
      "Compare two euconform.bias.v2 artifacts (baseline vs candidate): score/preference deltas, per-bias-type shifts, McNemar significance",
  },
  args: {
    baseline: {
      type: "positional",
      description: "Baseline artifact (euconform.bias.json) or the directory containing it",
      required: true,
    },
    candidate: {
      type: "positional",
      description: "Candidate artifact (euconform.bias.json) or the directory containing it",
      required: true,
    },
    output: {
      type: "string",
      description: "Output format: md, json, or all (all requires --out-dir)",
      default: "md",
    },
    "out-dir": {
      type: "string",
      description:
        "Write euconform.bias-comparison.{md,json} into this directory instead of stdout",
    },
    top: {
      type: "string",
      description: "Number of per-pair changes to list (default 10)",
    },
    alpha: {
      type: "string",
      description: "Significance level for the McNemar test (default 0.05)",
    },
    "allow-incomparable": {
      type: "boolean",
      description:
        "Report deltas even when catalog/method/template differ. The result is then explicitly marked comparable: false.",
    },
  },
  async run({ args }) {
    const output = args.output as string;
    if (!VALID_OUTPUTS.has(output)) {
      exitWithError(`Invalid output format: ${output}. Use one of: md, json, all.`);
    }

    const outDir = args["out-dir"] as string | undefined;
    if (output === "all" && outDir === undefined) {
      exitWithError(
        "--output all benötigt --out-dir, sonst würden zwei Formate auf stdout kollidieren."
      );
    }

    const baselinePath = await resolveArtifactPath(args.baseline as string);
    const candidatePath = await resolveArtifactPath(args.candidate as string);
    const baseline = await loadBiasReport(baselinePath);
    const candidate = await loadBiasReport(candidatePath);

    const comparison = compareBiasRuns(baseline, candidate, {
      baselinePath,
      candidatePath,
      alpha: parseAlpha(args.alpha as string | undefined),
      topChanges: parseTop(args.top as string | undefined),
    });

    if (!comparison.comparable) {
      const message = [
        "Die beiden Läufe sind nicht vergleichbar — sie beantworten nicht dieselbe Frage mit demselben Messaufbau:",
        ...comparison.comparabilityIssues.map((issue) => `  - ${issue}`),
      ].join("\n");

      if (!args["allow-incomparable"]) {
        exitWithError(
          `${message}\nMit --allow-incomparable wird der Vergleich trotzdem geschrieben (explizit als comparable: false markiert).`
        );
      }
      consola.warn(message);
    }

    const markdown = formatBiasComparisonMarkdown(comparison);
    const json = `${JSON.stringify(comparison, null, 2)}\n`;

    if (outDir === undefined) {
      process.stdout.write(output === "json" ? json : markdown);
      return;
    }

    const targetDir = resolve(outDir);
    await mkdir(targetDir, { recursive: true });
    if (output === "md" || output === "all") {
      const path = join(targetDir, "euconform.bias-comparison.md");
      await writeFile(path, markdown);
      consola.success(`Written: ${path}`);
    }
    if (output === "json" || output === "all") {
      const path = join(targetDir, "euconform.bias-comparison.json");
      await writeFile(path, json);
      consola.success(`Written: ${path}`);
    }
  },
});
