import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PromptItem } from "@euconform/core/paired-eval";
import { describe, expect, it } from "vitest";
import {
  type RunIdentity,
  parseItemsJsonl,
  runScoring,
  validateRunMeta,
} from "../src/paired-eval/run-engine";
import type { PromptScorer } from "../src/paired-eval/run-scorers";

const identity: RunIdentity = {
  machine: {
    cpu: "Fake CPU",
    ram_bytes: 1024,
    os: "Linux 1.0",
    arch: "x64",
    node_version: "v22.0.0",
  },
  versions: { transformers_js: "4.2.0", onnxruntime_node: "1.24.3" },
  threads: { intra_op: 4, inter_op: 1 },
  model: { id: "fake/model", revision: "a".repeat(40), dtype: "fp32" },
  mode: "logprob",
  max_new_tokens: null,
  input: { name: "items.jsonl", sha256: "b".repeat(64), n_items: 25, limit: null },
  label_tokens: { tokens: ["A", "B"], source: "config", config_sha256: "c".repeat(64) },
  chat_template_kwargs: {},
};

function makeItems(n: number): PromptItem[] {
  return Array.from({ length: n }, (_, i) => ({
    prompt_id: `p${String(i).padStart(3, "0")}`,
    prompt: `case ${i}`,
    arm: "main",
    option_order: i % 2 === 0 ? "ER" : "RE",
    letter_order: "AB",
    reference_content: "escalate",
  })) as unknown as PromptItem[];
}

/** Deterministic fake: the numbers depend on the prompt text only. */
function fakeScorer(failOn?: string): PromptScorer & { calls: string[] } {
  const calls: string[] = [];
  return {
    mode: "logprob",
    calls,
    async score(item) {
      if (item.prompt_id === failOn) throw new Error("model exploded");
      calls.push(item.prompt_id);
      const n = Number(item.prompt_id.slice(1));
      return {
        logits_dtype: "float32",
        thinking_mode: "default",
        template_sha256: "t".repeat(64),
        rendered_prompt_sha256: `r${n}`.padEnd(64, "0"),
        n_tokens: 10 + n,
        label_tokens: ["A", "B"],
        label_token_ids: [65, 66],
        l_a: -0.5 - n / 100,
        l_b: -1.5,
        mass: 0.9,
        decision_content: "escalate",
      };
    },
  };
}

const tmp = () => mkdtemp(join(tmpdir(), "paired-eval-run-"));

