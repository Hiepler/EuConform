import type { Family, FamilyVariable, OptionContent } from "./types";

/** Distances are compared after rounding to this many digits so that 0.05 stays 0.05. */
const DISTANCE_DIGITS = 10;

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Number((Math.round(value * factor) / factor).toFixed(decimals));
}

export function formatValue(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/** True when the escalate condition of this single variable holds. */
export function conditionHolds(variable: FamilyVariable, value: number): boolean {
  switch (variable.op) {
    case ">":
      return value > variable.threshold;
    case "<":
      return value < variable.threshold;
    case ">=":
      return value >= variable.threshold;
    case "<=":
      return value <= variable.threshold;
    case "outside":
      return value < variable.threshold || value > requireHigh(variable);
  }
}

/** d = |v - threshold| / scale; the band logic measures to the nearest bound. */
export function distanceOf(variable: FamilyVariable, value: number): number {
  const raw =
    variable.op === "outside"
      ? Math.min(Math.abs(value - variable.threshold), Math.abs(value - requireHigh(variable)))
      : Math.abs(value - variable.threshold);
  return roundTo(raw / variable.scale, DISTANCE_DIGITS);
}

/**
 * The bound a value is mirrored at: the threshold, or for the band logic the nearer bound.
 * Returns null when a band value is equally far from both bounds (no unique mirror).
 */
export function mirrorBound(variable: FamilyVariable, value: number): number | null {
  if (variable.op !== "outside") return variable.threshold;
  const high = requireHigh(variable);
  const toLow = roundTo(Math.abs(value - variable.threshold), DISTANCE_DIGITS);
  const toHigh = roundTo(Math.abs(value - high), DISTANCE_DIGITS);
  if (toLow === toHigh) return null;
  return toLow < toHigh ? variable.threshold : high;
}

/**
 * Rule value of every rule variable, keyed by `variable.var`. Ratio families derive their
 * single rule variable from the two printed inputs.
 */
export function ruleValues(
  family: Family,
  printed: Record<string, number>
): Record<string, number> {
  if (family.logic === "ratio") {
    const [numerator, denominator] = requireInputs(family);
    const variable = requireVariable(family, 0);
    const num = requireValue(printed, numerator.var);
    const den = requireValue(printed, denominator.var);
    return { [variable.var]: num / den };
  }
  const out: Record<string, number> = {};
  for (const variable of family.variables) {
    out[variable.var] = requireValue(printed, variable.var);
  }
  return out;
}

/** Reference decision for a case, from the printed values alone. */
export function referenceContent(family: Family, printed: Record<string, number>): OptionContent {
  const values = ruleValues(family, printed);
  const holds = family.variables.map((variable) =>
    conditionHolds(variable, requireValue(values, variable.var))
  );
  let applies: boolean;
  if (family.logic === "and") applies = holds.every(Boolean);
  else if (family.logic === "or") applies = holds.some(Boolean);
  else applies = holds[0] === true;
  return applies ? "escalate" : "routine";
}

export function requireInputs(family: Family): NonNullable<Family["inputs"]> {
  if (!family.inputs) throw new Error(`Family ${family.id} has logic ratio but no inputs.`);
  return family.inputs;
}

export function requireVariable(family: Family, index: number): FamilyVariable {
  const variable = family.variables[index];
  if (!variable) throw new Error(`Family ${family.id} has no rule variable ${index}.`);
  return variable;
}

function requireHigh(variable: FamilyVariable): number {
  if (variable.threshold_high === undefined) {
    throw new Error(`Variable ${variable.var} uses op "outside" without threshold_high.`);
  }
  return variable.threshold_high;
}

function requireValue(values: Record<string, number>, key: string): number {
  const value = values[key];
  if (value === undefined) throw new Error(`Missing value for ${key}.`);
  return value;
}
