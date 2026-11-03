/**
 * Paired decision eval: deterministic, LLM-free item generator.
 *
 * One base case per cell (stratum x reference label x name group x name gender) and family,
 * twelve variants per base case, each under both option orders. Every random choice comes
 * from a string-seeded PRNG, so the same seed yields a byte-identical JSONL.
 */
import { createHash } from "node:crypto";
import familiesJson from "./families.json";
import framesJson from "./frames.json";
import namesJson from "./names.json";
import {
  conditionHolds,
  distanceOf,
  formatValue,
  mirrorBound,
  referenceContent,
  requireInputs,
  requireVariable,
  roundTo,
} from "./reference";
import type {
  Arm,
  CaseValue,
  FamiliesFile,
  Family,
  FamilyVariable,
  FramesFile,
  GenerateManifest,
  Insurance,
  Letter,
  LetterOrder,
  NameGender,
  NameGroup,
  NamesFile,
  OptionContent,
  OptionOrder,
  PromptItem,
  Split,
  Stratum,
  Variant,
  Ward,
} from "./types";
import { VARIANTS } from "./types";

export const FAMILIES = familiesJson as unknown as FamiliesFile;
export const FRAMES = framesJson as unknown as FramesFile;
export const NAMES = namesJson as unknown as NamesFile;

export const STRATA: Record<Stratum, [number, number]> = {
  near: [0.01, 0.05],
  mid: [0.1, 0.3],
  far: [0.4, 0.6],
};

/** Distance of the non-deciding rule variable in the AND/OR families (assumption, see PR). */
export const NON_DECISIVE_RANGE: [number, number] = [0.1, 0.3];

export const DEFAULT_ROBUST_N = 200;

const STRATUM_ORDER: Stratum[] = ["near", "mid", "far"];
const LABEL_ORDER: OptionContent[] = ["escalate", "routine"];
const GROUP_ORDER: NameGroup[] = ["de", "tr"];
const GENDER_ORDER: NameGender[] = ["f", "m"];
const MAX_DRAWS = 10_000;

export interface GenerateOptions {
  split: Split;
  seed: string;
  /** 12 (pilot layout: half cells) or a multiple of 24. */
  perFamily: number;
  arm?: Arm;
  /** Base cases in the robustness subset for `decomp` and `word`; capped at what exists. */
  robustN?: number;
  /** Generator version recorded in the manifest (git SHA); null when unknown. */
  generatorVersion?: string | null;
}

export interface GenerateResult {
  items: PromptItem[];
  jsonl: string;
  manifest: GenerateManifest;
}

// ---------------------------------------------------------------------------------------
// Seeded PRNG (cyrb128 + sfc32): small, fast, identical on every platform.

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  uniform(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: readonly T[]): T[];
}

export function createRng(seed: string): Rng {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  let a = (h1 ^ h2 ^ h3 ^ h4) >>> 0;
  let b = (h2 ^ h1) >>> 0;
  let c = (h3 ^ h1) >>> 0;
  let d = (h4 ^ h1) >>> 0;

  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next();

  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    uniform: (min, max) => min + next() * (max - min),
    pick: (values) => {
      if (values.length === 0) throw new Error("Cannot pick from an empty list.");
      return values[Math.floor(next() * values.length)] as (typeof values)[number];
    },
    shuffle: (values) => {
      const out = [...values];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
  };
  return rng;
}

export function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function framesSha256(frames: FramesFile = FRAMES): string {
  return sha256Hex(JSON.stringify(frames));
}

// ---------------------------------------------------------------------------------------
// Base cases

interface Cell {
  stratum: Stratum;
  label: OptionContent;
  group: NameGroup;
  gender: NameGender;
}

interface Person {
  first: string;
  last: string;
}

/** Everything a variant may change, plus what stays fixed. */
interface CaseState {
  person: Person;
  gender: NameGender;
  group: NameGroup;
  age: number;
  insurance: Insurance;
  ward: Ward;
  /** Variable key -> printed value entry. */
  values: Record<string, CaseValue>;
  order: string[];
}

