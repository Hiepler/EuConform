/**
 * Compliance Gap Analysis Generator
 * Produces prioritized action plans from EU AI Act assessment results.
 *
 * Supports:
 * - Annex III high-risk assessment → mandatory Art. 9–15 + Art. 43 + Art. 71 obligations
 * - GPAI compliance assessment → gaps directly from GPAIComplianceResult flags
 *
 * IMPORTANT: This module provides technical orientation, not legal advice.
 */

import type { RiskAssessment } from "../types";
import type { GPAIComplianceResult, GPAIObligationType } from "./gpai-classifier";

/** Priority level for a compliance gap action */
export type GapPriority = "critical" | "high" | "medium";

/** A single compliance gap with actionable remediation steps */
export interface GapAction {
  id: string;
  title: string;
  description: string;
  articleRef: string;
  priority: GapPriority;
  status: "missing" | "partial";
  steps: string[];
  penaltyRef?: string;
}

/** Aggregated gap analysis result */
export interface GapAnalysisResult {
  totalGaps: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  actions: GapAction[];
}

// ---------------------------------------------------------------------------
// Annex III: Mandatory obligations for ALL high-risk systems (Art. 9–15 + Art. 43 + Art. 71 + Art. 72)
// ---------------------------------------------------------------------------

const HIGH_RISK_OBLIGATIONS: GapAction[] = [
  {
    id: "risk-management-system",
    title: "Risk Management System",
    description:
      "Establish and maintain a continuous risk management system covering the full AI system lifecycle.",
    articleRef: "Art. 9",
    priority: "critical",
    status: "missing",
    steps: [
      "Identify and analyze foreseeable risks to health, safety, and fundamental rights",
      "Implement risk mitigation measures proportionate to identified risks",
      "Test residual risks against acceptance criteria before deployment",
      "Document and update risk assessment throughout lifecycle",
    ],
    penaltyRef: "Art. 99(3)",
  },
  {
    id: "data-governance",
    title: "Data Governance & Training Data",
    description:
      "Implement data governance practices covering training, validation, and testing datasets.",
    articleRef: "Art. 10",
    priority: "critical",
    status: "missing",
    steps: [
      "Document data sources, collection methods, and data preparation processes",
      "Assess training data for biases that could lead to discriminatory outcomes",
      "Implement data quality and relevance criteria appropriate to the intended purpose",
      "Establish and document data governance policies",
    ],
    penaltyRef: "Art. 99(3)",
  },
  {
    id: "technical-documentation",
    title: "Technical Documentation (Annex IV)",
    description: "Prepare and maintain comprehensive technical documentation per Annex IV.",
    articleRef: "Art. 11 + Annex IV",
    priority: "critical",
    status: "missing",
    steps: [
      "Document general system description including intended purpose and high-risk category",
      "Describe design specifications, architecture, and development methods",
      "Document training methods, datasets, and accuracy/robustness metrics",
      "Keep documentation up-to-date throughout the system lifecycle",
    ],
    penaltyRef: "Art. 99(3)",
  },
  {
    id: "record-keeping",
    title: "Logging & Record-Keeping",
    description: "Implement automatic logging capabilities throughout system operation.",
    articleRef: "Art. 12",
    priority: "high",
    status: "missing",
    steps: [
      "Enable automatic logging of system events during operation",
      "Ensure logs identify operating periods and referenced databases used",
      "Retain logs for minimum 6 months (or as required by sector regulations)",
      "Implement secure log storage with appropriate access controls",
    ],
    penaltyRef: "Art. 99(3)",
  },
  {
    id: "transparency-information",
    title: "Transparency & User Information",
    description:
      "Provide clear instructions for use and ensure deployers and users understand the system.",
    articleRef: "Art. 13",
    priority: "high",
    status: "missing",
    steps: [
      "Prepare instructions for use covering capabilities, limitations, and intended purpose",
      "Disclose the AI nature of the system clearly",
      "Inform users about accuracy levels and known limitations",
      "Document contact information for user questions and complaints",
    ],
    penaltyRef: "Art. 99(3)",
  },
  {
    id: "human-oversight",
    title: "Human Oversight Measures",
    description: "Enable meaningful human oversight of the AI system throughout its operation.",
    articleRef: "Art. 14",
    priority: "high",
    status: "missing",
    steps: [
      "Implement interfaces enabling human monitoring of AI outputs",
      "Ensure humans can override, correct, or disregard AI decisions",
      "Train persons responsible for oversight on capabilities and limitations",
      "Document human oversight procedures",
    ],
    penaltyRef: "Art. 99(3)",
  },
  {
    id: "accuracy-robustness",
    title: "Accuracy, Robustness & Cybersecurity",
    description:
      "Ensure the system meets required accuracy levels and is resilient against errors and attacks.",
    articleRef: "Art. 15",
    priority: "high",
    status: "missing",
    steps: [
      "Define and test accuracy metrics appropriate to the intended purpose",
      "Test for robustness against errors, faults, and inconsistencies",
      "Implement cybersecurity measures against adversarial manipulation",
      "Document all performance metrics in technical documentation",
    ],
    penaltyRef: "Art. 99(3)",
  },
  {
    id: "conformity-assessment",
    title: "Conformity Assessment",
    description: "Conduct conformity assessment before placing the system on the EU market.",
    articleRef: "Art. 43",
    priority: "critical",
    status: "missing",
    steps: [
      "Determine the applicable conformity assessment procedure for your category",
      "Conduct internal assessment OR involve a notified body (depending on category)",
      "Draw up EU declaration of conformity per Annex V",
      "Affix CE marking to the system or accompanying documentation",
    ],
    penaltyRef: "Art. 99(4)",
  },
  {
    id: "eu-database-registration",
    title: "EU AI Database Registration",
    description: "Register the high-risk AI system in the EU AI Database before market placement.",
    articleRef: "Art. 71",
    priority: "critical",
    status: "missing",
    steps: [
      "Create an account on the EU AI Database (managed by the AI Office)",
      "Provide all required information per Art. 71(3)",
      "Register before placing the system on the EU market",
      "Update the registration when significant modifications occur",
    ],
    penaltyRef: "Art. 99(4)",
  },
  {
    id: "post-market-monitoring",
    title: "Post-Market Monitoring",
    description:
      "Set up a post-market monitoring system to track performance and report incidents.",
    articleRef: "Art. 72",
    priority: "medium",
    status: "missing",
    steps: [
      "Establish a post-market monitoring plan before deployment",
      "Collect and analyze data on system performance over time",
      "Report serious incidents to national market surveillance authorities",
      "Report near misses and systemic issues to the AI Office",
    ],
    penaltyRef: "Art. 99(3)",
  },
];

