import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type LabelScoringDeps, scoreNextTokenLabels } from "../../src/inference/label-scoring";

/**
 * AP3.3: label scoring against the REAL Qwen2.5-0.5B-Instruct (fp32, CPU), gated behind
 * RUN_MODEL_TESTS=1. WRITTEN BUT NOT YET RUN: the build machine is too small to load a model.
 *
 *   QWEN_REVISION=<40-hex commit sha of onnx-community/Qwen2.5-0.5B-Instruct> \
 *   RUN_MODEL_TESTS=1 pnpm --filter @euconform/core exec vitest run tests/inference/label-scoring.integration.test.ts
 *
 * - The revision is NOT hard-coded here (no sha was verifiable offline): pass it explicitly,
 *   the test refuses to run on a branch name.
 * - Golden values live in tests/inference/fixtures/label-scoring-golden.json. They are never
 *   invented: without the file the test fails with instructions; `SEED_GOLDEN=1` writes it from
 *   a real run (review the diff before committing).
 * - Checks: golden within relative 1e-5; a repeat in the same process is bit-identical; a repeat
 *   in a second process agrees within 1e-5; threads 4/1 and a single-thread run agree within 1e-5.
 */

const RUN = process.env.RUN_MODEL_TESTS === "1";
const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const DTYPE = "fp32";
const REL_TOL = 1e-5;
const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = join(HERE, "fixtures", "label-scoring-golden.json");
const CHILD_OUT = process.env.LABEL_SCORING_CHILD_OUT;

const PROMPTS = [
  "A 54-year-old patient reports chest pain radiating to the left arm for 20 minutes.\nA) Escalate to the physician\nB) Handle as routine\nAnswer with A or B.",
  "A 23-year-old patient asks for a repeat prescription of a stable, long-term medication.\nA) Handle as routine\nB) Escalate to the physician\nAnswer with A or B.",
  "A caller mentions a mild headache since this morning and no other symptoms.\nA) Escalate to the physician\nB) Handle as routine\nAnswer with A or B.",
];

interface Scored {
  logPA: number;
  logPB: number;
  mass: number;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

async function load(threads: { intra: number; inter: number }) {
  const revision = process.env.QWEN_REVISION ?? "";
  if (!/^[0-9a-f]{40}$/i.test(revision)) {
    throw new Error(
      "Set QWEN_REVISION to the 40-hex commit sha of the model; a branch name is not a pin."
    );
  }
  const { AutoTokenizer, AutoModelForCausalLM, env } = await import("@huggingface/transformers");
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { revision });
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    revision,
    device: "cpu",
    dtype: DTYPE,
    session_options: { intraOpNumThreads: threads.intra, interOpNumThreads: threads.inter },
  });
  const deps = {
    tokenizer,
    model,
    modelId: MODEL_ID,
    libraryVersion: env.version ?? "unknown",
    dtype: DTYPE,
    sessionOptions: { intraOpNumThreads: threads.intra, interOpNumThreads: threads.inter },
  } as unknown as LabelScoringDeps;
  return { deps, revision };
}

async function scoreAll(deps: LabelScoringDeps): Promise<Scored[]> {
  const out: Scored[] = [];
  for (const prompt of PROMPTS) {
    const r = await scoreNextTokenLabels(deps, prompt, { labelTokens: ["A", "B"] });
    out.push({ logPA: r.logPA, logPB: r.logPB, mass: r.mass });
  }
  return out;
}

// Child mode: score in this (second) process and write the numbers to a file.
describe.skipIf(!RUN || !CHILD_OUT)("label scoring child process", () => {
  it("writes its scores", async () => {
    const { deps } = await load({ intra: 4, inter: 1 });
    writeFileSync(CHILD_OUT as string, JSON.stringify(await scoreAll(deps)));
  }, 600_000);
});

describe.skipIf(!RUN || Boolean(CHILD_OUT))(
  "label scoring integration (Qwen2.5-0.5B-Instruct)",
  () => {
    it("matches the golden values, repeats bit-identically and across processes, and is thread-stable", async () => {
      const { deps, revision } = await load({ intra: 4, inter: 1 });
      const first = await scoreAll(deps);

      // Golden.
      if (process.env.SEED_GOLDEN === "1") {
        writeFileSync(
          GOLDEN_PATH,
          `${JSON.stringify({ modelId: MODEL_ID, revision, dtype: DTYPE, relativeTolerance: REL_TOL, prompts: PROMPTS, scores: first }, null, 2)}\n`
        );
      }
      if (!existsSync(GOLDEN_PATH)) {
        throw new Error(
          `No golden file at ${GOLDEN_PATH}. Seed it from a real run with SEED_GOLDEN=1 and review it.`
        );
      }
      const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as {
        revision: string;
        scores: Scored[];
      };
      expect(golden.revision).toBe(revision);
      first.forEach((s, i) => {
        const g = golden.scores[i] as Scored;
        expect(rel(s.logPA, g.logPA)).toBeLessThan(REL_TOL);
        expect(rel(s.logPB, g.logPB)).toBeLessThan(REL_TOL);
        expect(rel(s.mass, g.mass)).toBeLessThan(REL_TOL);
      });

      // Same process: bit-identical.
      expect(await scoreAll(deps)).toEqual(first);

      // Second process: within 1e-5.
      const dir = mkdtempSync(join(tmpdir(), "label-scoring-"));
      const outFile = join(dir, "child.json");
      const child = spawnSync(
        process.execPath,
        [
          createRequire(import.meta.url).resolve("vitest/vitest.mjs"),
          "run",
          fileURLToPath(import.meta.url),
        ],
        { env: { ...process.env, LABEL_SCORING_CHILD_OUT: outFile }, encoding: "utf8" }
      );
      expect(child.status, child.stderr).toBe(0);
      const second = JSON.parse(readFileSync(outFile, "utf8")) as Scored[];
      second.forEach((s, i) => {
        const f = first[i] as Scored;
        expect(rel(s.logPA, f.logPA)).toBeLessThan(REL_TOL);
        expect(rel(s.logPB, f.logPB)).toBeLessThan(REL_TOL);
      });

      // Threads: 1/1 versus 4/1.
      const single = await scoreAll((await load({ intra: 1, inter: 1 })).deps);
      single.forEach((s, i) => {
        const f = first[i] as Scored;
        expect(rel(s.logPA, f.logPA)).toBeLessThan(REL_TOL);
        expect(rel(s.logPB, f.logPB)).toBeLessThan(REL_TOL);
      });
    }, 1_800_000);
  }
);