interface BaseCase {
  itemId: string;
  family: Family;
  cell: Cell;
  distance: number;
  decisiveVar: string;
  /** Printed decisive value in the base case and after mirroring. */
  decisiveValue: number;
  mirroredValue: number;
  state: CaseState;
  /** Alternative names drawn once per base case. */
  names: {
    irrGender: Person;
    placeboGender: Person;
    irrOrigin: Person;
    placeboOrigin: Person;
  };
  paraphrases: [FrameIds, FrameIds];
}

type FrameIds = [string, string, string];

export function cellsFor(perFamily: number): Cell[] {
  const cells: Cell[] = [];
  if (perFamily === 12) {
    // Pilot layout: every stratum x label x group once, gender alternating as a checkerboard
    // so that neither group nor label is confounded with gender.
    STRATUM_ORDER.forEach((stratum, si) => {
      LABEL_ORDER.forEach((label, li) => {
        GROUP_ORDER.forEach((group, gi) => {
          const gender = GENDER_ORDER[(si + li + gi) % 2] as NameGender;
          cells.push({ stratum, label, group, gender });
        });
      });
    });
    return cells;
  }
  if (perFamily <= 0 || perFamily % 24 !== 0) {
    throw new Error(`--per-family must be 12 or a multiple of 24, got ${perFamily}.`);
  }
  const replicates = perFamily / 24;
  for (const stratum of STRATUM_ORDER) {
    for (const label of LABEL_ORDER) {
      for (const group of GROUP_ORDER) {
        for (const gender of GENDER_ORDER) {
          for (let r = 0; r < replicates; r++) cells.push({ stratum, label, group, gender });
        }
      }
    }
  }
  return cells;
}

export function cellKey(cell: Cell): string {
  return `${cell.stratum}|${cell.label}|${cell.group}|${cell.gender}`;
}

/** Families of a split: dev uses D1/D2, every other split T1-T8. */
export function familiesForSplit(split: Split, families: Family[] = FAMILIES.families): Family[] {
  const wanted = split === "dev" ? "dev" : "test";
  return families.filter((family) => family.split === wanted);
}

interface DecisiveDraw {
  variable: FamilyVariable;
  /** Printed values of the rule inputs (decisive first; ratio families also the denominator). */
  printed: Record<string, number>;
  decisiveValue: number;
  mirroredValue: number;
  distance: number;
}

/**
 * Draws the deciding value at the stratum distance on the wanted side, rounds it and checks
 * the rounded value and its mirror: both strictly on their side, both inside the stratum,
 * both inside the variable's plausible range. Returns null to make the caller redraw.
 */
function drawDecisive(
  family: Family,
  variable: FamilyVariable,
  wantHolds: boolean,
  stratum: Stratum,
  rng: Rng
): DecisiveDraw | null {
  const [lo, hi] = STRATA[stratum];
  const d = rng.uniform(lo, hi);
  const inStratum = (x: number) => x >= lo && x <= hi;

  if (family.logic === "ratio") {
    const [numerator, denominator] = requireInputs(family);
    const range = denominator.range;
    if (!range) throw new Error(`Family ${family.id}: denominator input needs a range.`);
    const den = roundTo(rng.uniform(range[0], range[1]), denominator.decimals);
    const target = sideValue(variable, wantHolds, d, rng);
    const num = roundTo(target * den, numerator.decimals);
    const ratio = num / den;
    if (conditionHolds(variable, ratio) !== wantHolds) return null;
    const distance = distanceOf(variable, ratio);
    if (!inStratum(distance)) return null;
    const mirroredNum = roundTo((2 * variable.threshold - ratio) * den, numerator.decimals);
    const mirroredRatio = mirroredNum / den;
    if (conditionHolds(variable, mirroredRatio) === wantHolds) return null;
    if (!inStratum(distanceOf(variable, mirroredRatio))) return null;
    if (num <= 0 || mirroredNum <= 0) return null;
    return {
      variable,
      printed: { [numerator.var]: num, [denominator.var]: den },
      decisiveValue: num,
      mirroredValue: mirroredNum,
      distance,
    };
  }

  const value = roundTo(sideValue(variable, wantHolds, d, rng), variable.decimals);
  if (conditionHolds(variable, value) !== wantHolds) return null;
  const distance = distanceOf(variable, value);
  if (!inStratum(distance)) return null;
  const bound = mirrorBound(variable, value);
  if (bound === null) return null;
  const mirrored = roundTo(2 * bound - value, variable.decimals);
  if (conditionHolds(variable, mirrored) === wantHolds) return null;
  if (!inStratum(distanceOf(variable, mirrored))) return null;
  // The mirror must sit at the same bound again, otherwise "same distance" breaks (T3 far).
  if (mirrorBound(variable, mirrored) !== bound) return null;
  if (!inRange(variable, value) || !inRange(variable, mirrored)) return null;
  return {
    variable,
    printed: { [variable.var]: value },
    decisiveValue: value,
    mirroredValue: mirrored,
    distance,
  };
}

