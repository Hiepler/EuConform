import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { ScanOutput, ScanScope } from "@euconform/core/evidence";
import { generateScanOutput } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import { defineCommand } from "citty";
import consola from "consola";
import { type BaseArtifactName, type CiMode, writeCiArtifacts } from "../output/ci";
import { printTerminalSummary } from "../output/terminal";
import { writeBundleManifest, writeOutputFiles, writeZipBundle } from "../output/writer";
import { exitWithError } from "../utils/exit";
import { type FailOnLevel, shouldFailOnGaps } from "../utils/gap-priority";

const VALID_FORMATS = new Set(["json", "md", "all"]);
const VALID_SCOPES = new Set<ScanScope>(["production", "all"]);
const FAIL_ON_LEVELS = ["none", "critical", "high", "medium", "low"] as const;
const VALID_CI_MODES = new Set<CiMode>(["off", "github"]);

interface ValidatedArgs {
  targetPath: string;
  outputDir: string;
  format: string;
  scope: ScanScope;
  failOn: FailOnLevel;
  ciMode: CiMode;
  excludeGlobs: string[] | undefined;
}

async function assertDirectoryExists(targetPath: string): Promise<void> {
  try {
    const info = await stat(targetPath);
    if (!info.isDirectory()) {
      exitWithError(`Not a directory: ${targetPath}`);
    }
  } catch {
    exitWithError(`Path does not exist: ${targetPath}`);
  }
}

function validateEnumArgs(args: {
  format: string;
  scope: ScanScope;
  failOn: FailOnLevel;
  ciMode: CiMode;
  zip: unknown;
}): void {
  if (!VALID_FORMATS.has(args.format)) {
    exitWithError(`Invalid format: ${args.format}. Use one of: json, md, all.`);
  }
  if (!VALID_SCOPES.has(args.scope)) {
    exitWithError(`Invalid scope: ${args.scope}. Use one of: production, all.`);
  }
  if (!FAIL_ON_LEVELS.includes(args.failOn)) {
    exitWithError(
      `Invalid fail-on level: ${args.failOn}. Use one of: ${FAIL_ON_LEVELS.join(", ")}.`
    );
  }
  if (!VALID_CI_MODES.has(args.ciMode)) {
    exitWithError(`Invalid ci mode: ${args.ciMode}. Use one of: off, github.`);
  }
  if (args.zip && args.format === "md") {
    exitWithError('Cannot create euconform.bundle.zip when format is "md" only.');
  }
}

function parseExcludeGlobs(raw: unknown): string[] | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? (raw as string[]) : [raw as string];
}

async function validateAndParseArgs(args: Record<string, unknown>): Promise<ValidatedArgs> {
  const targetPath = resolve(args.path as string);
  await assertDirectoryExists(targetPath);

  const format = (args.format as string) ?? "all";
  const scope = ((args.scope as string) ?? "production") as ScanScope;
  const failOn = ((args["fail-on"] as string) ?? "none") as FailOnLevel;
  const ciMode = ((args.ci as string) ?? "off") as CiMode;

  validateEnumArgs({ format, scope, failOn, ciMode, zip: args.zip });

  if (args.verbose) {
    consola.level = 4;
  }

  return {
    targetPath,
    outputDir: args.output ? resolve(args.output as string) : resolve(targetPath, ".euconform"),
    format,
    scope,
    failOn,
    ciMode,
    excludeGlobs: parseExcludeGlobs(args["exclude-glob"]),
  };
}

function buildOutputFileNames(format: string): BaseArtifactName[] {
  const names: BaseArtifactName[] = [];
  if (format === "json" || format === "all") {
    names.push("euconform.report.json", "euconform.aibom.json");
  }
  if (format === "md" || format === "all") {
    names.push("euconform.summary.md");
  }
  return names;
}

