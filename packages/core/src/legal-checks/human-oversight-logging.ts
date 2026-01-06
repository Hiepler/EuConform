/**
 * Article 12 + 14 – Logging & Human Oversight (templates + prompts for evidence)
 *
 * Output is intentionally operational/technical. It is not legal advice.
 */

import type { RiskLevel } from "../types";
import type { Citation } from "./bias-metrics";

export interface LoggingTemplate {
  retention: {
    recommendedMinimum: string;
    note: string;
  };
  fields: Array<{
    key: string;
    type: string;
    description: string;
    required: boolean;
  }>;
}

export interface HumanOversightRecommendation {
  level: RiskLevel;
  recommendations: string[];
  loggingTemplate: LoggingTemplate;
  sources: Citation[];
}

export function getHumanOversightAndLoggingTemplate(
  level: RiskLevel
): HumanOversightRecommendation {
  const sources: Citation[] = [
    { label: "EU AI Act", reference: "Verordnung (EU) 2024/1689" },
    { label: "Art. 14", reference: "Human oversight (wirksame Aufsicht, Override, Kompetenz)" },
    { label: "Art. 12", reference: "Logging / Ereignisprotokollierung (Nachvollziehbarkeit)" },
  ];

  const baseLogging: LoggingTemplate = {
    retention: {
      recommendedMinimum: "6 Monate (Template-Empfehlung)",
      note: "Aufbewahrungsdauer ist kontextabhängig; dieses Tool gibt keine Rechtsberatung.",
    },
    fields: [
      {
        key: "timestamp",
        type: "string (ISO-8601)",
        description: "Zeitpunkt der Entscheidung",
        required: true,
      },
      {
        key: "system_version",
        type: "string",
        description: "Modell/Artefakt-Version, Hash, Konfiguration",
        required: true,
      },
      {
        key: "input_reference",
        type: "string",
        description: "Referenz auf Input (pseudonymisiert/ID), nicht Rohdaten",
        required: true,
      },
      {
        key: "output",
        type: "object|string",
        description: "Systemoutput (Entscheidung/Score/Antwort)",
        required: true,
      },
      {
        key: "confidence",
        type: "number",
        description: "Konfidenz/Score falls vorhanden",
        required: false,
      },
      {
        key: "protected_attribute_proxy_used",
        type: "boolean",
        description: "Wurden Proxies für Fairness-Messung genutzt?",
        required: false,
      },
      {
        key: "human_review",
        type: "object",
        description: "Human-in-the-loop: reviewer_id, action, rationale",
        required: false,
      },
      {
        key: "override",
        type: "boolean",
        description: "Wurde die AI-Ausgabe überstimmt?",
        required: false,
      },
      {
        key: "override_reason",
        type: "string",
        description: "Begründung für Override",
        required: false,
      },
      {
        key: "appeal_or_complaint",
        type: "boolean",
        description: "Gab es Einspruch/Beschwerde?",
        required: false,
      },
      {
        key: "incident_flag",
        type: "boolean",
        description: "Incident/Anomaly markiert",
        required: false,
      },
    ],
  };

  const recs: Record<RiskLevel, string[]> = {
    unacceptable: [
      "System nicht deployen, bis Red-Flags geklärt sind (technischer Hinweis, keine Rechtsberatung).",
      "Dokumentieren: welche Art.-5-Red-Flags betroffen sind, welche Evidenzen dagegen/ dafür sprechen.",
    ],
    high: [
      "Human-in-the-loop bei allen hochwirksamen Entscheidungen: Review/Override möglich und praktisch nutzbar.",
      "Rollen/Kompetenzen dokumentieren: wer darf überstimmen, Schulung, Eskalationspfade.",
      "Monitoring + Incident-Response: Drift, Bias-Regression, Security, Fehlerraten nach Gruppen.",
      "Logging so gestalten, dass Post-hoc-Audit und Root-Cause-Analyse möglich sind (ohne unnötige personenbezogene Rohdaten).",
    ],
    limited: [
      "Transparenz im UX: Nutzer informieren, wann/wie AI beteiligt ist; klare Feedback-Kanäle.",
      "Stichprobenartige Human Review für Qualitäts-/Bias-Monitoring einplanen.",
    ],
    minimal: [
      "Gute Praxis: Versionierung, grundlegendes Logging (Fehler/Incidents) und periodische Qualitätschecks.",
    ],
  };

  return { level, recommendations: recs[level], loggingTemplate: baseLogging, sources };
}
