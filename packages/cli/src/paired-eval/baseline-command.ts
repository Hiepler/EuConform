import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BASELINES, isBaselineName, scoreBaseline } from "@euconform/core/paired-eval";
import { defineCommand } from "citty";
import consola from "consola";
import { exitWithError } from "../utils/exit";
import { parseItemsJsonl } from "./run-engine";

export default defineCommand({
  meta: {
    name: "baseline",
    description: "Score a paired-eval prompt set with an LLM-free baseline (scores.jsonl)",
  },
  args: {
    name: { type: "string", required: true, description: BASELINES.join(" | ") },
    set: { type: "string", required: true, description: "items.jsonl from paired-eval generate" },
    out: { type: "string", required: true, description: "Output directory" },
  },
  async run({ args }) {
    if (!isBaselineName(args.name)) {
      exitWithError(`Invalid --name: ${args.name}. Use one of: ${BASELINES.join(", ")}.`);
    }
    let rows: ReturnType<typeof scoreBaseline>;
    try {
      rows = scoreBaseline(args.name, parseItemsJsonl(await readFile(resolve(args.set), "utf-8")));
    } catch (error) {
      exitWithError((error as Error).message);
    }
    const outDir = resolve(args.out);
    await mkdir(outDir, { recursive: true });
    const target = join(outDir, "scores.jsonl");
    await writeFile(target, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf-8");
    consola.success(`${rows.length} rows (baseline:${args.name}) -> ${target}`);
  },
});