async function runBiasAndInject(
  output: ScanOutput,
  model: string,
  lang: "en" | "de",
  url: string
): Promise<void> {
  const { runBiasTest } = await import("../bias/run-bias-test");
  const { formatBiasSeverity } = await import("../bias/severity");
  const biasResult = await runBiasTest({ model, lang, url });

  const severity = formatBiasSeverity(biasResult.score);

  output.report.complianceSignals.biasTesting = {
    status: "present",
    confidence: biasResult.method === "logprobs_exact" ? "high" : "medium",
    evidence: [
      {
        file: "bias-evaluation",
        snippet: `CrowS-Pairs bias evaluation on model '${model}'. Score: ${biasResult.score.toFixed(4)} (${severity}). Method: ${biasResult.method}. Pairs analyzed: ${biasResult.pairsAnalyzed}.`,
      },
    ],
  };

  output.aibom.complianceCapabilities.biasEvaluation = true;
}

export default defineCommand({
  meta: {
    name: "scan",
    description: "Scan a project directory for EU AI Act compliance evidence",
  },
  args: {
    path: {
      type: "positional",
      required: true,
      description: "Path to project directory",
    },
    output: {
      type: "string",
      description: "Output directory (default: <path>/.euconform)",
    },
    format: {
      type: "string",
      default: "all",
      description: 'Output format: "json", "md", or "all"',
    },
    scope: {
      type: "string",
      default: "production",
      description: 'Scan scope: "production" or "all"',
    },
    "fail-on": {
      type: "string",
      default: "none",
      description:
        'Exit non-zero when a gap is at or above: "none", "critical", "high", "medium", "low"',
    },
    ci: {
      type: "string",
      default: "off",
      description: 'CI output mode: "off" or "github"',
    },
    "exclude-glob": {
      type: "string",
      description: "Additional exclude patterns (repeatable)",
    },
    zip: {
      type: "boolean",
      default: false,
      description: "Create a ZIP archive of all scan artifacts",
    },
    verbose: {
      type: "boolean",
      default: false,
      description: "Enable verbose logging",
    },
    bias: {
      type: "boolean",
      default: false,
      description: "Run CrowS-Pairs bias test after scan (requires --model)",
    },
    model: {
      type: "string",
      description: "Ollama model for bias testing (required with --bias)",
    },
    "bias-lang": {
      type: "string",
      default: "de",
      description: 'Bias test dataset language: "en" or "de"',
    },
    "bias-url": {
      type: "string",
      default: "http://localhost:11434",
      description: "Ollama base URL for bias testing",
    },
  },
  async run({ args }) {
    const { targetPath, outputDir, format, scope, failOn, ciMode, excludeGlobs } =
      await validateAndParseArgs(args);

    // Validate bias flags
    if (args.bias && !args.model) {
      exitWithError(
        "Bias testing requires --model flag. Example: euconform scan ./project --bias --model llama3.2"
      );
    }
    const biasLang = (args["bias-lang"] as string) ?? "de";
    if (args.bias && !["en", "de"].includes(biasLang)) {
      exitWithError(`Invalid bias language: ${biasLang}. Use one of: en, de.`);
    }

    consola.start(`Scanning ${targetPath} (${scope} scope)...`);

    const scanResult = await scanRepository({ targetPath, scope, excludeGlobs });
    consola.info(
      `Found ${scanResult.signals.length} signals across ${scanResult.meta.filesScanned} files`
    );

    const output = generateScanOutput(scanResult);

    // Run bias test if requested
    if (args.bias) {
      await runBiasAndInject(
        output,
        args.model as string,
        biasLang as "en" | "de",
        args["bias-url"] as string
      );
    }

    await writeOutputFiles(output, outputDir, format);
    const ciArtifacts = await writeCiArtifacts(
      output,
      outputDir,
      failOn,
      ciMode,
      scope,
      buildOutputFileNames(format)
    );
    printTerminalSummary(output, outputDir);

    if (ciArtifacts) {
      consola.info(
        `CI artifacts ready: ${resolve(ciArtifacts.reportPath)} and ${resolve(ciArtifacts.summaryPath)}`
      );
    }

    await writeBundleManifest(outputDir, {
      tool: output.report.tool,
      target: {
        name: output.report.target.name,
        rootPath: output.report.target.rootPath,
      },
      generatedAt: output.report.generatedAt,
    });

    if (args.zip) {
      await writeZipBundle(outputDir);
    }

    if (shouldFailOnGaps(output.report.gaps, failOn)) {
      consola.error(`Scan failed CI threshold: found gap(s) at or above "${failOn}".`);
      process.exit(1);
    }
  },
});
