/**
 * GPAI / Foundation Model Compliance Classifier
 * Based on EU AI Act (Regulation EU 2024/1689) – Art. 53–55 + Art. 51 + Art. 71
 *
 * Obligations enforceable since August 2, 2025 (Phase 2, Art. 113(2)).
 *
 * IMPORTANT: This module provides technical orientation, not legal advice.
 */

import type { QuizAnswer, QuizQuestion } from "../types";

/** The specific obligations checked under Art. 53–55 */
export type GPAIObligationType =
  | "technical-docs"
  | "downstream-info"
  | "copyright-policy"
  | "eu-database"
  | "open-source"
  | "systemic-risk"
  | "red-teaming"
  | "incident-reporting"
  | "cybersecurity";

/** Overall compliance determination */
export type GPAIComplianceLevel = "compliant" | "partial" | "non-compliant";

/** A specific obligation that is missing or only partially met */
export interface GPAIComplianceFlag {
  obligation: GPAIObligationType;
  status: "missing" | "partial";
  articleRef: string;
}

/** Full result of GPAI compliance classification */
export interface GPAIComplianceResult {
  level: GPAIComplianceLevel;
  isSystemicRisk: boolean;
  flags: GPAIComplianceFlag[];
  legalBasis: string[];
  notes: string[];
}

/**
 * The 9 GPAI compliance questions (Art. 53–55).
 * Order matters: q1–q9 map to i18n keys gpai_q1–gpai_q9.
 */
export const GPAI_QUESTIONS: QuizQuestion[] = [
  {
    id: "gpai-technical-docs",
    question: "Art. 53(1)(a): Technical documentation (Annex XI/XII)?",
    description:
      "Have you prepared and maintain up-to-date technical documentation for the GPAI model per Annex XI/XII (general-purpose) or the systemic-risk extension?",
    options: [
      { value: "yes", label: "Yes, implemented" },
      { value: "no", label: "No, missing" },
      { value: "unsure", label: "In progress / unsure" },
    ],
  },
  {
    id: "gpai-downstream-info",
    question: "Art. 53(1)(b): Downstream provider information?",
    description:
      "Do you provide downstream providers / deployers with the information they need to comply with their own EU AI Act obligations (capabilities, limitations, intended use)?",
    options: [
      { value: "yes", label: "Yes, implemented" },
      { value: "no", label: "No, missing" },
      { value: "unsure", label: "In progress / unsure" },
    ],
  },
  {
    id: "gpai-copyright-policy",
    question: "Art. 53(1)(c–d): Copyright policy + training data summary?",
    description:
      "Have you established a copyright compliance policy (Art. 53(1)(c)) and published a sufficiently detailed training data summary for copyright purposes (Art. 53(1)(d))?",
    options: [
      { value: "yes", label: "Yes, implemented" },
      { value: "no", label: "No, missing" },
      { value: "unsure", label: "In progress / unsure" },
    ],
  },
  {
    id: "gpai-eu-database",
    question: "Art. 71: EU AI Database registration?",
    description:
      "Is the GPAI model registered in the EU AI Database as required under Art. 71 (providers of GPAI models must register before placing the model on the EU market)?",
    options: [
      { value: "yes", label: "Yes, registered" },
      { value: "no", label: "No, not registered" },
      { value: "unsure", label: "In progress / unsure" },
    ],
  },
  {
    id: "gpai-open-source",
    question: "Art. 53(2): Open-source model release?",
    description:
      "Is the model released as open source with weights publicly available? Open-source GPAI models are exempt from Art. 53(1)(a–c) obligations (technical docs, downstream info, copyright policy) but not from Art. 53(1)(d) (training data summary) or Art. 55 systemic-risk obligations.",
    options: [
      { value: "yes", label: "Yes, open source" },
      { value: "no", label: "No, proprietary" },
      { value: "unsure", label: "Unsure / partially open" },
    ],
  },
  {
    id: "gpai-systemic-risk",
    question: "Art. 51 + Annex XIII: Trained with ≥ 10²⁵ FLOP?",
    description:
      "Was the model trained using compute exceeding 10²⁵ floating-point operations (FLOP)? Models at or above this threshold are designated as GPAI models with systemic risk (Art. 51) and are subject to the additional Art. 55 obligations below.",
    options: [
      { value: "yes", label: "Yes (systemic risk)" },
      { value: "no", label: "No (below threshold)" },
      { value: "unsure", label: "Unknown / unsure" },
    ],
  },
  {
    id: "gpai-red-teaming",
    question: "Art. 55(1)(a): Adversarial testing / red-teaming?",
    description:
      "Have you conducted model evaluations, adversarial testing, and red-teaming to identify and mitigate systemic risks (required only for Art. 51 systemic-risk models)?",
    options: [
      { value: "yes", label: "Yes, conducted" },
      { value: "no", label: "No, not done" },
      { value: "unsure", label: "In progress / unsure" },
    ],
  },
  {
    id: "gpai-incident-reporting",
    question: "Art. 55(1)(b): Serious incident reporting mechanisms?",
    description:
      "Do you have mechanisms to track, document, and report serious incidents caused by the GPAI model to the AI Office and affected national authorities (required only for Art. 51 systemic-risk models)?",
    options: [
      { value: "yes", label: "Yes, in place" },
      { value: "no", label: "No, missing" },
      { value: "unsure", label: "In progress / unsure" },
    ],
  },
  {
    id: "gpai-cybersecurity",
    question: "Art. 55(1)(c): Cybersecurity measures?",
    description:
      "Have you implemented adequate cybersecurity protections for the GPAI model and its infrastructure, including adversarial robustness measures (required only for Art. 51 systemic-risk models)?",
    options: [
      { value: "yes", label: "Yes, implemented" },
      { value: "no", label: "No, missing" },
      { value: "unsure", label: "In progress / unsure" },
    ],
  },
];