async function rows(dir: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(join(dir, "scores.jsonl"), "utf-8");
  return text
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

const withoutLatency = (rs: Record<string, unknown>[]) =>
  rs.map(({ latency_ms: _l, ...rest }) => rest);

let tick = 0;
const clock = () => {
  tick += 7;
  return tick;
};

describe("runScoring", () => {
  it("AP4.1: abort after 10 prompts plus --resume equals an uninterrupted run (latency aside)", async () => {
    const items = makeItems(25);
    const full = await tmp();
    await runScoring({ items, outDir: full, resume: false, scorer: fakeScorer(), identity, clock });

    const split = await tmp();
    await expect(
      runScoring({
        items,
        outDir: split,
        resume: false,
        scorer: fakeScorer("p010"),
        identity,
        clock,
      })
    ).rejects.toThrow("model exploded");
    expect(await rows(split)).toHaveLength(10);
    const aborted = JSON.parse(await readFile(join(split, "run.json"), "utf-8"));
    expect(aborted.status).toBe("aborted");
    expect(aborted.errors).toBe(1);
    expect(aborted.error_message).toContain("p010");

    const resumedScorer = fakeScorer();
    const summary = await runScoring({
      items,
      outDir: split,
      resume: true,
      scorer: resumedScorer,
      identity,
      clock,
    });
    // Only the 15 missing prompts are scored again, none of the first 10.
    expect(resumedScorer.calls).toEqual(items.slice(10).map((i) => i.prompt_id));
    expect(summary.skipped).toBe(10);
    expect(withoutLatency(await rows(split))).toEqual(withoutLatency(await rows(full)));
    const done = JSON.parse(await readFile(join(split, "run.json"), "utf-8"));
    expect(done.status).toBe("complete");
    expect(done.n_scored).toBe(25);
    expect(done.resumed_at).toHaveLength(1);
  });

  it("is fail-closed: an error stops the run and no later prompt is scored", async () => {
    const dir = await tmp();
    const scorer = fakeScorer("p003");
    await expect(
      runScoring({ items: makeItems(8), outDir: dir, resume: false, scorer, identity, clock })
    ).rejects.toThrow("model exploded");
    expect(scorer.calls).toEqual(["p000", "p001", "p002"]);
  });

  it("refuses to overwrite an existing run without --resume", async () => {
    const dir = await tmp();
    const items = makeItems(3);
    await runScoring({ items, outDir: dir, resume: false, scorer: fakeScorer(), identity, clock });
    await expect(
      runScoring({ items, outDir: dir, resume: false, scorer: fakeScorer(), identity, clock })
    ).rejects.toThrow("already holds a run");
  });

  it("refuses to resume with a different identity (model revision)", async () => {
    const dir = await tmp();
    const items = makeItems(3);
    await expect(
      runScoring({ items, outDir: dir, resume: false, scorer: fakeScorer("p001"), identity, clock })
    ).rejects.toThrow();
    const other: RunIdentity = {
      ...identity,
      model: { ...identity.model, revision: "d".repeat(40) },
    };
    await expect(
      runScoring({ items, outDir: dir, resume: true, scorer: fakeScorer(), identity: other, clock })
    ).rejects.toThrow('"model" differs');
  });

  it("cuts off a torn last line when resuming", async () => {
    const dir = await tmp();
    const items = makeItems(4);
    await expect(
      runScoring({ items, outDir: dir, resume: false, scorer: fakeScorer("p002"), identity, clock })
    ).rejects.toThrow();
    const path = join(dir, "scores.jsonl");
    await writeFile(path, `${await readFile(path, "utf-8")}{"prompt_id":"p002","mo`);
    await runScoring({ items, outDir: dir, resume: true, scorer: fakeScorer(), identity, clock });
    expect(await rows(dir)).toHaveLength(4);
  });

  it("rejects duplicate prompt ids and foreign rows", async () => {
    const dir = await tmp();
    const items = makeItems(2);
    await expect(
      runScoring({
        items: [items[0], items[0]] as PromptItem[],
        outDir: dir,
        resume: false,
        scorer: fakeScorer(),
        identity,
      })
    ).rejects.toThrow("twice");
    const dir2 = await tmp();
    await expect(
      runScoring({
        items,
        outDir: dir2,
        resume: false,
        scorer: fakeScorer("p001"),
        identity,
        clock,
      })
    ).rejects.toThrow();
    await expect(
      runScoring({
        items: makeItems(2).map((i) => ({ ...i, prompt_id: `x${i.prompt_id}` })),
        outDir: dir2,
        resume: true,
        scorer: fakeScorer(),
        identity,
        clock,
      })
    ).rejects.toThrow("not in the input set");
  });

  it("writes every ScoreRow key in a fixed order", async () => {
    const dir = await tmp();
    await runScoring({
      items: makeItems(2),
      outDir: dir,
      resume: false,
      scorer: fakeScorer(),
      identity,
      clock,
    });
    const [a, b] = await rows(dir);
    expect(Object.keys(a as object)).toEqual(Object.keys(b as object));
    expect(Object.keys(a as object)).toContain("l_escalate");
    expect((a as { l_escalate: unknown }).l_escalate).toBeNull();
    expect((a as { mode: unknown }).mode).toBe("logprob");
  });
});

describe("run.json schema (AP4.2)", () => {
  it("a finished run validates and carries the provenance", async () => {
    const dir = await tmp();
    await runScoring({
      items: makeItems(3),
      outDir: dir,
      resume: false,
      scorer: fakeScorer(),
      identity,
      clock,
    });
    const meta = JSON.parse(await readFile(join(dir, "run.json"), "utf-8"));
    expect(validateRunMeta(meta)).toEqual([]);
    expect(meta.schema).toBe("euconform.paired-eval.run/v1");
    expect(meta.model).toEqual(identity.model);
    expect(meta.threads).toEqual({ intra_op: 4, inter_op: 1 });
    expect(meta.versions).toEqual(identity.versions);
    expect(meta.machine.ram_bytes).toBe(1024);
    expect(meta.thinking_mode).toBe("default");
    expect(meta.template_sha256).toBe("t".repeat(64));
  });

  it("rejects missing fields, bad hashes and inconsistent status", async () => {
    const dir = await tmp();
    await runScoring({
      items: makeItems(1),
      outDir: dir,
      resume: false,
      scorer: fakeScorer(),
      identity,
      clock,
    });
    const meta = JSON.parse(await readFile(join(dir, "run.json"), "utf-8"));
    const { versions: _v, ...noVersions } = meta;
    expect(validateRunMeta(noVersions)).toContain('missing field "versions"');
    expect(validateRunMeta({ ...meta, input: { ...meta.input, sha256: "xyz" } })).toContain(
      "input.sha256 must be 64 hex chars"
    );
    expect(validateRunMeta({ ...meta, status: "aborted" })).toContain(
      "an aborted run needs error_message"
    );
    expect(validateRunMeta({ ...meta, label_tokens: null })).toContain(
      "label_tokens must be set exactly for the letter modes"
    );
    expect(validateRunMeta(null)).toEqual(["run.json is not an object"]);
  });
});

describe("parseItemsJsonl", () => {
  it("rejects invalid JSON, missing fields and empty files", () => {
    expect(() => parseItemsJsonl("")).toThrow("no prompts");
    expect(() => parseItemsJsonl("{nope")).toThrow("line 1 is not valid JSON");
    expect(() => parseItemsJsonl('{"prompt_id":"x"}')).toThrow('"prompt"');
    const ok = JSON.stringify(makeItems(1)[0]);
    expect(parseItemsJsonl(`${ok}\n\n`)).toHaveLength(1);
  });
});
