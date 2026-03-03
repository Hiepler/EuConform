/**
 * EU AI Act Compliance Deadline Timeline
 * Based on Regulation (EU) 2024/1689, Article 113
 *
 * Non-legal-advice: These dates are extracted from the official regulation text
 * and publicly available EU Commission sources. Always verify with legal counsel.
 */

import type { RiskLevel } from "../types";

export type DeadlineStatus = "past" | "imminent" | "upcoming" | "future";

export type AffectedAudience =
  | "all"
  | "prohibited"
  | "gpai"
  | "high-annex-iii"
  | "high-annex-i"
  | "limited"
  | "minimal";

export interface DeadlineObligation {
  titleKey: string;
  articleRef: string;
  audiences: AffectedAudience[];
  maxPenalty?: string;
  proposed?: boolean;
}

export interface DeadlinePhase {
  id: string;
  isoDate: string;
  chapterRef: string;
  titleKey: string;
  subtitleKey: string;
  obligations: DeadlineObligation[];
  status?: DeadlineStatus;
  proposed?: boolean;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getDeadlineStatus(isoDate: string, nowMs = Date.now()): DeadlineStatus {
  const diffDays = (new Date(isoDate).getTime() - nowMs) / MS_PER_DAY;
  if (diffDays < 0) return "past";
  if (diffDays <= 90) return "imminent";
  if (diffDays <= 365) return "upcoming";
  return "future";
}

export function getDaysUntilDeadline(isoDate: string, nowMs = Date.now()): number {
  return Math.round((new Date(isoDate).getTime() - nowMs) / MS_PER_DAY);
}

/**
 * EU AI Act Timeline Milestones – Art. 113 Application Schedule
 *
 * Sources:
 * - Regulation (EU) 2024/1689, Article 113
 * - EU Commission AI Act Service Desk: https://ai-act-service-desk.ec.europa.eu
 * - Digital Omnibus Proposal, November 2025 (proposed, not yet law)
 */
export const EU_AI_ACT_TIMELINE: DeadlinePhase[] = [
  {
    id: "entry-into-force",
    isoDate: "2024-08-01",
    chapterRef: "Art. 113",
    titleKey: "timeline_phase0_title",
    subtitleKey: "timeline_phase0_subtitle",
    obligations: [
      {
        titleKey: "timeline_obligation_regulation_published",
        articleRef: "Art. 113",
        audiences: ["all"],
      },
    ],
  },
  {
    id: "phase-1-prohibited",
    isoDate: "2025-02-02",
    chapterRef: "Art. 113(1) – Chapter I & II",
    titleKey: "timeline_phase1_title",
    subtitleKey: "timeline_phase1_subtitle",
    obligations: [
      {
        titleKey: "timeline_obligation_definitions",
        articleRef: "Art. 1–4",
        audiences: ["all"],
      },
      {
        titleKey: "timeline_obligation_prohibited",
        articleRef: "Art. 5",
        audiences: ["all", "prohibited"],
        maxPenalty: "€35M / 7%",
      },
      {
        titleKey: "timeline_obligation_ai_literacy",
        articleRef: "Art. 4",
        audiences: ["all"],
      },
    ],
  },
  {
    id: "phase-2-gpai",
    isoDate: "2025-08-02",
    chapterRef: "Art. 113(2) – Chapter V, VII, XII",
    titleKey: "timeline_phase2_title",
    subtitleKey: "timeline_phase2_subtitle",
    obligations: [
      {
        titleKey: "timeline_obligation_gpai_documentation",
        articleRef: "Art. 53",
        audiences: ["gpai"],
        maxPenalty: "€15M / 3%",
      },
      {
        titleKey: "timeline_obligation_gpai_copyright",
        articleRef: "Art. 53(1)(c)",
        audiences: ["gpai"],
      },
      {
        titleKey: "timeline_obligation_gpai_systemic_risk",
        articleRef: "Art. 55",
        audiences: ["gpai"],
        maxPenalty: "€15M / 3%",
      },
      {
        titleKey: "timeline_obligation_notified_bodies",
        articleRef: "Art. 28–39",
        audiences: ["high-annex-iii", "high-annex-i"],
      },
      {
        titleKey: "timeline_obligation_governance",
        articleRef: "Art. 64–70",
        audiences: ["all"],
      },
      {
        titleKey: "timeline_obligation_penalties_framework",
        articleRef: "Art. 99–100",
        audiences: ["all"],
      },
    ],
  },
  {
    id: "phase-3-high-risk-annex-iii",
    isoDate: "2026-08-02",
    chapterRef: "Art. 113(3) – Full Application",
    titleKey: "timeline_phase3_title",
    subtitleKey: "timeline_phase3_subtitle",
    obligations: [
      {
        titleKey: "timeline_obligation_high_risk_requirements",
        articleRef: "Art. 8–25",
        audiences: ["high-annex-iii"],
        maxPenalty: "€15M / 3%",
      },
      {
        titleKey: "timeline_obligation_risk_management",
        articleRef: "Art. 9",
        audiences: ["high-annex-iii"],
      },
      {
        titleKey: "timeline_obligation_data_governance",
        articleRef: "Art. 10",
        audiences: ["high-annex-iii"],
      },
      {
        titleKey: "timeline_obligation_transparency_deployers",
        articleRef: "Art. 13",
        audiences: ["high-annex-iii"],
      },
      {
        titleKey: "timeline_obligation_human_oversight",
        articleRef: "Art. 14",
        audiences: ["high-annex-iii"],
      },
      {
        titleKey: "timeline_obligation_conformity_assessment",
        articleRef: "Art. 43",
        audiences: ["high-annex-iii"],
      },
      {
        titleKey: "timeline_obligation_ce_marking",
        articleRef: "Art. 48",
        audiences: ["high-annex-iii"],
      },
      {
        titleKey: "timeline_obligation_eu_database",
        articleRef: "Art. 49",
        audiences: ["high-annex-iii"],
      },
      {
        titleKey: "timeline_obligation_limited_risk_transparency",
        articleRef: "Art. 50",
        audiences: ["limited"],
        maxPenalty: "€15M / 3%",
      },
      {
        titleKey: "timeline_obligation_post_market",
        articleRef: "Art. 72–73",
        audiences: ["high-annex-iii"],
      },
    ],
  },
  {
    id: "phase-4-high-risk-annex-i",
    isoDate: "2027-08-02",
    chapterRef: "Art. 113(4) – Art. 6(1) + Annex I",
    titleKey: "timeline_phase4_title",
    subtitleKey: "timeline_phase4_subtitle",
    obligations: [
      {
        titleKey: "timeline_obligation_annex_i_products",
        articleRef: "Art. 6(1) + Annex I",
        audiences: ["high-annex-i"],
        maxPenalty: "€15M / 3%",
      },
      {
        titleKey: "timeline_obligation_gpai_grace_period_ends",
        articleRef: "Art. 113(5)",
        audiences: ["gpai"],
      },
    ],
  },
];

/**
 * Digital Omnibus proposed changes (November 2025).
 * NOT YET LAW – under negotiation by EP and Council as of early 2026.
 */
export const DIGITAL_OMNIBUS_PROPOSALS: DeadlinePhase[] = [
  {
    id: "omnibus-high-risk-annex-iii",
    isoDate: "2027-12-02",
    chapterRef: "Digital Omnibus (proposed)",
    titleKey: "timeline_omnibus_phase3_title",
    subtitleKey: "timeline_omnibus_phase3_subtitle",
    proposed: true,
    obligations: [
      {
        titleKey: "timeline_omnibus_high_risk_delayed",
        articleRef: "Annex III (proposed)",
        audiences: ["high-annex-iii"],
        proposed: true,
      },
    ],
  },
  {
    id: "omnibus-high-risk-annex-i",
    isoDate: "2028-08-02",
    chapterRef: "Digital Omnibus (proposed)",
    titleKey: "timeline_omnibus_phase4_title",
    subtitleKey: "timeline_omnibus_phase4_subtitle",
    proposed: true,
    obligations: [
      {
        titleKey: "timeline_omnibus_annex_i_delayed",
        articleRef: "Annex I (proposed)",
        audiences: ["high-annex-i"],
        proposed: true,
      },
    ],
  },
];

export function getAudiencesForRiskLevel(level: RiskLevel): AffectedAudience[] {
  switch (level) {
    case "unacceptable":
      return ["all", "prohibited"];
    case "high":
      return ["all", "high-annex-iii", "high-annex-i"];
    case "limited":
      return ["all", "limited"];
    case "minimal":
      return ["all", "minimal"];
  }
}

export function getNextDeadline(): DeadlinePhase | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = EU_AI_ACT_TIMELINE.filter((p) => p.isoDate > today).sort((a, b) =>
    a.isoDate.localeCompare(b.isoDate)
  );
  return upcoming[0] ?? null;
}

export function getTimelineForRiskLevel(
  riskLevel: RiskLevel
): (DeadlinePhase & { status: DeadlineStatus })[] {
  const audiences = getAudiencesForRiskLevel(riskLevel);
  return EU_AI_ACT_TIMELINE.filter((phase) =>
    phase.obligations.some((o) => o.audiences.some((a) => audiences.includes(a)))
  ).map((phase) => ({
    ...phase,
    status: getDeadlineStatus(phase.isoDate),
  }));
}