/** Returns the full ordered list of GPAI compliance questions */
export function getGPAIQuestions(): QuizQuestion[] {
  return GPAI_QUESTIONS;
}

/** Returns true if the model meets the systemic risk threshold (Art. 51) */
export function isSystemicRiskModel(answers: QuizAnswer[]): boolean {
  const systemicAnswer = answers.find((a) => a.questionId === "gpai-systemic-risk");
  return systemicAnswer?.value === "yes";
}

/** Push a flag if the answer value is "no" or "unsure" */
function checkObligation(
  value: string | undefined,
  obligation: GPAIObligationType,
  articleRef: string,
  flags: GPAIComplianceFlag[]
): void {
  if (value === "no") {
    flags.push({ obligation, status: "missing", articleRef });
  } else if (value === "unsure") {
    flags.push({ obligation, status: "partial", articleRef });
  }
}

/** Evaluate Art. 53 obligations and populate flags / notes */
function evaluateArt53Obligations(
  byId: Map<string, string>,
  isOpenSource: boolean,
  flags: GPAIComplianceFlag[],
  legalBasis: string[],
  notes: string[]
): void {
  if (!isOpenSource) {
    checkObligation(byId.get("gpai-technical-docs"), "technical-docs", "Art. 53(1)(a)", flags);
    checkObligation(byId.get("gpai-downstream-info"), "downstream-info", "Art. 53(1)(b)", flags);
    checkObligation(
      byId.get("gpai-copyright-policy"),
      "copyright-policy",
      "Art. 53(1)(c–d)",
      flags
    );
  } else {
    // Open-source: Art. 53(1)(a–c) exempt, but training data summary (Art. 53(1)(d)) still applies
    const copyrightVal = byId.get("gpai-copyright-policy");
    checkObligation(copyrightVal, "copyright-policy", "Art. 53(1)(d)", flags);
    if (copyrightVal === "no" || copyrightVal === "unsure") {
      notes.push(
        "Open-source models are exempt from Art. 53(1)(c) copyright policy obligations, but Art. 53(1)(d) training data summary still applies."
      );
    }
  }

  const euDatabase = byId.get("gpai-eu-database");
  checkObligation(euDatabase, "eu-database", "Art. 71", flags);
  if (euDatabase === "no") {
    legalBasis.push("Verordnung (EU) 2024/1689 – Art. 71 (EU AI Database)");
  }
}

/** Evaluate Art. 55 systemic risk obligations and populate flags */
function evaluateArt55Obligations(
  byId: Map<string, string>,
  flags: GPAIComplianceFlag[],
  legalBasis: string[]
): void {
  legalBasis.push("Verordnung (EU) 2024/1689 – Art. 51 + Art. 55 (Systemic Risk)");
  legalBasis.push("Verordnung (EU) 2024/1689 – Annex XIII (Systemic Risk Indicators)");
  checkObligation(byId.get("gpai-red-teaming"), "red-teaming", "Art. 55(1)(a)", flags);
  checkObligation(
    byId.get("gpai-incident-reporting"),
    "incident-reporting",
    "Art. 55(1)(b)",
    flags
  );
  checkObligation(byId.get("gpai-cybersecurity"), "cybersecurity", "Art. 55(1)(c)", flags);
}

/** Determine overall compliance level from accumulated flags */
function determineLevel(flags: GPAIComplianceFlag[], isOpenSource: boolean): GPAIComplianceLevel {
  const criticalObligations: GPAIObligationType[] = isOpenSource
    ? ["eu-database"]
    : ["technical-docs", "downstream-info", "copyright-policy", "eu-database"];

  const allCriticalMissing =
    !isOpenSource &&
    criticalObligations.every((obl) =>
      flags.some((f) => f.obligation === obl && f.status === "missing")
    );

  if (allCriticalMissing) return "non-compliant";
  if (flags.length > 0) return "partial";
  return "compliant";
}

/**
 * Classify GPAI compliance based on answers to the 9 questions.
 * Returns a GPAIComplianceResult with level, flags, and legal basis.
 *
 * Classification logic:
 * - Open-source (Art. 53(2)): exempt from docs/downstream/copyright obligations
 * - Systemic risk (Art. 51): Art. 55 obligations apply
 * - Critical Art. 53 all missing → "non-compliant"
 * - Any "unsure" or partial → "partial"
 * - All applicable "yes" → "compliant"
 */
export function classifyGPAICompliance(answers: QuizAnswer[]): GPAIComplianceResult {
  const byId = new Map(answers.map((a) => [a.questionId, a.value] as const));
  const isOpenSource = byId.get("gpai-open-source") === "yes";
  const hasSystemicRisk = byId.get("gpai-systemic-risk") === "yes";

  const flags: GPAIComplianceFlag[] = [];
  const legalBasis: string[] = ["Verordnung (EU) 2024/1689 – Art. 53 (GPAI obligations)"];
  const notes: string[] = [];

  evaluateArt53Obligations(byId, isOpenSource, flags, legalBasis, notes);

  if (hasSystemicRisk) {
    evaluateArt55Obligations(byId, flags, legalBasis);
  } else {
    notes.push(
      "Art. 55 systemic risk obligations (red-teaming, incident reporting, cybersecurity) are not applicable as the model does not meet the Art. 51 threshold (≥ 10²⁵ FLOP)."
    );
  }

  return {
    level: determineLevel(flags, isOpenSource),
    isSystemicRisk: hasSystemicRisk,
    flags,
    legalBasis,
    notes,
  };
}
