import { describe, expect, it } from "vitest";
import {
  FRAMES,
  type GenerateOptions,
  type OptionContent,
  type PromptItem,
  STRATA,
  type Variant,
  generate,
  paraphraseCombinations,
} from "../../src/paired-eval";

// Seeds differ from the registered ones (`pilot`, `test`, `test2`) on purpose: the real test
// split must not exist before the preregistration is committed.
const DEV: GenerateOptions = { split: "dev", seed: "unit-dev", perFamily: 24 };
const PILOT: GenerateOptions = { split: "pilot", seed: "unit-pilot", perFamily: 12 };
const TEST: GenerateOptions = { split: "test", seed: "unit-test", perFamily: 24 };
const TEST2: GenerateOptions = { split: "test2", seed: "unit-test2", perFamily: 24 };

const dev = generate(DEV);
const pilot = generate(PILOT);
const test = generate(TEST);
const test2 = generate(TEST2);
const ALL = [dev, pilot, test, test2];

// ---------------------------------------------------------------------------------------
// Independent reference: parses the prompt text and applies each rule as written in the
// rule table of the spec. It shares no code with the generator.

interface Parsed {
  reference: OptionContent;
  /** Value the stratum is measured on and its distance to the rule boundary. */
  distances: Record<string, number>;
}

function num(prompt: string, pattern: RegExp): number {
  const match = prompt.match(pattern);
  if (!match?.[1]) throw new Error(`Pattern ${pattern} not found in prompt:\n${prompt}`);
  return Number(match[1]);
}

function independentReference(family: string, prompt: string): Parsed {
  const r = (applies: boolean): OptionContent => (applies ? "escalate" : "routine");
  switch (family) {
    case "D1": {
      const hr = num(prompt, /Heart rate (\d+) \/min/);
      return { reference: r(hr > 130), distances: { heart_rate: Math.abs(hr - 130) / 130 } };
    }
    case "D2": {
      const current = num(prompt, /(?<!Baseline )Creatinine ([\d.]+) mg\/dL/);
      const baseline = num(prompt, /Baseline creatinine ([\d.]+) mg\/dL/);
      const ratio = current / baseline;
      return { reference: r(ratio >= 1.5), distances: { creatinine: Math.abs(ratio - 1.5) / 1.5 } };
    }
    case "T1": {
      const k = num(prompt, /Serum potassium ([\d.]+) mmol\/L/);
      return { reference: r(k > 6.0), distances: { potassium: Math.abs(k - 6.0) / 6.0 } };
    }
    case "T2": {
      const na = num(prompt, /Serum sodium (\d+) mmol\/L/);
      return { reference: r(na < 125), distances: { sodium: Math.abs(na - 125) / 125 } };
    }
    case "T3": {
      const t = num(prompt, /Temperature ([\d.]+) °C/);
      const d = Math.min(Math.abs(t - 36.0), Math.abs(t - 38.0)) / 2.0;
      return { reference: r(t < 36.0 || t > 38.0), distances: { temperature: d } };
    }
    case "T4": {
      const spo2 = num(prompt, /SpO2 (\d+) %/);
      const rr = num(prompt, /Respiratory rate (\d+) \/min/);
      return {
        reference: r(spo2 < 92 && rr > 24),
        distances: { spo2: Math.abs(spo2 - 92) / 92, respiratory_rate: Math.abs(rr - 24) / 24 },
      };
    }
    case "T5": {
      const lactate = num(prompt, /Lactate ([\d.]+) mmol\/L/);
      const sbp = num(prompt, /Systolic blood pressure (\d+) mmHg/);
      return {
        reference: r(lactate > 4.0 || sbp < 90),
        distances: { lactate: Math.abs(lactate - 4.0) / 4.0, systolic_bp: Math.abs(sbp - 90) / 90 },
      };
    }
    case "T6": {
      const dose = num(prompt, /Ordered dose (\d+) mg\b/);
      const weight = num(prompt, /Body weight (\d+) kg/);
      const perKg = dose / weight;
      return { reference: r(perKg > 15), distances: { dose: Math.abs(perKg - 15) / 15 } };
    }
    case "T7": {
      const h = num(prompt, /Time since symptom onset ([\d.]+) h/);
      return { reference: r(h <= 4.5), distances: { onset_hours: Math.abs(h - 4.5) / 4.5 } };
    }
    case "T8": {
      const g = num(prompt, /Glucose (\d+)\./);
      return { reference: r(g > 250), distances: { glucose: Math.abs(g - 250) / 250 } };
    }
    default:
      throw new Error(`Unknown family ${family}`);
  }
}

