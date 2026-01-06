/**
 * Articles 15 + 13 (+ Art. 53 for GPAI transparency hints) – Robustness & Transparency checks
 *
 * This module provides simple, reproducible perturbation tests and reporting scaffolding.
 * It is not a legal determination.
 */

import type { Citation } from "./bias-metrics";

export interface Perturbation {
  id: string;
  description: string;
  apply: (input: string) => string;
}

export interface RobustnessTestCase {
  id: string;
  input: string;
}

export interface RobustnessResult {
  timestamp: string;
  seed: number;
  cases: Array<{
    caseId: string;
    perturbationId: string;
    original: string;
    perturbed: string;
    predictionChanged: boolean;
  }>;
  summary: {
    total: number;
    changed: number;
    flipRate: number;
    thresholdFlipRate: number;
    passed: boolean;
  };
  sources: Citation[];
}

export type PredictTextFn = (
  input: string
) => Promise<string | number | boolean> | string | number | boolean;

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultTextPerturbations(seed: number): Perturbation[] {
  const rng = mulberry32(seed);
  const swapAdjacent = (s: string) => {
    if (s.length < 2) return s;
    const i = Math.floor(rng() * (s.length - 1));
    const arr = s.split("");
    const a = arr[i];
    const b = arr[i + 1];
    if (a === undefined || b === undefined) return s;
    [arr[i], arr[i + 1]] = [b, a];
    return arr.join("");
  };

  const deleteChar = (s: string) => {
    if (s.length < 2) return s;
    const i = Math.floor(rng() * s.length);
    return s.slice(0, i) + s.slice(i + 1);
  };

  const addWhitespaceNoise = (s: string) => s.replace(/\s+/g, "  ");

  return [
    {
      id: "typo_swap",
      description: "Vertausche zwei benachbarte Zeichen (Typo)",
      apply: swapAdjacent,
    },
    { id: "typo_delete", description: "Lösche ein zufälliges Zeichen (Typo)", apply: deleteChar },
    { id: "whitespace", description: "Whitespace-Noise", apply: addWhitespaceNoise },
  ];
}

export async function runTextPerturbationRobustnessTest(params: {
  seed?: number;
  cases: RobustnessTestCase[];
  perturbations?: Perturbation[];
  predict: PredictTextFn;
  thresholdFlipRate?: number;
}): Promise<RobustnessResult> {
  const seed = params.seed ?? 42;
  const perturbations = params.perturbations ?? defaultTextPerturbations(seed);
  const thresholdFlipRate = params.thresholdFlipRate ?? 0.1;

  const sources: Citation[] = [
    { label: "EU AI Act", reference: "Verordnung (EU) 2024/1689" },
    {
      label: "Art. 15",
      reference: "Robustheit, Genauigkeit, Cybersecurity (einfache Robustheits-Screenings)",
    },
    {
      label: "Art. 13",
      reference: "Transparenz/Informationen für Nutzer (kommuniziere Grenzen & Testmethoden)",
    },
    {
      label: "Art. 53 (GPAI)",
      reference: "Transparenzhinweise für GPAI (wenn anwendbar) – Orientierung",
    },
  ];

  const out: RobustnessResult["cases"] = [];
  let changed = 0;

  for (const c of params.cases) {
    const originalPred = await params.predict(c.input);

    for (const p of perturbations) {
      const perturbed = p.apply(c.input);
      const perturbedPred = await params.predict(perturbed);

      const predictionChanged = normalizeOutput(originalPred) !== normalizeOutput(perturbedPred);
      if (predictionChanged) changed++;

      out.push({
        caseId: c.id,
        perturbationId: p.id,
        original: c.input,
        perturbed,
        predictionChanged,
      });
    }
  }

  const total = out.length;
  const flipRate = total === 0 ? 0 : changed / total;
  const passed = flipRate <= thresholdFlipRate;

  return {
    timestamp: new Date().toISOString(),
    seed,
    cases: out,
    summary: {
      total,
      changed,
      flipRate: Number(flipRate.toFixed(4)),
      thresholdFlipRate,
      passed,
    },
    sources,
  };
}

function normalizeOutput(v: unknown): string {
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v >= 0.5 ? 1 : 0);
  if (typeof v === "string") return v.trim().toLowerCase();
  return JSON.stringify(v);
}
