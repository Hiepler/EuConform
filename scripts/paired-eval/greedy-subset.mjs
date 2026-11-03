#!/usr/bin/env node
// Greedy subset of the pilot (pre-registration, section 3): the `main` prompts with variant base or
// decisive, option order ER and letter order AB, restricted to the item ids of the `word` arm.
//
//   node scripts/paired-eval/greedy-subset.mjs <main items.jsonl> <word items.jsonl> <out items.jsonl>

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [mainPath, wordPath, outPath] = process.argv.slice(2);
if (!outPath) {
  console.error("usage: greedy-subset.mjs <main items.jsonl> <word items.jsonl> <out items.jsonl>");
  process.exit(1);
}
const lines = (path) =>
  readFileSync(path, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "");
const wordIds = new Set(lines(wordPath).map((line) => JSON.parse(line).item_id));
const keep = lines(mainPath).filter((line) => {
  const r = JSON.parse(line);
  return (
    r.arm === "main" &&
    wordIds.has(r.item_id) &&
    (r.variant === "base" || r.variant === "decisive") &&
    r.option_order === "ER" &&
    r.letter_order === "AB"
  );
});
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${keep.join("\n")}\n`);
console.log(`${keep.length} greedy prompts -> ${outPath}`);