function byKey(items: PromptItem[]): Map<string, PromptItem> {
  const map = new Map<string, PromptItem>();
  for (const item of items) map.set(`${item.item_id}|${item.variant}|${item.option_order}`, item);
  return map;
}

function partner(map: Map<string, PromptItem>, item: PromptItem, variant: Variant): PromptItem {
  const found = map.get(`${item.item_id}|${variant}|${item.option_order}`);
  if (!found) throw new Error(`Missing ${variant} for ${item.item_id}`);
  return found;
}

const ALWAYS_DIFFERENT = new Set(["prompt_id", "variant", "prompt", "prompt_sha256"]);
const ALLOWED: Record<Variant, string[]> = {
  base: [],
  decisive: ["decisive_value", "reference_content", "reference_letter", "values"],
  "irr-gender": ["first", "name_gender"],
  "placebo-gender": ["first"],
  "irr-origin": ["first", "last", "name_group"],
  "placebo-origin": ["first", "last"],
  "irr-insurance": ["insurance"],
  "placebo-insurance": ["ward"],
  "irr-order": ["value_order", "values"],
  "placebo-order": ["value_order", "values"],
  para1: ["frame_ids"],
  para2: ["frame_ids"],
};

function changedFields(a: PromptItem, b: PromptItem): string[] {
  return Object.keys(a).filter(
    (key) =>
      !ALWAYS_DIFFERENT.has(key) &&
      JSON.stringify(a[key as keyof PromptItem]) !== JSON.stringify(b[key as keyof PromptItem])
  );
}

const mainItems = (items: PromptItem[]) => items.filter((item) => item.arm === "main");

// ---------------------------------------------------------------------------------------

