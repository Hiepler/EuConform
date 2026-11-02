import { defineCommand } from "citty";
import runCommand from "../paired-eval/run-command";

export default defineCommand({
  meta: {
    name: "paired-eval",
    description: "Paired decision eval: generate prompt sets, score them, run baselines",
  },
  subCommands: {
    run: runCommand,
  },
});