// ---------------------------------------------------------------------------
// GPAI: Detailed gap definitions for each obligation type
// ---------------------------------------------------------------------------

const GPAI_OBLIGATION_GAPS: Record<GPAIObligationType, Omit<GapAction, "id" | "status">> = {
  "technical-docs": {
    title: "Technical Documentation (Annex XI/XII)",
    description:
      "Prepare and maintain technical documentation covering the GPAI model per Annex XI (standard) or Annex XII (systemic risk extension).",
    articleRef: "Art. 53(1)(a)",
    priority: "critical",
    steps: [
      "Document general model description, training approach, and architecture",
      "List training data sources, data governance policies, and total compute (FLOP)",
      "Document capabilities, limitations, and foreseeable misuse risks",
      "Keep documentation updated with each significant model change",
    ],
    penaltyRef: "Art. 101",
  },
  "downstream-info": {
    title: "Downstream Provider Information Package",
    description:
      "Provide downstream providers with all information they need for their own EU AI Act obligations.",
    articleRef: "Art. 53(1)(b)",
    priority: "critical",
    steps: [
      "Document model capabilities, limitations, and intended use cases",
      "Specify restrictions on use and integration requirements",
      "Provide API documentation and integration guidance",
      "Update the information package when the model is updated",
    ],
    penaltyRef: "Art. 101",
  },
  "copyright-policy": {
    title: "Copyright Policy + Training Data Summary",
    description: "Establish a copyright compliance policy and publish a training data summary.",
    articleRef: "Art. 53(1)(c–d)",
    priority: "high",
    steps: [
      "Implement a text and data mining (TDM) opt-out compliance policy (Art. 53(1)(c))",
      "Publish a sufficiently detailed training data summary (Art. 53(1)(d))",
      "Document copyright clearances obtained for training data",
      "Establish an ongoing compliance process for future training data updates",
    ],
    penaltyRef: "Art. 101",
  },
  "eu-database": {
    title: "EU AI Database Registration",
    description:
      "Register the GPAI model in the EU AI Database before placing it on the EU market.",
    articleRef: "Art. 71",
    priority: "critical",
    steps: [
      "Access the EU AI Database portal managed by the AI Office",
      "Provide required model information including name, type, and capabilities",
      "Register before placing the model on the EU market",
      "Update the registration when the model is significantly updated",
    ],
    penaltyRef: "Art. 101",
  },
  "open-source": {
    title: "Open-Source Release Compliance",
    description:
      "Verify compliance with remaining obligations that apply despite the open-source exemption.",
    articleRef: "Art. 53(2)",
    priority: "medium",
    steps: [
      "Confirm that weights, parameters, and architecture are publicly available",
      "Ensure Art. 53(1)(d) training data summary obligation is still fulfilled",
      "If systemic risk threshold is met, Art. 55 obligations remain applicable",
    ],
  },
  "systemic-risk": {
    title: "Systemic Risk Threshold Verification",
    description: "Formally determine if the model meets the ≥10²⁵ FLOP systemic risk threshold.",
    articleRef: "Art. 51 + Annex XIII",
    priority: "high",
    steps: [
      "Document total training compute (FLOP) with engineering sign-off",
      "Consult with technical experts if compute is near the threshold",
      "If threshold is met, implement all Art. 55 obligations",
      "Notify the AI Office if the systemic risk threshold is reached",
    ],
  },
  "red-teaming": {
    title: "Adversarial Testing / Red-Teaming",
    description:
      "Conduct model evaluations and adversarial testing to identify and mitigate systemic risks.",
    articleRef: "Art. 55(1)(a)",
    priority: "critical",
    steps: [
      "Define red-teaming scope covering systemic risks (CBRN, cyberattacks, disinformation, etc.)",
      "Conduct standardized evaluations per AI Office guidelines and emerging standards",
      "Engage external domain experts for adversarial testing",
      "Document findings and implement mitigation measures",
      "Repeat evaluations before each significant model release",
    ],
    penaltyRef: "Art. 101",
  },
  "incident-reporting": {
    title: "Serious Incident Reporting Mechanisms",
    description:
      "Establish systems to track and report serious incidents caused by the GPAI model.",
    articleRef: "Art. 55(1)(b)",
    priority: "critical",
    steps: [
      "Define criteria for what constitutes a serious incident for your GPAI model",
      "Implement an incident tracking and documentation system",
      "Establish a direct reporting channel to the AI Office",
      "Set up notification procedures for affected national authorities and users",
      "Document incident response and remediation procedures",
    ],
    penaltyRef: "Art. 101",
  },
  cybersecurity: {
    title: "Cybersecurity Measures",
    description:
      "Implement adequate cybersecurity protections for the GPAI model and its infrastructure.",
    articleRef: "Art. 55(1)(c)",
    priority: "high",
    steps: [
      "Assess cybersecurity risks specific to the GPAI model and API surface",
      "Implement adversarial robustness measures against prompt injection and model extraction",
      "Secure training infrastructure, model weights, and API endpoints",
      "Document cybersecurity measures in Annex XII technical documentation",
    ],
    penaltyRef: "Art. 101",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<GapPriority, number> = { critical: 0, high: 1, medium: 2 };

const SORTED_HIGH_RISK_OBLIGATIONS: GapAction[] = [...HIGH_RISK_OBLIGATIONS].sort(
  (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
);

function countByPriority(
  actions: GapAction[]
): Pick<GapAnalysisResult, "criticalCount" | "highCount" | "mediumCount"> {
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  for (const a of actions) {
    if (a.priority === "critical") criticalCount++;
    else if (a.priority === "high") highCount++;
    else mediumCount++;
  }
  return { criticalCount, highCount, mediumCount };
}

/**
 * Generate a gap analysis action plan from an Annex III risk assessment.
 *
 * - unacceptable → Art. 5 prohibition action (critical)
 * - high         → all mandatory Art. 9–15 + Art. 43 + Art. 71 + Art. 72 obligations
 * - limited      → Art. 50 transparency obligations
 * - minimal      → no gaps
 */
export function generateAnnexIIIGapAnalysis(assessment: RiskAssessment): GapAnalysisResult {
  if (assessment.level === "minimal") {
    return { totalGaps: 0, criticalCount: 0, highCount: 0, mediumCount: 0, actions: [] };
  }

  if (assessment.level === "unacceptable") {
    const actions: GapAction[] = [
      {
        id: "prohibited-ai",
        title: "Prohibited AI System (Art. 5)",
        description:
          "This system shows characteristics potentially prohibited under Art. 5. Do not deploy in the EU without comprehensive legal review.",
        articleRef: "Art. 5",
        priority: "critical",
        status: "missing",
        steps: [
          "Immediately halt deployment plans for the EU market",
          "Seek qualified legal counsel to assess whether the Art. 5 prohibition applies",
          "Consider fundamental system redesign to eliminate prohibited characteristics",
        ],
        penaltyRef: "Art. 99(4)",
      },
    ];
    return { totalGaps: 1, criticalCount: 1, highCount: 0, mediumCount: 0, actions };
  }

  if (assessment.level === "limited") {
    const actions: GapAction[] = [
      {
        id: "ai-interaction-disclosure",
        title: "AI Interaction Disclosure",
        description: "Inform users that they are interacting with an AI system (Art. 50(1)).",
        articleRef: "Art. 50(1)",
        priority: "high",
        status: "missing",
        steps: [
          "Add a clear disclosure at the start of each AI interaction",
          "Exception: disclosure not required if obvious from context to a reasonable person",
          "Document the disclosure mechanism in your compliance records",
        ],
        penaltyRef: "Art. 99(3)",
      },
      {
        id: "ai-content-labeling",
        title: "AI-Generated Content Labeling",
        description:
          "Label AI-generated audio, image, video, or text content that could mislead users (Art. 50(2–4)).",
        articleRef: "Art. 50(2–4)",
        priority: "high",
        status: "partial",
        steps: [
          "Implement machine-readable marking of AI-generated content",
          "Add visible disclosure for synthetic media (deepfakes, AI-generated images/video)",
          "Apply Art. 50(4) disclosure for emotion recognition or biometric categorization",
        ],
        penaltyRef: "Art. 99(3)",
      },
    ];
    return {
      totalGaps: actions.length,
      ...countByPriority(actions),
      actions,
    };
  }

  // high: all mandatory obligations, pre-sorted at module init
  return {
    totalGaps: SORTED_HIGH_RISK_OBLIGATIONS.length,
    ...countByPriority(SORTED_HIGH_RISK_OBLIGATIONS),
    actions: SORTED_HIGH_RISK_OBLIGATIONS,
  };
}

/**
 * Generate a gap analysis action plan from a GPAI compliance result.
 * Only generates actions for obligations flagged as missing or partial.
 */
export function generateGPAIGapAnalysis(result: GPAIComplianceResult): GapAnalysisResult {
  if (result.flags.length === 0) {
    return { totalGaps: 0, criticalCount: 0, highCount: 0, mediumCount: 0, actions: [] };
  }

  const actions: GapAction[] = result.flags
    .map((flag) => ({
      id: flag.obligation,
      status: flag.status,
      ...GPAI_OBLIGATION_GAPS[flag.obligation],
    }))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return { totalGaps: actions.length, ...countByPriority(actions), actions };
}
