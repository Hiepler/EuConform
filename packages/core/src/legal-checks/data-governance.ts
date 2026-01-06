/**
 * Article 10(3–4) – Data Governance & Data Quality Checklist (evidence-oriented)
 *
 * This produces a structured checklist that can be included in Annex IV documentation.
 * It is not a legal determination.
 */

import type { Citation } from "./bias-metrics";

export type ChecklistStatus = "yes" | "no" | "partial" | "unknown";

export interface DataGovernanceChecklistItem {
  id: string;
  question: string;
  rationale: string;
  status: ChecklistStatus;
  evidence?: string;
  risksIfNo: string[];
}

export interface DataGovernanceChecklistResult {
  timestamp: string;
  items: DataGovernanceChecklistItem[];
  overall: {
    missingCriticalCount: number;
    notes: string[];
  };
  sources: Citation[];
}

export function runDataGovernanceChecklist(input: {
  statuses: Record<string, ChecklistStatus>;
  evidence?: Record<string, string>;
}): DataGovernanceChecklistResult {
  const sources: Citation[] = [
    { label: "EU AI Act", reference: "Verordnung (EU) 2024/1689" },
    {
      label: "Art. 10(3–4)",
      reference:
        "Data governance / data quality expectations (repräsentativ, fehlerarm, dokumentiert)",
    },
    {
      label: "Recital 54",
      reference: "Schutz vor Diskriminierung & historische Bias/Feedback-Loops",
    },
  ];

  const items: Omit<DataGovernanceChecklistItem, "status" | "evidence">[] = [
    {
      id: "representativeness",
      question:
        "Ist das Trainings-/Validierungsdataset für den vorgesehenen Einsatzkontext repräsentativ?",
      rationale:
        "Nicht-repräsentative Daten erhöhen Fehlerraten und können Diskriminierung verstärken (insb. unterrepräsentierte Gruppen).",
      risksIfNo: [
        "Systematische Fehlklassifikation für Teilpopulationen",
        "Disparate impact / unfaire Fehlerverteilung",
        "Fehlende Generalisierung im Deployment-Kontext",
      ],
    },
    {
      id: "data_quality_errors",
      question:
        "Sind Datenqualität (Fehler, Duplikate, Ausreißer, Missingness) gemessen und adressiert?",
      rationale:
        "Mess-/Label-Fehler und fehlende Daten sind häufige Ursachen für Bias und Instabilität in Modellen.",
      risksIfNo: [
        "Verzerrte Lernsignale und spurious correlations",
        "Instabile Performance bei Drift",
        "Unklare Fehlerursachen im Incident-Fall",
      ],
    },
    {
      id: "labeling_process",
      question:
        "Ist der Labeling-/Annotation- und QA-Prozess dokumentiert (Guidelines, Inter-Annotator Agreement)?",
      rationale:
        "Reproduzierbarkeit und Auditierbarkeit hängen von nachvollziehbarer Annotation ab.",
      risksIfNo: [
        "Nicht-reproduzierbare Labels",
        "Bias durch uneinheitliche Annotation",
        "Schwierige Fehleranalyse im Betrieb",
      ],
    },
    {
      id: "sensitive_attributes_handling",
      question:
        "Ist der Umgang mit sensiblen Attributen (z. B. Geschlecht, Ethnie, Alter, Behinderung, Religion, sexuelle Orientierung) definiert und begründet?",
      rationale:
        "Für Bias-Analysen sind Gruppenproxies/Attribute oft nötig; zugleich müssen Verarbeitung und Minimierung begründet und dokumentiert werden.",
      risksIfNo: [
        "Bias bleibt unmessbar / unsichtbar",
        "Fehlende Nachvollziehbarkeit der Fairness-Tests",
        "Unklare Proxy-Risiken und Messfehler",
      ],
    },
    {
      id: "feedback_loops",
      question: "Sind historische Bias und mögliche Feedback-Loops identifiziert und mitigiert?",
      rationale:
        "Modelle können bestehende Ungleichheiten verstärken, wenn Outputs in die Datenerzeugung zurückfließen.",
      risksIfNo: [
        "Self-fulfilling bias / reinforcement",
        "Verschlechterung über Zeit trotz kurzfristiger Performance",
        "Fehlender Nachweis wirksamer Mitigation",
      ],
    },
    {
      id: "dataset_documentation",
      question:
        "Existiert eine Dataset-Dokumentation (Herkunft, Zeiträume, Lizenz, Sampling, Preprocessing, Versionierung, Known Limitations)?",
      rationale:
        "Annex-IV-fähige Dokumentation erfordert nachvollziehbare Datenherkunft und Versionsstände.",
      risksIfNo: [
        "Nicht-auditierbare Datenpipeline",
        "Unklare Lizenz-/Nutzungsrisiken",
        "Nicht reproduzierbare Trainingsläufe",
      ],
    },
  ];

  const evidence = input.evidence ?? {};
  const built: DataGovernanceChecklistItem[] = items.map((it) => ({
    ...it,
    status: input.statuses[it.id] ?? "unknown",
    evidence: evidence[it.id],
  }));

  const missingCriticalCount = built.filter(
    (i) => i.status === "no" || i.status === "unknown"
  ).length;
  const notes: string[] = [];
  if (missingCriticalCount > 0) {
    notes.push(
      "Mehrere Data-Governance-Punkte sind offen/negativ. Für Annex-IV-Dokumentation sollten Evidenzen, Messmethoden und Mitigationen ergänzt werden."
    );
  }
  notes.push(
    "Hinweis: Historische Bias und Feedback-Loops sollten explizit beschrieben und mit Monitoring adressiert werden."
  );

  return {
    timestamp: new Date().toISOString(),
    items: built,
    overall: { missingCriticalCount, notes },
    sources,
  };
}