/** Unrounded value at distance d on the side where the condition holds (or not). */
function sideValue(variable: FamilyVariable, wantHolds: boolean, d: number, rng: Rng): number {
  const offset = d * variable.scale;
  switch (variable.op) {
    case ">":
    case ">=":
      return wantHolds ? variable.threshold + offset : variable.threshold - offset;
    case "<":
    case "<=":
      return wantHolds ? variable.threshold - offset : variable.threshold + offset;
    case "outside": {
      const high = variable.threshold_high as number;
      const lowSide = rng.next() < 0.5;
      if (wantHolds) return lowSide ? variable.threshold - offset : high + offset;
      return lowSide ? variable.threshold + offset : high - offset;
    }
  }
}

function inRange(variable: FamilyVariable, value: number): boolean {
  if (!variable.range) return true;
  return value >= variable.range[0] && value <= variable.range[1];
}

/** Non-deciding variable of the AND/OR families: true for AND, false for OR. */
function drawOther(variable: FamilyVariable, wantHolds: boolean, rng: Rng): number | null {
  const d = rng.uniform(NON_DECISIVE_RANGE[0], NON_DECISIVE_RANGE[1]);
  const value = roundTo(sideValue(variable, wantHolds, d, rng), variable.decimals);
  if (conditionHolds(variable, value) !== wantHolds) return null;
  if (!inRange(variable, value)) return null;
  return value;
}

function valueText(label: string, value: string, unit: string | null): string {
  return unit === null ? `${label} ${value}` : `${label} ${value} ${unit}`;
}

function ruleCaseValue(family: Family, key: string, value: number): CaseValue {
  const input = family.inputs?.find((entry) => entry.var === key);
  if (input) {
    return {
      var: key,
      label: input.label,
      value,
      unit: input.unit,
      text: valueText(input.label, formatValue(value, input.decimals), input.unit),
    };
  }
  const variable = family.variables.find((entry) => entry.var === key);
  if (!variable) throw new Error(`Family ${family.id} has no variable ${key}.`);
  return {
    var: key,
    label: variable.label,
    value,
    unit: variable.unit,
    text: valueText(variable.label, formatValue(value, variable.decimals), variable.unit),
  };
}

function drawDistractor(key: string, rng: Rng): CaseValue {
  const def = FAMILIES.distractor_pool[key];
  if (!def) throw new Error(`Unknown distractor ${key}.`);
  const value = roundTo(rng.uniform(def.range[0], def.range[1]), def.decimals);
  if (def.range_diastolic) {
    const diastolic = roundTo(
      rng.uniform(def.range_diastolic[0], def.range_diastolic[1]),
      def.decimals
    );
    const printed = `${formatValue(value, def.decimals)}/${formatValue(diastolic, def.decimals)}`;
    return {
      var: key,
      label: def.label,
      value,
      unit: def.unit,
      text: valueText(def.label, printed, def.unit),
    };
  }
  return {
    var: key,
    label: def.label,
    value,
    unit: def.unit,
    text: valueText(def.label, formatValue(value, def.decimals), def.unit),
  };
}

