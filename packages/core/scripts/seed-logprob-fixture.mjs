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

const MODEL_ID = "Xenova/gpt2";
const HF_SHA_PATTERN = /^[0-9a-f]{40}$/i;

/**
 * Resolve the CURRENT commit SHA of the model repo on the Hugging Face Hub.
 *
 * "main" is a mutable branch pointer, not a pin: a future push to Xenova/gpt2 would
 * silently move it and invalidate this fixture without anyone noticing. This is a
 * tiny metadata fetch (not a model download), so we resolve it eagerly at seed time
 * and pass the immutable SHA to `from_pretrained` as the `revision`. This script is
 * online-by-nature (it downloads model weights), so a failure here aborts loudly
 * rather than silently falling back to "main".
 *
 * Observed in this environment: a bare `fetch` sometimes returns a stale/cached
 * schema-shaped stub instead of the real API response. Sending `Cache-Control:
 * no-cache` reliably returns the real payload; we still validate the `sha` field's
 * shape before trusting it, and retry a few times before giving up.
 */
async function resolveModelRevisionSha(modelId, { attempts = 3 } = {}) {
  const url = `https://huggingface.co/api/models/${modelId}`;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "Cache-Control": "no-cache", Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const body = await response.json();
      const sha = body?.sha;
      if (typeof sha !== "string" || !HF_SHA_PATTERN.test(sha)) {
        throw new Error(
          `response did not contain a valid 40-char commit sha (got: ${JSON.stringify(sha)}); this looks like a malformed or stubbed API response, not the real Hub metadata`
        );
      }
      return sha;
    } catch (err) {
      lastError = err;
      console.warn(
        `[seed-logprob-fixture] revision resolution attempt ${attempt}/${attempts} failed: ${err.message}`
      );
    }
  }

  throw new Error(
    `Could not resolve an immutable commit sha for "${modelId}" from the Hugging Face Hub API ` +
      `after ${attempts} attempts. Aborting: seeding against the mutable "main" ref would silently ` +
      `invalidate this fixture on the next upstream push. Last error: ${lastError?.message}`
  );
}

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
  const revision = await resolveModelRevisionSha(MODEL_ID);
  console.log(`resolved revision (immutable commit sha): ${revision}`);

  // quantized: false -- full precision. Log-probability scoring for bias measurement
  // must not carry quantization noise; the fixture is a numerical truth anchor.
  const engine = new BrowserInference(MODEL_ID, null, { revision, quantized: false });
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
    revision,
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
