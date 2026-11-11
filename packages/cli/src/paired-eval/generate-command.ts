import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type Arm, type Split, generate } from "@euconform/core/paired-eval";
import { defineCommand } from "citty";
import consola from "consola";
import { exitWithError } from "../utils/exit";

const SPLITS = new Set<Split>(["dev", "pilot", "test", "test2"]);
const ARMS = new Set<Arm>(["main", "decomp", "word"]);

/** HEAD of the working tree, suffixed with "-dirty" when tracked files have local changes. */
function gitSha(): string | null {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
      encoding: "utf-8",
    }).trim();
    return sha ? `${sha}${dirty ? "-dirty" : ""}` : null;
  } catch {
    return null;
  }
}

function parsePositiveInt(raw: string, flag: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    exitWithError(`Invalid ${flag}: ${raw}. Expected a positive integer.`);
  }
  return value;
}

export default defineCommand({
  meta: {
    name: "generate",
    description: "Generate a paired-eval prompt set (items.jsonl + manifest.json)",
  },
  args: {
    split: { type: "string", required: true, description: "dev | pilot | test | test2" },
    seed: { type: "string", required: true, description: "Seed string" },
    "per-family": {
      type: "string",
      required: true,
      description: "Base cases per family: 12 (pilot layout) or 24 | 48 | 72",
    },
    arm: { type: "string", default: "main", description: "main | decomp | word" },
    "robust-n": {
      type: "string",
      description: "Base cases in the decomp/word subset (default 200, capped at the split size)",
    },
    out: { type: "string", required: true, description: "Output directory" },
  },
  async run({ args }) {
    const split = args.split as Split;
    if (!SPLITS.has(split)) exitWithError(`Invalid --split: ${args.split}.`);
    const arm = args.arm as Arm;
    if (!ARMS.has(arm)) exitWithError(`Invalid --arm: ${args.arm}.`);
    const perFamily = parsePositiveInt(args["per-family"], "--per-family");
    const robustN = args["robust-n"] ? parsePositiveInt(args["robust-n"], "--robust-n") : undefined;

    let result: ReturnType<typeof generate>;
    try {
      result = generate({
        split,
        seed: args.seed,
        perFamily,
        arm,
        robustN,
        generatorVersion: gitSha(),
      });
    } catch (error) {
      exitWithError((error as Error).message);
    }

    const outDir = resolve(args.out);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "items.jsonl"), result.jsonl, "utf-8");
    await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(result.manifest, null, 2)}\n`);
    if (
      result.manifest.robust_n !== null &&
      result.manifest.robust_n !== result.manifest.robust_n_requested
    ) {
      consola.warn(
        `Robustness subset capped at ${result.manifest.robust_n} base cases (requested ${result.manifest.robust_n_requested}).`
      );
    }
    consola.success(
      `${result.manifest.count} prompts -> ${join(outDir, "items.jsonl")} (sha256 ${result.manifest.items_sha256})`
    );
  },
});