/** Half of the slots get `a`, half `b`, in seeded order (exact balance for even n). */
function balanced<T>(n: number, a: T, b: T, rng: Rng): T[] {
  const slots = Array.from({ length: n }, (_, i) => (i < Math.ceil(n / 2) ? a : b));
  return rng.shuffle(slots);
}

function firstNames(group: NameGroup, gender: NameGender): string[] {
  return NAMES.first[group][gender].names;
}

function lastNames(group: NameGroup): string[] {
  return NAMES.last[group].names;
}

/** Picks the candidate whose |length change| is closest to `target`; ties broken by rng. */
function closestByLengthChange<T>(
  candidates: T[],
  baseLength: number,
  target: number,
  length: (candidate: T) => number,
  rng: Rng
): T {
  let best: T[] = [];
  let bestGap = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const gap = Math.abs(Math.abs(length(candidate) - baseLength) - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = [candidate];
    } else if (gap === bestGap) {
      best.push(candidate);
    }
  }
  return rng.pick(best);
}

function drawNames(person: Person, group: NameGroup, gender: NameGender, rng: Rng) {
  const otherGender: NameGender = gender === "f" ? "m" : "f";
  const otherGroup: NameGroup = group === "de" ? "tr" : "de";

  const irrGender: Person = { first: rng.pick(firstNames(group, otherGender)), last: person.last };
  const genderTarget = Math.abs(irrGender.first.length - person.first.length);
  const placeboGender: Person = {
    first: closestByLengthChange(
      firstNames(group, gender).filter((name) => name !== person.first),
      person.first.length,
      genderTarget,
      (name) => name.length,
      rng
    ),
    last: person.last,
  };

  const irrOrigin: Person = {
    first: rng.pick(firstNames(otherGroup, gender)),
    last: rng.pick(lastNames(otherGroup)),
  };
  const fullLength = (p: Person) => p.first.length + p.last.length;
  const originTarget = Math.abs(fullLength(irrOrigin) - fullLength(person));
  const pairs: Person[] = [];
  for (const first of firstNames(group, gender)) {
    if (first === person.first) continue;
    for (const last of lastNames(group)) {
      if (last === person.last) continue;
      pairs.push({ first, last });
    }
  }
  const placeboOrigin = closestByLengthChange(
    pairs,
    fullLength(person),
    originTarget,
    fullLength,
    rng
  );
  return { irrGender, placeboGender, irrOrigin, placeboOrigin };
}

/** All non-canonical S1 x S2 x S3 combinations (2 x 2 x 2 = 8), in a fixed order. */
export function paraphraseCombinations(frames: FramesFile = FRAMES): FrameIds[] {
  const alt = (ids: string[], canonical: string) => ids.filter((id) => id !== canonical);
  const s1 = alt(
    frames.S1.map((w) => w.id),
    frames.canonical.S1
  );
  const s2 = alt(
    frames.S2.map((w) => w.id),
    frames.canonical.S2
  );
  const s3 = alt(
    frames.S3.map((w) => w.id),
    frames.canonical.S3
  );
  const combos: FrameIds[] = [];
  for (const a of s1) for (const b of s2) for (const c of s3) combos.push([a, b, c]);
  return combos;
}

function drawParaphrases(seed: string, itemId: string): [FrameIds, FrameIds] {
  const rng = createRng(`${seed}${itemId}`);
  const [first, second] = rng.shuffle(paraphraseCombinations());
  if (!first || !second) throw new Error("frames.json needs at least two paraphrase combinations.");
  return [first, second];
}

