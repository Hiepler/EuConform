/**
 * Annex III (EU AI Act 2024/1689) High-Risk Classifier
 *
 * Implements:
 * - Article 6–7: risk classification logic (high-risk if any Annex III category applies)
 * - Annex III: 8 high-risk categories (questionnaire)
 * - Article 5: optional prohibited-AI “red flag” screening (informational only)
 *
 * IMPORTANT: This module provides technical orientation, not legal advice.
 */

import type { HighRiskCategory, QuizAnswer, QuizQuestion, RiskFlag, RiskLevel } from "../types";

export type AnnexIIIAnswer = "yes" | "no" | "unsure";

export interface AnnexIIIRiskResult {
  level: RiskLevel;
  matchedCategories: HighRiskCategory[];
  prohibitedFlags: RiskFlag[];
  legalBasis: string[];
  notes: string[];
}

/**
 * Exactly the 8 Annex III high-risk categories as a yes/no questionnaire.
 * If any answer is "yes" -> high-risk.
 *
 * NOTE: The wording is intentionally neutral and evidence-oriented.
 */
export const ANNEX_III_QUESTIONS: QuizQuestion[] = [
  {
    id: "annexIII-biometric-identification",
    question: "Annex III: Biometrische Identifizierung/Kategorisierung?",
    description:
      "Wird das System für biometrische Identifizierung oder biometrische Kategorisierung von natürlichen Personen eingesetzt (z. B. Gesicht, Stimme, Gang)?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "annexIII-critical-infrastructure",
    question: "Annex III: Kritische Infrastruktur?",
    description:
      "Wird das System für Betrieb/Management kritischer Infrastruktur eingesetzt (z. B. Energie, Wasser, Verkehr), wo Fehlfunktionen Leben/Gesundheit gefährden können?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "annexIII-education-training",
    question: "Annex III: Bildung & berufliche Ausbildung?",
    description:
      "Unterstützt das System Entscheidungen in Bildung/Training (z. B. Zulassung, Bewertung, Prüfung), die den Bildungsweg wesentlich beeinflussen?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "annexIII-employment-workers",
    question: "Annex III: Beschäftigung/Recruiting/Worker Management?",
    description:
      "Wird das System in Recruiting, Personalentscheidungen, Leistungsbewertung oder Arbeitssteuerung eingesetzt (mit erheblichem Einfluss auf Beschäftigte/Bewerbende)?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "annexIII-essential-services",
    question: "Annex III: Zugang zu wesentlichen Diensten/Vorteilen?",
    description:
      "Wird das System für Zugang/Anspruch/Preisgestaltung wesentlicher privater/öffentlicher Dienste genutzt (z. B. Kredit, Versicherung, Sozialleistungen, Gesundheitsversorgung)?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "annexIII-law-enforcement",
    question: "Annex III: Strafverfolgung?",
    description:
      "Wird das System in Strafverfolgung eingesetzt (z. B. Risiko-/Gefährdungsbewertung, Beweismittelanalyse, Priorisierung von Ermittlungen)?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "annexIII-migration-asylum",
    question: "Annex III: Migration/Asyl/Grenzkontrolle?",
    description:
      "Wird das System in Migration, Asyl oder Grenzkontrolle eingesetzt (z. B. Risiko-/Eligibility-Bewertungen, Dokumentenprüfung, Priorisierung)?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "annexIII-justice-democracy",
    question: "Annex III: Justiz & demokratische Prozesse?",
    description:
      "Wird das System in der Rechtspflege oder demokratischen Prozessen eingesetzt (z. B. gerichtliche/administrative Entscheidungen, Unterstützung von Rechtsanwendung)?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "high" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
];

const QUESTION_ID_TO_CATEGORY: Record<string, HighRiskCategory> = {
  "annexIII-biometric-identification": "biometric-identification",
  "annexIII-critical-infrastructure": "critical-infrastructure",
  "annexIII-education-training": "education-training",
  "annexIII-employment-workers": "employment-workers",
  "annexIII-essential-services": "essential-services",
  "annexIII-law-enforcement": "law-enforcement",
  "annexIII-migration-asylum": "migration-asylum",
  "annexIII-justice-democracy": "justice-democracy",
};

/**
 * Optional “red-flag” screening for potential Article 5 prohibited practices.
 * This is NOT exhaustive and is not a legal determination.
 */
export const PROHIBITED_AI_SCREENING_QUESTIONS: QuizQuestion[] = [
  {
    id: "art5-subliminal",
    question: "Art. 5: Subliminale/manipulative Techniken?",
    description:
      "Nutzen Sie Techniken außerhalb des Bewusstseins, um Verhalten zu manipulieren, sodass Personen (voraussichtlich) Schaden erleiden könnten?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "unacceptable" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "art5-vulnerability",
    question: "Art. 5: Ausnutzung von Vulnerabilität?",
    description:
      "Zielt das System darauf ab, Vulnerabilitäten (z. B. Alter, Behinderung, soziale/ökonomische Lage) auszunutzen, sodass (voraussichtlich) Schaden entsteht?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "unacceptable" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "art5-social-scoring",
    question: "Art. 5: Social Scoring durch öffentliche Stellen?",
    description:
      "Wird (oder würde) das System für Social Scoring durch öffentliche Stellen eingesetzt, das zu nachteiliger Behandlung führt?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "unacceptable" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
  {
    id: "art5-rbi",
    question: "Art. 5: Echtzeit-RBI im öffentlichen Raum ohne Rechtsgrundlage?",
    description:
      "Nutzen Sie Echtzeit-Fernbiometrie-Identifizierung im öffentlichen Raum ohne die dafür vorgesehenen engen Voraussetzungen?",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "unacceptable" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Unklar", riskIndicator: "limited" },
    ],
  },
];

export function getAnnexIIIQuestions(): QuizQuestion[] {
  return ANNEX_III_QUESTIONS;
}

export function getProhibitedAIScreeningQuestions(): QuizQuestion[] {
  return PROHIBITED_AI_SCREENING_QUESTIONS;
}

export function classifyAnnexIIIRisk(answers: QuizAnswer[]): AnnexIIIRiskResult {
  const prohibitedFlags = detectProhibitedRedFlags(answers);
  const matchedCategories: HighRiskCategory[] = [];

  for (const a of answers) {
    const cat = QUESTION_ID_TO_CATEGORY[a.questionId];
    if (!cat) continue;
    if (a.value === "yes") matchedCategories.push(cat);
  }

  const isHighRisk = matchedCategories.length > 0;
  const legalBasis: string[] = [];
  const notes: string[] = [];

  if (prohibitedFlags.length > 0) {
    legalBasis.push("Verordnung (EU) 2024/1689 – Art. 5 (Prohibited AI)");
    notes.push(
      "Hinweis: Art.-5-Flags sind ein technischer Red-Flag-Screen. Für eine rechtsverbindliche Einordnung ist eine eigenständige Prüfung erforderlich."
    );
  }

  if (isHighRisk) {
    legalBasis.push("Verordnung (EU) 2024/1689 – Art. 6–7 (Risikoklassifizierung)");
    legalBasis.push("Verordnung (EU) 2024/1689 – Annex III (High-Risk Use Cases)");
    notes.push(
      "Logik: Wenn mindestens eine Annex-III-Kategorie zutrifft (Antwort 'Ja'), wird das System hier als High-Risk eingestuft (technische Orientierung)."
    );
    notes.push(
      "Zeitplan-Hinweis: High-Risk-Pflichten treten gestaffelt in Kraft (u. a. ab 2027). Bitte aktuelle Umsetzungsfristen/Guidance prüfen."
    );
  }

  // This module focuses on Annex III vs. not. “limited” is used for “unsure” signals.
  const anyUnsure = answers.some(
    (a) =>
      a.value === "unsure" &&
      (a.questionId in QUESTION_ID_TO_CATEGORY || a.questionId.startsWith("art5-"))
  );

  const level: RiskLevel =
    prohibitedFlags.length > 0
      ? "unacceptable"
      : isHighRisk
        ? "high"
        : anyUnsure
          ? "limited"
          : "minimal";

  return {
    level,
    matchedCategories,
    prohibitedFlags,
    legalBasis,
    notes,
  };
}

function detectProhibitedRedFlags(answers: QuizAnswer[]): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const byId = new Map(answers.map((a) => [a.questionId, a.value] as const));

  if (byId.get("art5-subliminal") === "yes") {
    flags.push({
      type: "critical",
      message:
        "Möglicher Art.-5-Red-Flag: subliminale/manipulative Techniken mit Schädigungspotential.",
      articleReference: "Art. 5",
    });
  }
  if (byId.get("art5-vulnerability") === "yes") {
    flags.push({
      type: "critical",
      message: "Möglicher Art.-5-Red-Flag: Ausnutzung von Vulnerabilität mit Schädigungspotential.",
      articleReference: "Art. 5",
    });
  }
  if (byId.get("art5-social-scoring") === "yes") {
    flags.push({
      type: "critical",
      message:
        "Möglicher Art.-5-Red-Flag: Social Scoring (öffentliche Stellen) mit nachteiliger Behandlung.",
      articleReference: "Art. 5",
    });
  }
  if (byId.get("art5-rbi") === "yes") {
    flags.push({
      type: "critical",
      message:
        "Möglicher Art.-5-Red-Flag: Echtzeit-Fernbiometrie-Identifizierung im öffentlichen Raum ohne enge Voraussetzungen.",
      articleReference: "Art. 5",
    });
  }

  return flags;
}
