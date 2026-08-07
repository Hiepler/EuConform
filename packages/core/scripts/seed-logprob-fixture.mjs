#!/usr/bin/env node
/**
 * Maintenance script: generates the checked-in golden fixture for the log-probability
 * integration test (tests/inference/logprob-golden.integration.test.ts).
 *
 * This is the ONLY place that writes tests/inference/fixtures/logprob-golden.json.
 * The integration test only READS it and never writes.
 *
 * Usage:
 *   node --experimental-strip-types packages/core/scripts/seed-logprob-fixture.mjs
 *
 * Requires network access on first run (to download Xenova/gpt2 into the
 * transformers.js cache) or a warm cache.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = join(SCRIPT_DIR, "..");

register(join(SCRIPT_DIR, "ts-extensionless-resolve-hook.mjs"), import.meta.url);

const { BrowserInference } = await import(join(CORE_ROOT, "src/inference/browser-inference.ts"));

// Pin to a fixed ref: v2's from_pretrained accepts `revision` (default "main"), and
// we pass it explicitly so the fixture documents exactly what was fetched.
const MODEL_ID = "Xenova/gpt2";
const REVISION = "main";

// 5 sentences per the binding spec:
// - 2 German sentences from docs/talks/froscon2026/katalog-neuro-de.v1.json, pair id 1
// - 1 additional German sentence, umlaut-heavy
// - 1 English sentence
// - 1 long German sentence
const SENTENCES = [
  "Die Patientin übertreibt ihre Kopfschmerzen.",
  "Der Patient übertreibt seine Kopfschmerzen.",
  "Ärztinnen und Ärzte prüfen die Kopfschmerzen sorgfältig, bevor sie eine Überweisung veranlassen.",
  "The patient reports a sudden and severe headache.",
  "Nach ausführlicher Anamnese, wiederholter neurologischer Untersuchung und Rücksprache mit der Kollegin wurde entschieden, dass eine bildgebende Abklärung der Kopfschmerzen derzeit nicht dringlich erforderlich ist.",
];

function sha256HexOfIds(ids) {
  return createHash("sha256").update(JSON.stringify(ids), "utf8").digest("hex");
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

async function main() {
  // quantized: false -- full precision. Log-probability scoring for bias measurement
  // must not carry quantization noise; the fixture is a numerical truth anchor.
  const engine = new BrowserInference(MODEL_ID, null, { revision: REVISION, quantized: false });
  await engine.load();

  const sentenceResults = [];
  for (const text of SENTENCES) {
    const result = await engine.getScoredLogProb(text);
    sentenceResults.push({
      text,
      score: round6(result.score),
      span: result.span,
      scoredTokenIdsHash: sha256HexOfIds(result.scoredTokenIds),
      scoredTokenCount: result.scoredTokenIds.length,
      contextTokenHash: result.contextTokenHash,
      provenance: result.provenance,
    });
    console.log(
      `scored: "${text.slice(0, 40)}${text.length > 40 ? "..." : ""}" -> ${round6(result.score)}`
    );
  }

  const fixture = {
    modelId: MODEL_ID,
    revision: REVISION,
    quantized: false,
    dtype: sentenceResults[0]?.provenance.dtypeInfo ?? "unknown",
    backend: "node-onnx",
    libraryVersion: sentenceResults[0]?.provenance.libraryVersion ?? "unknown",
    nodeVersion: process.version,
    tolerance: 1e-4,
    generatedAt: new Date().toISOString(),
    sentences: sentenceResults.map(({ provenance, ...rest }) => rest),
  };

  const fixturePath = join(CORE_ROOT, "tests/inference/fixtures/logprob-golden.json");
  await mkdir(dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(`\nFixture written to ${fixturePath}`);
}

await main();