function buildBaseCases(family: Family, options: GenerateOptions): BaseCase[] {
  const rng = createRng(`${options.seed}|${options.split}|${family.id}`);
  const cells = cellsFor(options.perFamily);
  const insurance = balanced<Insurance>(cells.length, "statutory", "private", rng);
  const ward = balanced<Ward>(cells.length, "North", "South", rng);

  return cells.map((cell, index) => {
    const itemId = `${options.split}-${family.id}-${String(index).padStart(3, "0")}`;
    const wantEscalate = cell.label === "escalate";

    let draw: DecisiveDraw | null = null;
    let otherValues: Record<string, number> = {};
    for (let attempt = 0; attempt < MAX_DRAWS && !draw; attempt++) {
      const variable =
        family.logic === "and" || family.logic === "or"
          ? rng.pick(family.variables)
          : requireVariable(family, 0);
      const candidate = drawDecisive(family, variable, wantEscalate, cell.stratum, rng);
      if (!candidate) continue;
      otherValues = {};
      if (family.logic === "and" || family.logic === "or") {
        const other = family.variables.find((entry) => entry.var !== variable.var);
        if (!other) throw new Error(`Family ${family.id} needs two rule variables.`);
        const value = drawOther(other, family.logic === "and", rng);
        if (value === null) continue;
        otherValues[other.var] = value;
      }
      draw = candidate;
    }
    if (!draw) {
      throw new Error(
        `Family ${family.id}: no valid draw for cell ${cellKey(cell)} after ${MAX_DRAWS}.`
      );
    }

    const printed = { ...draw.printed, ...otherValues };
    if (referenceContent(family, printed) !== cell.label) {
      throw new Error(`Family ${family.id}: base case ${itemId} does not match its cell label.`);
    }

    const values: Record<string, CaseValue> = {};
    for (const [key, value] of Object.entries(printed)) {
      values[key] = ruleCaseValue(family, key, value);
    }
    const [d1, d2] = family.distractors;
    values[d1] = drawDistractor(d1, rng);
    values[d2] = drawDistractor(d2, rng);

    const decisiveKey = family.logic === "ratio" ? requireInputs(family)[0].var : draw.variable.var;
    const fourth = Object.keys(printed).filter((key) => key !== decisiveKey);
    const order = [decisiveKey, d1, d2, ...fourth];

    const person: Person = {
      first: rng.pick(firstNames(cell.group, cell.gender)),
      last: rng.pick(lastNames(cell.group)),
    };

    return {
      itemId,
      family,
      cell,
      distance: draw.distance,
      decisiveVar: decisiveKey,
      decisiveValue: draw.decisiveValue,
      mirroredValue: draw.mirroredValue,
      state: {
        person,
        gender: cell.gender,
        group: cell.group,
        age: rng.int(30, 80),
        insurance: insurance[index] as Insurance,
        ward: ward[index] as Ward,
        values,
        order,
      },
      names: drawNames(person, cell.group, cell.gender, rng),
      paraphrases: drawParaphrases(options.seed, itemId),
    };
  });
}

// ---------------------------------------------------------------------------------------
// Variants and prompts

interface VariantCase {
  state: CaseState;
  reference: OptionContent;
  decisiveValue: number;
}

function variantCase(base: BaseCase, variant: Variant): VariantCase {
  const state: CaseState = {
    ...base.state,
    values: { ...base.state.values },
    order: [...base.state.order],
  };
  let reference = base.cell.label;
  let decisiveValue = base.decisiveValue;
  const [decisive, d1, d2, ...rest] = base.state.order as [string, string, string, ...string[]];

  switch (variant) {
    case "base":
    case "para1":
    case "para2":
      break;
    case "decisive": {
      decisiveValue = base.mirroredValue;
      state.values[base.decisiveVar] = ruleCaseValue(base.family, base.decisiveVar, decisiveValue);
      reference = reference === "escalate" ? "routine" : "escalate";
      break;
    }
    case "irr-gender":
      state.person = base.names.irrGender;
      state.gender = base.state.gender === "f" ? "m" : "f";
      break;
    case "placebo-gender":
      state.person = base.names.placeboGender;
      break;
    case "irr-origin":
      state.person = base.names.irrOrigin;
      state.group = base.state.group === "de" ? "tr" : "de";
      break;
    case "placebo-origin":
      state.person = base.names.placeboOrigin;
      break;
    case "irr-insurance":
      state.insurance = base.state.insurance === "statutory" ? "private" : "statutory";
      break;
    case "placebo-insurance":
      state.ward = base.state.ward === "North" ? "South" : "North";
      break;
    case "irr-order":
      state.order = [d1, decisive, d2, ...rest];
      break;
    case "placebo-order":
      state.order = [decisive, d2, d1, ...rest];
      break;
  }
  return { state, reference, decisiveValue };
}

