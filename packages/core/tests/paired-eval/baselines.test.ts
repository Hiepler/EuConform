import { describe, expect, it } from "vitest";
import {
  type BaselineName,
  LOG_CHOSEN,
  LOG_OTHER,
  type PromptItem,
  type ScoreRow,
  coarseDecision,
  generate,
  scoreBaseline,
} from "../../src/paired-eval";

const pilot = generate({ split: "pilot", seed: "unit-pilot", perFamily: 12 });
const decomp = generate({ split: "pilot", seed: "unit-pilot", perFamily: 12, arm: "decomp" });
const word = generate({ split: "pilot", seed: "unit-pilot", perFamily: 12, arm: "word" });

/** m* per (item, variant) from the ER and RE rows, as the analysis computes it. */
function marginStar(items: PromptItem[], rows: ScoreRow[]): Map<string, number> {
  const byId = new Map(rows.map((row) => [row.prompt_id, row]));
  const sums = new Map<string, number>();
  for (const item of items) {
    const row = byId.get(item.prompt_id) as ScoreRow;
    const escLetter =
      item.reference_content === "escalate"
        ? item.reference_letter
        : item.reference_letter === "A"
          ? "B"
          : "A";
    const lEsc = escLetter === "A" ? (row.l_a as number) : (row.l_b as number);
    const lRout = escLetter === "A" ? (row.l_b as number) : (row.l_a as number);
    const key = `${item.item_id}|${item.variant}`;
    sums.set(key, (sums.get(key) ?? 0) + 0.5 * (lEsc - lRout));
  }
  return sums;
}

function accuracy(name: BaselineName): number {
  const core = pilot.items.filter((i) => i.variant === "base" || i.variant === "decisive");
  const m = marginStar(core, scoreBaseline(name, core));
  const refs = new Map(core.map((i) => [`${i.item_id}|${i.variant}`, i.reference_content]));
  let correct = 0;
  for (const [key, value] of m) {
    const decision = value > 1e-12 ? "escalate" : value < -1e-12 ? "routine" : "tie";
    if (decision === refs.get(key)) correct++;
  }
  return correct / m.size;
}

describe("paired-eval baselines (AP2)", () => {
  it("rows carry log 0.9 / log 0.1, mass 1 and the baseline model id", () => {
    const rows = scoreBaseline("oracle", pilot.items);
    expect(rows).toHaveLength(pilot.items.length);
    for (const row of rows) {
      expect(row.model_id).toBe("baseline:oracle");
      expect(row.mode).toBe("baseline");
      expect(row.mass).toBe(1);
      expect([row.l_a, row.l_b].sort()).toEqual([LOG_CHOSEN, LOG_OTHER].sort());
    }
  });

  it("oracle is always right, constant_a always ties, constant_routine is 0.5", () => {
    expect(accuracy("oracle")).toBe(1);
    expect(accuracy("constant_a")).toBe(0);
    expect(accuracy("constant_first")).toBe(0);
    expect(accuracy("constant_routine")).toBe(0.5);
    const random = accuracy("random");
    expect(random).toBeGreaterThanOrEqual(0.4);
    expect(random).toBeLessThanOrEqual(0.6);
  });

  it("constant_a raw (ER only) accuracy is 0.5", () => {
    const er = pilot.items.filter(
      (i) => (i.variant === "base" || i.variant === "decisive") && i.option_order === "ER"
    );
    const rows = scoreBaseline("constant_a", er);
    const correct = rows.filter((row) => row.decision_content === row.reference_content).length;
    expect(correct / rows.length).toBe(0.5);
  });

  it("decomp: constant_a always picks letter A, constant_first always line 1", () => {
    for (const row of scoreBaseline("constant_a", decomp.items)) expect(row.l_a).toBe(LOG_CHOSEN);
    for (const [item, row] of decomp.items.map(
      (i) => [i, scoreBaseline("constant_first", [i])[0]] as const
    )) {
      // decomp uses BA: line 1 carries letter B.
      expect(item.letter_order).toBe("BA");
      expect(row?.l_b).toBe(LOG_CHOSEN);
    }
  });

  it("oracle, constant_routine and coarse keep the paraphrase decision of base", () => {
    for (const name of ["coarse", "oracle", "constant_routine"] as const) {
      const rows = new Map(scoreBaseline(name, pilot.items).map((r) => [r.prompt_id, r]));
      for (const item of pilot.items.filter(
        (i) => i.variant === "para1" || i.variant === "para2"
      )) {
        const base = item.prompt_id.replace(`:${item.variant}:`, ":base:");
        expect(rows.get(item.prompt_id)?.decision_content, `${name} ${item.prompt_id}`).toBe(
          rows.get(base)?.decision_content
        );
      }
    }
  });

  it("coarse rounds the deciding value and treats a threshold hit as routine", () => {
    const t1 = pilot.items.find(
      (i) => i.family === "T1" && i.variant === "base" && i.stratum === "near"
    );
    expect(t1).toBeDefined();
    // Near cases sit within 0.3 mmol/L of 6.0, so step 1 rounds them onto the threshold.
    expect(coarseDecision(t1 as PromptItem)).toBe("routine");
    const far = pilot.items.filter(
      (i) => i.family === "T1" && i.stratum === "far" && i.option_order === "ER"
    );
    for (const item of far) expect(coarseDecision(item)).toBe(item.reference_content);
  });

  it("word arm rows use l_escalate / l_routine", () => {
    for (const row of scoreBaseline("oracle", word.items)) {
      expect(row.l_a).toBeNull();
      expect(row.decision_content).toBe(row.reference_content);
      expect(row.l_escalate === LOG_CHOSEN || row.l_routine === LOG_CHOSEN).toBe(true);
    }
  });
});
