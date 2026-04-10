import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { ScanScope } from "@euconform/core/evidence";
import { generateScanOutput } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import { defineCommand } from "citty";
import consola from "consola";
import { type BaseArtifactName, type CiMode, writeCiArtifacts } from "../output/ci";
import { printTerminalSummary } from "../output/terminal";
import { writeOutputFiles } from "../output/writer";
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

async function validateAndParseArgs(args: Record<string, unknown>): Promise<ValidatedArgs> {
  const targetPath = resolve(args.path as string);

  try {
    const info = await stat(targetPath);
    if (!info.isDirectory()) {
      consola.error(`Not a directory: ${targetPath}`);
      process.exit(1);
    }
  } catch {
    consola.error(`Path does not exist: ${targetPath}`);
    process.exit(1);
  }

  const format = (args.format as string) ?? "all";
  const scope = ((args.scope as string) ?? "production") as ScanScope;
  const failOn = ((args["fail-on"] as string) ?? "none") as FailOnLevel;
  const ciMode = ((args.ci as string) ?? "off") as CiMode;

  if (!VALID_FORMATS.has(format)) {
    consola.error(`Invalid format: ${format}. Use one of: json, md, all.`);
    process.exit(1);
  }
  if (!VALID_SCOPES.has(scope)) {
    consola.error(`Invalid scope: ${scope}. Use one of: production, all.`);
    process.exit(1);
  }
  if (!FAIL_ON_LEVELS.includes(failOn)) {
    consola.error(`Invalid fail-on level: ${failOn}. Use one of: ${FAIL_ON_LEVELS.join(", ")}.`);
    process.exit(1);
  }
  if (!VALID_CI_MODES.has(ciMode)) {
    consola.error(`Invalid ci mode: ${ciMode}. Use one of: off, github.`);
    process.exit(1);
  }

  if (args.verbose) {
    consola.level = 4;
  }

  const rawExclude = args["exclude-glob"];
  const excludeGlobs = rawExclude
    ? Array.isArray(rawExclude)
      ? (rawExclude as string[])
      : [rawExclude as string]
    : undefined;

  return {
    targetPath,
    outputDir: args.output ? resolve(args.output as string) : resolve(targetPath, ".euconform"),
    format,
    scope,
    failOn,
    ciMode,
    excludeGlobs,
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
    verbose: {
      type: "boolean",
      default: false,
      description: "Enable verbose logging",
    },
  },
  async run({ args }) {
    const { targetPath, outputDir, format, scope, failOn, ciMode, excludeGlobs } =
      await validateAndParseArgs(args);

    consola.start(`Scanning ${targetPath} (${scope} scope)...`);

    const scanResult = await scanRepository({ targetPath, scope, excludeGlobs });
    consola.info(
      `Found ${scanResult.signals.length} signals across ${scanResult.meta.filesScanned} files`
    );

    const output = generateScanOutput(scanResult);

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

    if (shouldFailOnGaps(output.report.gaps, failOn)) {
      consola.error(`Scan failed CI threshold: found gap(s) at or above "${failOn}".`);
      process.exit(1);
    }
  },
});
