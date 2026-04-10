#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import scanCommand from "./commands/scan";

const main = defineCommand({
  meta: {
    name: "euconform",
    description: "EU AI Act compliance scanner for local AI projects",
  },
  subCommands: {
    scan: scanCommand,
  },
});

runMain(main);
