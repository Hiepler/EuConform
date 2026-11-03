import { defineCommand } from "citty";
import baselineCommand from "../paired-eval/baseline-command";
import generateCommand from "../paired-eval/generate-command";
import runCommand from "../paired-eval/run-command";

export default defineCommand({
  meta: {
    name: "paired-eval",
    description: "Paired decision eval: generate prompt sets, score them, run baselines",
  },
  subCommands: {
    generate: generateCommand,
    run: runCommand,
    baseline: baselineCommand,
  },
});