function fill(template: string, fields: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(fields)) out = out.split(`{${key}}`).join(value);
  return out;
}

function frameById<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find((entry) => entry.id === id);
  if (!found) throw new Error(`frames.json has no wording ${id}.`);
  return found;
}

export interface RenderInput {
  ruleText: string;
  state: CaseState;
  optionOrder: OptionOrder;
  letterOrder: LetterOrder;
  arm: Arm;
  frameIds: FrameIds;
}

/** Renders a prompt; the assistant prefix `Answer:` is added by the runner, not here. */
export function renderPrompt(input: RenderInput, frames: FramesFile = FRAMES): string {
  const [s1Id, s2Id, s3Id] = input.frameIds;
  const s1 = frameById(frames.S1, s1Id)[input.optionOrder];
  const s2 = frameById(frames.S2, s2Id).text;
  const values = input.state.order
    .map((key) => {
      const value = input.state.values[key];
      if (!value) throw new Error(`Missing case value ${key}.`);
      return value.text;
    })
    .join(". ");
  const lines = [
    fill(s1, { rule_text: input.ruleText }),
    fill(s2, {
      first: input.state.person.first,
      last: input.state.person.last,
      age: String(input.state.age),
      insurance: input.state.insurance,
      ward: input.state.ward,
      values,
    }),
  ];
  if (input.arm === "word") {
    lines.push(frameById(frames.S3word, s3Id).text);
    return lines.join("\n");
  }
  const s3 = frameById(frames.S3, s3Id);
  const [opt1, opt2] = optionContents(input.optionOrder);
  const [x1, x2] = lettersFor(input.letterOrder);
  lines.push(s3.head, `${x1}) ${opt1}`, `${x2}) ${opt2}`, s3.tail);
  return lines.join("\n");
}

export function optionContents(order: OptionOrder): [OptionContent, OptionContent] {
  return order === "ER" ? ["escalate", "routine"] : ["routine", "escalate"];
}

export function lettersFor(order: LetterOrder): [Letter, Letter] {
  return order === "AB" ? ["A", "B"] : ["B", "A"];
}

/** Letter on the line that carries `content`. */
export function letterOf(
  content: OptionContent,
  optionOrder: OptionOrder,
  letterOrder: LetterOrder
): Letter {
  const [opt1] = optionContents(optionOrder);
  const [x1, x2] = lettersFor(letterOrder);
  return content === opt1 ? x1 : x2;
}

interface PromptSpec {
  variant: Variant;
  optionOrder: OptionOrder;
  letterOrder: LetterOrder;
}

function promptSpecs(arm: Arm): PromptSpec[] {
  const specs: PromptSpec[] = [];
  if (arm === "main") {
    for (const variant of VARIANTS) {
      for (const optionOrder of ["ER", "RE"] as const) {
        specs.push({ variant, optionOrder, letterOrder: "AB" });
      }
    }
  } else if (arm === "decomp") {
    for (const variant of ["base", "decisive"] as const) {
      for (const optionOrder of ["ER", "RE"] as const) {
        specs.push({ variant, optionOrder, letterOrder: "BA" });
      }
    }
  } else {
    // Word arm: no option block, so letter_order carries no meaning and stays AB.
    for (const variant of ["base", "decisive"] as const) {
      specs.push({ variant, optionOrder: "ER", letterOrder: "AB" });
    }
  }
  return specs;
}

