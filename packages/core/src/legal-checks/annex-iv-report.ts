/**
 * Annex IV – Technical Documentation Report Builder (structured JSON)
 *
 * Provides a strict section structure (1–7) matching the requested outline:
 *  1. Allgemeine Beschreibung
 *  2. Design-Spezifikationen
 *  3. Datenmanagement
 *  4. Risikomanagement & Mitigation
 *  5. Performance & Fairness-Metriken
 *  6. Human Oversight
 *  7. Technische Dokumentation
 *
 * IMPORTANT: This is a documentation scaffold to support a user's own conformity assessment.
 * It is not legal advice and not a legal determination of compliance.
 */

import type { BiasCalculationMethod, BiasTestResult, RiskLevel } from "../types";
import type { Citation } from "./bias-metrics";
import type { DataGovernanceChecklistResult } from "./data-governance";
import type { HumanOversightRecommendation } from "./human-oversight-logging";
import type { AnnexIIIRiskResult } from "./risk-classifier";

export interface AnnexIVStructuredReportV1 {
  meta: {
    reportVersion: "annex-iv.v1";
    generatedAt: string;
    tool: { name: string; version?: string };
    disclaimer: string;
    legalSources: Citation[];
    reproducibility: {
      seed?: number;
      notes: string[];
    };
  };
  section1_generalDescription: {
    provider: { name: string; address?: string; contact?: string };
    system: {
      name: string;
      intendedPurpose: string;
      deploymentContext?: string;
      userGroups?: string[];
      riskLevel: RiskLevel;
      annexIII: AnnexIIIRiskResult;
    };
  };
  section2_designSpecifications: {
    architecture?: string;
    modelType?: string;
    interfaces?: { inputs?: string; outputs?: string };
    assumptionsAndLimitations?: string[];
  };
  section3_dataManagement: {
    datasets?: Array<{
      name: string;
      description?: string;
      timeframe?: string;
      license?: string;
      preprocessing?: string;
      version?: string;
      knownLimitations?: string[];
    }>;
    dataGovernanceChecklist?: DataGovernanceChecklistResult;
  };
  section4_riskManagementAndMitigation: {
    processDescription?: string;
    identifiedRisks?: string[];
    mitigations?: string[];
    monitoringPlan?: string[];
  };
  section5_performanceAndFairness: {
    performanceMetrics?: Array<{ name: string; value: number | string; notes?: string }>;
    biasAndFairness?: Array<BiasTestResult | unknown>;
    biasMethodology?: {
      method: BiasCalculationMethod;
      engine: "browser" | "ollama";
      dataset: string;
      citation: string;
      description: string;
    };
    thresholdsAndInterpretationNotes: string[];
  };
  section6_humanOversight: {
    humanOversight?: HumanOversightRecommendation;
    loggingNotes?: string[];
  };
  section7_technicalDocumentation: {
    artifacts?: Array<{ name: string; description?: string; location?: string }>;
    changeLog?: Array<{ date: string; change: string }>;
    references: Citation[];
  };
}

export function buildAnnexIVReportV1(input: {
  provider: AnnexIVStructuredReportV1["section1_generalDescription"]["provider"];
  system: Omit<AnnexIVStructuredReportV1["section1_generalDescription"]["system"], "riskLevel"> & {
    riskLevel: RiskLevel;
  };
  legalSources: Citation[];
  reproducibility?: AnnexIVStructuredReportV1["meta"]["reproducibility"];
  design?: AnnexIVStructuredReportV1["section2_designSpecifications"];
  dataManagement?: AnnexIVStructuredReportV1["section3_dataManagement"];
  riskManagement?: AnnexIVStructuredReportV1["section4_riskManagementAndMitigation"];
  performanceAndFairness?: AnnexIVStructuredReportV1["section5_performanceAndFairness"];
  humanOversight?: AnnexIVStructuredReportV1["section6_humanOversight"];
  technicalDocumentation?: Partial<AnnexIVStructuredReportV1["section7_technicalDocumentation"]>;
  biasMethodology?: AnnexIVStructuredReportV1["section5_performanceAndFairness"]["biasMethodology"];
  tool?: { name: string; version?: string };
  disclaimer?: string;
}): AnnexIVStructuredReportV1 {
  const generatedAt = new Date().toISOString();

  return {
    meta: {
      reportVersion: "annex-iv.v1",
      generatedAt,
      tool: input.tool ?? { name: "AImpact" },
      disclaimer:
        input.disclaimer ??
        "This tool provides technical assistance and guidance. The results do not replace a legally binding conformity assessment by a notified body or legal advice.",
      legalSources: input.legalSources,
      reproducibility: input.reproducibility ?? {
        notes: ["Alle stichprobenbasierten Tests sollten Seed/Versionen dokumentieren."],
      },
    },
    section1_generalDescription: {
      provider: input.provider,
      system: {
        ...input.system,
        riskLevel: input.system.riskLevel,
      },
    },
    section2_designSpecifications: input.design ?? {
      assumptionsAndLimitations: [
        "Dieses Report-Gerüst ersetzt keine vollständige technische Dokumentation; ergänzen Sie modell- und domänenspezifische Details.",
      ],
    },
    section3_dataManagement: input.dataManagement ?? {},
    section4_riskManagementAndMitigation: input.riskManagement ?? {},
    section5_performanceAndFairness: {
      ...(input.performanceAndFairness ?? {
        thresholdsAndInterpretationNotes: [
          "Thresholds in diesem Tool sind als technische Screening-Indikatoren markiert; sie sind keine Rechts- oder Compliance-Schwellenwerte.",
          "Disparate Impact < 0.8 gilt als Indiz für potenzielle Diskriminierung (weitere Prüfung empfohlen).",
        ],
      }),
      biasMethodology: input.biasMethodology,
    },
    section6_humanOversight: input.humanOversight ?? {},
    section7_technicalDocumentation: {
      artifacts: input.technicalDocumentation?.artifacts ?? [],
      changeLog: input.technicalDocumentation?.changeLog ?? [
        { date: generatedAt.slice(0, 10), change: "Report generated" },
      ],
      references: input.technicalDocumentation?.references ?? input.legalSources,
    },
  };
}