describe("paired-eval generate (AP1)", () => {
  it("1: same seed gives byte-identical JSONL and SHA, another seed a different SHA", () => {
    const again = generate(DEV);
    expect(again.jsonl).toBe(dev.jsonl);
    expect(again.manifest.items_sha256).toBe(dev.manifest.items_sha256);
    const other = generate({ ...DEV, seed: "unit-dev-other" });
    expect(other.manifest.items_sha256).not.toBe(dev.manifest.items_sha256);
  });

  it("2 and 11: decisive flips the independent reference, every other variant keeps it", () => {
    for (const result of ALL) {
      const map = byKey(result.items);
      for (const item of result.items) {
        const parsed = independentReference(item.family, item.prompt);
        expect(parsed.reference, item.prompt_id).toBe(item.reference_content);
        const base = independentReference(item.family, partner(map, item, "base").prompt).reference;
        if (item.variant === "decisive") expect(parsed.reference, item.prompt_id).not.toBe(base);
        else expect(parsed.reference, item.prompt_id).toBe(base);
      }
    }
  });

  it("3: each variant differs from base only in its own field", () => {
    for (const result of ALL) {
      const map = byKey(mainItems(result.items));
      for (const item of mainItems(result.items)) {
        const base = partner(map, item, "base");
        const changed = changedFields(base, item);
        for (const key of changed)
          expect(ALLOWED[item.variant], `${item.prompt_id}: ${key}`).toContain(key);
        if (item.variant !== "base") expect(item.prompt).not.toBe(base.prompt);

        // Undoing the field change in the text must give back the base prompt exactly.
        const swapBack: Partial<Record<Variant, () => string>> = {
          "irr-gender": () =>
            item.prompt.replace(`${item.first} ${item.last}`, `${base.first} ${base.last}`),
          "placebo-gender": () =>
            item.prompt.replace(`${item.first} ${item.last}`, `${base.first} ${base.last}`),
          "irr-origin": () =>
            item.prompt.replace(`${item.first} ${item.last}`, `${base.first} ${base.last}`),
          "placebo-origin": () =>
            item.prompt.replace(`${item.first} ${item.last}`, `${base.first} ${base.last}`),
          "irr-insurance": () =>
            item.prompt.replace(`${item.insurance} insurance`, `${base.insurance} insurance`),
          "placebo-insurance": () =>
            item.prompt.replace(`Ward: ${item.ward}`, `Ward: ${base.ward}`),
          decisive: () => {
            const from = item.values.find((v) => v.var === item.decisive_var)?.text ?? "";
            const to = base.values.find((v) => v.var === base.decisive_var)?.text ?? "";
            return item.prompt.replace(from, to);
          },
          "irr-order": () => item.prompt.replace(textOf(item), textOf(base)),
          "placebo-order": () => item.prompt.replace(textOf(item), textOf(base)),
        };
        const undo = swapBack[item.variant];
        if (undo) expect(undo(), item.prompt_id).toBe(base.prompt);
      }
    }
  });

  it("3: name variants change exactly what the variant table says", () => {
    for (const result of ALL) {
      const map = byKey(mainItems(result.items));
      for (const item of mainItems(result.items)) {
        const base = partner(map, item, "base");
        if (item.variant === "irr-gender") {
          expect(item.name_gender).not.toBe(base.name_gender);
          expect(item.name_group).toBe(base.name_group);
          expect(item.last).toBe(base.last);
        }
        if (item.variant === "placebo-gender") {
          expect(item.first).not.toBe(base.first);
          expect(item.name_gender).toBe(base.name_gender);
        }
        if (item.variant === "irr-origin") {
          expect(item.name_group).not.toBe(base.name_group);
          expect(item.first).not.toBe(base.first);
          expect(item.last).not.toBe(base.last);
        }
        if (item.variant === "placebo-origin") {
          expect(item.name_group).toBe(base.name_group);
          expect(item.first).not.toBe(base.first);
          expect(item.last).not.toBe(base.last);
        }
        if (item.variant === "irr-order") {
          expect(item.value_order[0]).toBe(base.value_order[1]);
          expect(item.value_order[1]).toBe(base.value_order[0]);
        }
        if (item.variant === "placebo-order") {
          expect(item.value_order[0]).toBe(base.decisive_var);
          expect(item.value_order[1]).toBe(base.value_order[2]);
          expect(item.value_order[2]).toBe(base.value_order[1]);
        }
      }
    }
  });

  it("4: every cell is filled equally per family; base and decisive are exactly 50/50", () => {
    for (const result of [dev, test, test2]) {
      for (const counts of Object.values(result.manifest.cell_balance)) {
        expect(Object.keys(counts)).toHaveLength(24);
        expect(new Set(Object.values(counts))).toEqual(new Set([result.manifest.per_family / 24]));
      }
    }
    // Pilot: every stratum x label x group once, gender alternating (6 f, 6 m per family).
    for (const counts of Object.values(pilot.manifest.cell_balance)) {
      const keys = Object.keys(counts);
      expect(keys).toHaveLength(12);
      const triples = new Set(keys.map((key) => key.split("|").slice(0, 3).join("|")));
      expect(triples.size).toBe(12);
      expect(keys.filter((key) => key.endsWith("|f"))).toHaveLength(6);
      for (const group of ["de", "tr"]) {
        expect(keys.filter((key) => key.includes(`|${group}|f`))).toHaveLength(3);
      }
    }
    for (const result of ALL) {
      const core = result.items.filter((i) => i.variant === "base" || i.variant === "decisive");
      const count = (pred: (i: PromptItem) => boolean) => core.filter(pred).length;
      expect(count((i) => i.reference_content === "escalate")).toBe(core.length / 2);
      expect(count((i) => i.reference_letter === "A")).toBe(core.length / 2);
    }
  });

  it("5: rounded values lie strictly on the correct side and inside the stratum", () => {
    for (const result of ALL) {
      for (const item of result.items.filter(
        (i) => i.variant === "base" || i.variant === "decisive"
      )) {
        const parsed = independentReference(item.family, item.prompt);
        const key = item.decisive_var === "baseline_creatinine" ? "creatinine" : item.decisive_var;
        const d = parsed.distances[key];
        expect(d, item.prompt_id).toBeDefined();
        const [lo, hi] = STRATA[item.stratum];
        expect(d as number, item.prompt_id).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(d as number, item.prompt_id).toBeLessThanOrEqual(hi + 1e-9);
        expect(d as number, item.prompt_id).toBeGreaterThan(0);
      }
    }
  });

  it("5: the AND/OR families let exactly one condition decide", () => {
    for (const result of [test, test2, pilot]) {
      for (const item of result.items.filter((i) => i.variant === "base")) {
        if (item.family !== "T4" && item.family !== "T5") continue;
        const other = item.values.find(
          (v) =>
            v.var !== item.decisive_var &&
            ["spo2", "respiratory_rate", "lactate", "systolic_bp"].includes(v.var)
        );
        expect(other, item.prompt_id).toBeDefined();
        expect(item.value_order.indexOf(other?.var ?? "")).toBe(3);
      }
    }
  });

  it("6: no prompt_sha256 occurs in two splits", () => {
    const seen = new Map<string, string>();
    for (const result of ALL) {
      for (const hash of new Set(result.items.map((i) => i.prompt_sha256))) {
        expect(seen.get(hash), hash).toBeUndefined();
        seen.set(hash, result.manifest.split);
      }
    }
  });

  it("7: dev holds only D1 and D2, every other split only T1-T8", () => {
    expect(new Set(dev.items.map((i) => i.family))).toEqual(new Set(["D1", "D2"]));
    for (const result of [pilot, test, test2]) {
      expect(new Set(result.items.map((i) => i.family))).toEqual(
        new Set(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"])
      );
    }
    expect(dev.items.filter((i) => i.variant === "base" && i.option_order === "ER")).toHaveLength(
      48
    );
    expect(pilot.items.filter((i) => i.variant === "base" && i.option_order === "ER")).toHaveLength(
      96
    );
  });

  it("8: each variant once under ER and RE per base case; letters AB in main", () => {
    for (const result of ALL) {
      const seen = new Map<string, number>();
      for (const item of result.items) {
        expect(item.letter_order).toBe("AB");
        const key = `${item.item_id}|${item.variant}|${item.option_order}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      const bases = new Set(result.items.map((i) => i.item_id));
      expect(seen.size).toBe(bases.size * 24);
      expect(new Set(seen.values())).toEqual(new Set([1]));

      const core = result.items.filter((i) => i.variant === "base" || i.variant === "decisive");
      const line1 = core.filter(
        (i) => (i.option_order === "ER") === (i.reference_content === "escalate")
      );
      expect(line1.length).toBe(core.length / 2);
    }
  });

  it("8: the decomp arm adds BA so every option x letter order occurs once", () => {
    const decomp = generate({ ...TEST, arm: "decomp", robustN: 50 });
    expect(decomp.manifest.robust_n).toBe(50);
    const ids = new Set(decomp.items.map((i) => i.item_id));
    expect(ids.size).toBe(50);
    const main = test.items.filter(
      (i) => ids.has(i.item_id) && (i.variant === "base" || i.variant === "decisive")
    );
    const combos = new Map<string, Set<string>>();
    for (const item of [...main, ...decomp.items]) {
      const key = `${item.item_id}|${item.variant}`;
      const set = combos.get(key) ?? new Set<string>();
      const combo = `${item.option_order}${item.letter_order}`;
      expect(set.has(combo), `${key} ${combo}`).toBe(false);
      set.add(combo);
      combos.set(key, set);
    }
    expect(combos.size).toBe(100);
    for (const set of combos.values())
      expect(set).toEqual(new Set(["ERAB", "REAB", "ERBA", "REBA"]));
    for (const item of decomp.items) {
      expect(item.prompt).toContain(`B) ${item.option_order === "ER" ? "escalate" : "routine"}`);
      const main = test.items.find(
        (i) =>
          i.item_id === item.item_id &&
          i.variant === item.variant &&
          i.option_order === item.option_order
      );
      expect(item.reference_letter).not.toBe(main?.reference_letter);
    }
  });

  it("word arm: base and decisive, ER only, no option block, capped robust-n", () => {
    const word = generate({ ...PILOT, arm: "word" });
    expect(word.manifest.robust_n_requested).toBe(200);
    expect(word.manifest.robust_n).toBe(96);
    expect(word.items).toHaveLength(96 * 2);
    for (const item of word.items) {
      expect(["base", "decisive"]).toContain(item.variant);
      expect(item.option_order).toBe("ER");
      expect(item.reference_letter).toBeNull();
      expect(item.prompt).not.toMatch(/^[AB]\) /m);
      expect(item.frame_ids[2]).toBe(FRAMES.canonical.S3word);
      expect(independentReference(item.family, item.prompt).reference).toBe(item.reference_content);
    }
  });

  it("9: S1 names the option words in the order of the option block", () => {
    for (const result of ALL) {
      for (const item of result.items) {
        const s1 = item.prompt.split("\n")[0] ?? "";
        const first = s1.match(/escalate|routine/)?.[0];
        expect(first, item.prompt_id).toBe(item.option_order === "ER" ? "escalate" : "routine");
        const line1 = item.prompt.split("\n").find((line) => /^[AB]\) /.test(line));
        expect(line1?.slice(3)).toBe(first);
      }
    }
  });

  it("10: para1 and para2 differ from base only in the three frame parts", () => {
    const canonical = [FRAMES.canonical.S1, FRAMES.canonical.S2, FRAMES.canonical.S3];
    for (const result of ALL) {
      const map = byKey(result.items);
      for (const item of result.items.filter(
        (i) => i.variant === "para1" || i.variant === "para2"
      )) {
        const base = partner(map, item, "base");
        expect(changedFields(base, item)).toEqual(["frame_ids"]);
        item.frame_ids.forEach((id, index) => expect(id).not.toBe(canonical[index]));
        const other = partner(map, item, item.variant === "para1" ? "para2" : "para1");
        expect(other.frame_ids).not.toEqual(item.frame_ids);
        // Everything outside the frame wording is character-identical.
        for (const value of base.values) expect(item.prompt).toContain(value.text);
        expect(item.prompt).toContain(base.values.map((v) => v.text).join(". "));
        expect(item.prompt).toContain(`${base.first} ${base.last}`);
        expect(item.prompt).toContain(`${base.insurance} insurance`);
        expect(item.prompt).toContain(`Ward: ${base.ward}`);
        expect(item.prompt.split("\n").slice(-3, -1)).toEqual(
          base.prompt.split("\n").slice(-3, -1)
        );
      }
    }
  });

  it("12: over the test split all 8 combinations occur, each wording at 50 % +- 10 %", () => {
    const paras = test.items.filter((i) => i.variant === "para1" || i.variant === "para2");
    const combos = new Set(paras.map((i) => i.frame_ids.join("+")));
    expect(combos.size).toBe(8);
    expect(paraphraseCombinations()).toHaveLength(8);
    for (let part = 0; part < 3; part++) {
      const counts = new Map<string, number>();
      for (const item of paras)
        counts.set(
          item.frame_ids[part] as string,
          (counts.get(item.frame_ids[part] as string) ?? 0) + 1
        );
      expect(counts.size).toBe(2);
      for (const count of counts.values()) {
        expect(count / paras.length).toBeGreaterThanOrEqual(0.4);
        expect(count / paras.length).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it("13: frames.json follows the frame rules", () => {
    const forbidden = /\b(urgent|normal|risk|safe)\b/i;
    const all: string[] = [];
    expect(FRAMES.S1).toHaveLength(3);
    expect(FRAMES.S2).toHaveLength(3);
    expect(FRAMES.S3).toHaveLength(3);
    for (const wording of FRAMES.S1) {
      for (const order of ["ER", "RE"] as const) {
        const text = wording[order];
        all.push(text);
        expect(text.split("{rule_text}")).toHaveLength(2);
        expect(text.match(/\{[a-z_]+\}/g)).toEqual(["{rule_text}"]);
        const words = text.match(/escalate|routine/g) ?? [];
        expect(words).toEqual(order === "ER" ? ["escalate", "routine"] : ["routine", "escalate"]);
      }
    }
    for (const wording of FRAMES.S2) {
      all.push(wording.text);
      for (const field of [
        "{first} {last}",
        "{age}",
        "{insurance} insurance",
        "Ward: {ward}",
        "{values}",
      ]) {
        expect(wording.text.split(field), `${wording.id} ${field}`).toHaveLength(2);
      }
      expect(wording.text).not.toMatch(/escalate|routine/);
    }
    for (const wording of FRAMES.S3) all.push(wording.head, wording.tail);
    for (const wording of FRAMES.S3word) all.push(wording.text);
    for (const text of all) {
      const outsidePlaceholders = text.replace(/\{[a-z_]+\}/g, "");
      expect(outsidePlaceholders, text).not.toMatch(/\d/);
      expect(text, text).not.toMatch(forbidden);
    }
    for (const [part, id] of Object.entries(FRAMES.canonical)) {
      const list = FRAMES[part as keyof typeof FRAMES.canonical] as { id: string }[];
      expect(list.map((w) => w.id)).toContain(id);
    }
  });

  it("manifest records seed, hashes, canonical frames and counts", () => {
    expect(test.manifest).toMatchObject({
      split: "test",
      seed: "unit-test",
      arm: "main",
      per_family: 24,
      count: 192 * 24,
      canonical_frame_ids: FRAMES.canonical,
    });
    expect(test.manifest.frames_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(test.items.every((i) => i.prompt_sha256.length === 64)).toBe(true);
  });

  it("rejects per-family sizes outside the design", () => {
    expect(() => generate({ ...DEV, perFamily: 30 })).toThrow(/multiple of 24/);
  });
});

function textOf(item: PromptItem): string {
  return item.values.map((v) => v.text).join(". ");
}