function frameIdsFor(base: BaseCase, variant: Variant, arm: Arm): FrameIds {
  const canonical = FRAMES.canonical;
  if (arm === "word") return [canonical.S1, canonical.S2, canonical.S3word];
  if (variant === "para1") return base.paraphrases[0];
  if (variant === "para2") return base.paraphrases[1];
  return [canonical.S1, canonical.S2, canonical.S3];
}

function toPromptItem(base: BaseCase, spec: PromptSpec, arm: Arm, split: Split): PromptItem {
  const { state, reference, decisiveValue } = variantCase(base, spec.variant);
  const frameIds = frameIdsFor(base, spec.variant, arm);
  const prompt = renderPrompt({
    ruleText: base.family.rule_text,
    state,
    optionOrder: spec.optionOrder,
    letterOrder: spec.letterOrder,
    arm,
    frameIds,
  });
  return {
    prompt_id: `${base.itemId}:${spec.variant}:${spec.optionOrder}:${spec.letterOrder}:${arm}`,
    item_id: base.itemId,
    family: base.family.id,
    split,
    stratum: base.cell.stratum,
    distance: base.distance,
    reference_content: reference,
    variant: spec.variant,
    option_order: spec.optionOrder,
    letter_order: spec.letterOrder,
    arm,
    reference_letter:
      arm === "word" ? null : letterOf(reference, spec.optionOrder, spec.letterOrder),
    frame_ids: frameIds,
    decisive_var: base.decisiveVar,
    decisive_value: decisiveValue,
    name_group: state.group,
    name_gender: state.gender,
    first: state.person.first,
    last: state.person.last,
    age: state.age,
    insurance: state.insurance,
    ward: state.ward,
    value_order: [...state.order],
    values: state.order.map((key) => state.values[key] as CaseValue),
    prompt,
    prompt_sha256: sha256Hex(prompt),
  };
}

/** Robustness subset: a seeded sample of base cases, kept in generation order. */
function robustSubset(bases: BaseCase[], options: GenerateOptions): BaseCase[] {
  const requested = options.robustN ?? DEFAULT_ROBUST_N;
  const n = Math.min(requested, bases.length);
  const rng = createRng(`${options.seed}|${options.split}|robust`);
  const chosen = new Set(rng.shuffle(bases.map((base) => base.itemId)).slice(0, n));
  return bases.filter((base) => chosen.has(base.itemId));
}

export function generate(options: GenerateOptions): GenerateResult {
  const arm = options.arm ?? "main";
  const families = familiesForSplit(options.split);
  const allBases = families.flatMap((family) => buildBaseCases(family, options));
  const bases = arm === "main" ? allBases : robustSubset(allBases, options);

  const specs = promptSpecs(arm);
  const items = bases.flatMap((base) =>
    specs.map((spec) => toPromptItem(base, spec, arm, options.split))
  );
  const jsonl = `${items.map((item) => JSON.stringify(item)).join("\n")}\n`;

  const cellBalance: Record<string, Record<string, number>> = {};
  for (const base of bases) {
    const perFamily = cellBalance[base.family.id] ?? {};
    cellBalance[base.family.id] = perFamily;
    const key = cellKey(base.cell);
    perFamily[key] = (perFamily[key] ?? 0) + 1;
  }

  const manifest: GenerateManifest = {
    generator: "paired-eval",
    generator_version: options.generatorVersion ?? null,
    split: options.split,
    seed: options.seed,
    arm,
    per_family: options.perFamily,
    robust_n: arm === "main" ? null : bases.length,
    robust_n_requested: arm === "main" ? null : (options.robustN ?? DEFAULT_ROBUST_N),
    count: items.length,
    items_sha256: sha256Hex(jsonl),
    frames_sha256: framesSha256(),
    canonical_frame_ids: { ...FRAMES.canonical },
    families: families.map((family) => family.id),
    cell_balance: cellBalance,
  };
  return { items, jsonl, manifest };
}
