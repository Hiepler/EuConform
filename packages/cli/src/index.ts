#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import biasCommand from "./commands/bias";
import compareCommand from "./commands/compare";
import importCommand from "./commands/import";
import scanCommand from "./commands/scan";
import validateCommand from "./commands/validate";
import verifyCommand from "./commands/verify";

const main = defineCommand({
  meta: {
    name: "euconform",
    description: "EU AI Act compliance scanner for local AI projects",
  },
  subCommands: {
    scan: scanCommand,
    validate: validateCommand,
    verify: verifyCommand,
    bias: biasCommand,
    compare: compareCommand,
    import: importCommand,
  },
});

runMain(main);
