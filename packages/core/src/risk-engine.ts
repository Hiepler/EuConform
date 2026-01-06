/**
 * EU AI Act Risk Engine
 * Implements risk classification according to Article 6 + Annex III
 */

import type { HighRiskCategory, QuizAnswer, QuizQuestion, RiskAssessment, RiskFlag } from "./types";

/** Risk classification questions based on EU AI Act criteria */
export const RISK_QUIZ_QUESTIONS_EN: QuizQuestion[] = [
  {
    id: "purpose",
    question: "What is the primary purpose of your AI system?",
    description: "Select the category that best describes your system's main function",
    options: [
      {
        value: "biometric",
        label: "Biometric identification/categorization",
        riskIndicator: "high",
      },
      {
        value: "critical-infra",
        label: "Critical infrastructure management",
        riskIndicator: "high",
      },
      { value: "education", label: "Education or vocational training", riskIndicator: "high" },
      {
        value: "employment",
        label: "Employment, worker management, recruitment",
        riskIndicator: "high",
      },
      {
        value: "essential-services",
        label: "Access to essential services (credit, insurance)",
        riskIndicator: "high",
      },
      { value: "law-enforcement", label: "Law enforcement", riskIndicator: "high" },
      { value: "migration", label: "Migration, asylum, border control", riskIndicator: "high" },
      { value: "justice", label: "Administration of justice", riskIndicator: "high" },
      { value: "chatbot", label: "Chatbot or conversational AI", riskIndicator: "limited" },
      {
        value: "content-generation",
        label: "Content generation (text, images)",
        riskIndicator: "limited",
      },
      { value: "other", label: "Other / General purpose", riskIndicator: "minimal" },
    ],
  },
  {
    id: "subliminal",
    question: "Does your system use subliminal techniques to manipulate behavior?",
    description: "Techniques beyond a person's consciousness that could cause harm",
    options: [
      { value: "yes", label: "Yes", riskIndicator: "unacceptable" },
      { value: "no", label: "No", riskIndicator: "minimal" },
      { value: "unsure", label: "Not sure", riskIndicator: "limited" },
    ],
  },
  {
    id: "vulnerability",
    question: "Does your system target vulnerable groups in ways that could exploit them?",
    description: "Children, elderly, disabled, or economically/socially disadvantaged groups",
    options: [
      { value: "yes", label: "Yes, it targets vulnerable groups", riskIndicator: "unacceptable" },
      {
        value: "no",
        label: "No, it does not specifically target vulnerable groups",
        riskIndicator: "minimal",
      },
      {
        value: "includes",
        label: "It may include but doesn't specifically target them",
        riskIndicator: "limited",
      },
    ],
  },
  {
    id: "social-scoring",
    question: "Does your system perform social scoring?",
    description:
      "Evaluating trustworthiness based on social behavior by public authorities leading to detrimental treatment",
    options: [
      { value: "yes", label: "Yes, by public authorities", riskIndicator: "unacceptable" },
      { value: "no", label: "No", riskIndicator: "minimal" },
      {
        value: "partial",
        label: "It scores behavior but not for social purposes by public authorities",
        riskIndicator: "limited",
      },
    ],
  },
  {
    id: "biometric-realtime",
    question: "Does your system use real-time remote biometric identification in public spaces?",
    description: "For law enforcement purposes without judicial authorization",
    options: [
      { value: "yes", label: "Yes", riskIndicator: "unacceptable" },
      { value: "no", label: "No", riskIndicator: "minimal" },
      {
        value: "authorized",
        label: "Yes, but with proper judicial authorization",
        riskIndicator: "high",
      },
    ],
  },
  {
    id: "human-oversight",
    question: "What level of human oversight exists for your AI system's decisions?",
    description: "Consider who reviews and can override AI decisions",
    options: [
      { value: "none", label: "Fully autonomous, no human oversight", riskIndicator: "high" },
      {
        value: "limited",
        label: "Human review possible but not required",
        riskIndicator: "limited",
      },
      {
        value: "full",
        label: "Human oversight and approval required for decisions",
        riskIndicator: "minimal",
      },
    ],
  },
];

export const RISK_QUIZ_QUESTIONS_DE: QuizQuestion[] = [
  {
    id: "purpose",
    question: "Was ist der Hauptzweck Ihres KI-Systems?",
    description:
      "Wählen Sie die Kategorie, die die Hauptfunktion Ihres Systems am besten beschreibt",
    options: [
      {
        value: "biometric",
        label: "Biometrische Identifizierung/Kategorisierung",
        riskIndicator: "high",
      },
      {
        value: "critical-infra",
        label: "Management kritischer Infrastrukturen",
        riskIndicator: "high",
      },
      { value: "education", label: "Allgemeine und berufliche Bildung", riskIndicator: "high" },
      {
        value: "employment",
        label: "Beschäftigung, Personalmanagement, Rekrutierung",
        riskIndicator: "high",
      },
      {
        value: "essential-services",
        label: "Zugang zu wesentlichen Dienstleistungen (Kredit, Versicherung)",
        riskIndicator: "high",
      },
      { value: "law-enforcement", label: "Strafverfolgung", riskIndicator: "high" },
      { value: "migration", label: "Migration, Asyl, Grenzkontrolle", riskIndicator: "high" },
      { value: "justice", label: "Justizverwaltung", riskIndicator: "high" },
      { value: "chatbot", label: "Chatbot oder konversationelle KI", riskIndicator: "limited" },
      {
        value: "content-generation",
        label: "Inhaltsgenerierung (Text, Bilder)",
        riskIndicator: "limited",
      },
      { value: "other", label: "Andere / Allzweck", riskIndicator: "minimal" },
    ],
  },
  {
    id: "subliminal",
    question: "Verwendet Ihr System unterschwellige Techniken, um Verhalten zu manipulieren?",
    description:
      "Techniken jenseits des menschlichen Bewusstseins, die Schaden verursachen könnten",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "unacceptable" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      { value: "unsure", label: "Nicht sicher", riskIndicator: "limited" },
    ],
  },
  {
    id: "vulnerability",
    question:
      "Zielt Ihr System auf schutzbedürftige Gruppen in einer Weise ab, die sie ausnutzen könnte?",
    description:
      "Kinder, ältere Menschen, Behinderte oder wirtschaftlich/sozial benachteiligte Gruppen",
    options: [
      {
        value: "yes",
        label: "Ja, es zielt auf schutzbedürftige Gruppen ab",
        riskIndicator: "unacceptable",
      },
      {
        value: "no",
        label: "Nein, es zielt nicht speziell auf schutzbedürftige Gruppen ab",
        riskIndicator: "minimal",
      },
      {
        value: "includes",
        label: "Es kann sie einschließen, zielt aber nicht speziell auf sie ab",
        riskIndicator: "limited",
      },
    ],
  },
  {
    id: "social-scoring",
    question: "Führt Ihr System Social Scoring durch?",
    description:
      "Bewertung der Vertrauenswürdigkeit aufgrund sozialen Verhaltens durch öffentliche Behörden, das zu nachteiliger Behandlung führt",
    options: [
      { value: "yes", label: "Ja, durch öffentliche Behörden", riskIndicator: "unacceptable" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      {
        value: "partial",
        label: "Es bewertet Verhalten, aber nicht für soziale Zwecke durch öffentliche Behörden",
        riskIndicator: "limited",
      },
    ],
  },
  {
    id: "biometric-realtime",
    question:
      "Verwendet Ihr System biometrische Fernidentifizierung in Echtzeit im öffentlichen Raum?",
    description: "Für Strafverfolgungszwecke ohne richterliche Genehmigung",
    options: [
      { value: "yes", label: "Ja", riskIndicator: "unacceptable" },
      { value: "no", label: "Nein", riskIndicator: "minimal" },
      {
        value: "authorized",
        label: "Ja, aber mit ordnungsgemäßer richterlicher Genehmigung",
        riskIndicator: "high",
      },
    ],
  },
  {
    id: "human-oversight",
    question:
      "Welches Maß an menschlicher Aufsicht gibt es für die Entscheidungen Ihres KI-Systems?",
    description: "Berücksichtigen Sie, wer die KI-Entscheidungen überprüft und aufheben kann",
    options: [
      {
        value: "none",
        label: "Vollständig autonom, keine menschliche Aufsicht",
        riskIndicator: "high",
      },
      {
        value: "limited",
        label: "Menschliche Überprüfung möglich, aber nicht erforderlich",
        riskIndicator: "limited",
      },
      {
        value: "full",
        label: "Menschliche Aufsicht und Genehmigung für Entscheidungen erforderlich",
        riskIndicator: "minimal",
      },
    ],
  },
];

export const RISK_QUIZ_QUESTIONS = RISK_QUIZ_QUESTIONS_DE;

/** Map purpose values to high-risk categories */
const PURPOSE_TO_CATEGORY: Record<string, HighRiskCategory> = {
  biometric: "biometric-identification",
  "critical-infra": "critical-infrastructure",
  education: "education-training",
  employment: "employment-workers",
  "essential-services": "essential-services",
  "law-enforcement": "law-enforcement",
  migration: "migration-asylum",
  justice: "justice-democracy",
};

/**
 * Classify AI system risk level based on quiz answers
 * Implements EU AI Act Article 5 (prohibited) and Article 6 + Annex III (high-risk)
 */
export function classifyRisk(answers: QuizAnswer[]): RiskAssessment {
  const flags: RiskFlag[] = [];
  const recommendations: string[] = [];
  const legalBasis: string[] = [];

  // Check for unacceptable (prohibited) practices - Article 5
  const prohibitedPractices = checkProhibitedPractices(answers);
  if (prohibitedPractices.length > 0) {
    return {
      level: "unacceptable",
      score: 100,
      flags: prohibitedPractices,
      recommendations: [
        "This AI system appears to fall under prohibited practices (Article 5)",
        "Deploy this system is not permitted under the EU AI Act",
        "Consult legal counsel immediately",
      ],
      legalBasis: ["Article 5 - Prohibited AI Practices"],
    };
  }

  // Check for high-risk systems - Article 6 + Annex III
  const purposeAnswer = answers.find((a) => a.questionId === "purpose");
  const category = purposeAnswer?.value ? PURPOSE_TO_CATEGORY[purposeAnswer.value] : undefined;

  if (category) {
    flags.push({
      type: "warning",
      message: `System falls under high-risk category: ${formatCategory(category)}`,
      articleReference: "Annex III",
    });
    legalBasis.push(
      "Article 6 - Classification of High-Risk AI Systems",
      "Annex III - High-Risk Categories"
    );
    recommendations.push(
      "Implement conformity assessment procedures",
      "Establish risk management system",
      "Ensure data governance and documentation",
      "Enable human oversight mechanisms",
      "Maintain technical documentation per Annex IV"
    );

    const humanOversight = answers.find((a) => a.questionId === "human-oversight");
    if (humanOversight?.value === "none") {
      flags.push({
        type: "warning",
        message: "High-risk systems require meaningful human oversight (Article 14)",
        articleReference: "Article 14",
      });
      recommendations.push(
        "Implement meaningful human oversight measures as required for high-risk systems"
      );
    }

    return {
      level: "high",
      category,
      score: calculateRiskScore(answers),
      flags,
      recommendations,
      legalBasis,
    };
  }

  // Check for limited-risk systems (transparency obligations)
  const limitedRiskIndicators = ["chatbot", "content-generation"];
  if (purposeAnswer?.value && limitedRiskIndicators.includes(purposeAnswer.value)) {
    flags.push({
      type: "info",
      message: "System requires transparency obligations",
      articleReference: "Article 50",
    });
    legalBasis.push("Article 50 - Transparency Obligations");
    recommendations.push(
      "Clearly inform users they are interacting with an AI system",
      "Label AI-generated content appropriately",
      "Document the AI nature of outputs"
    );

    return {
      level: "limited",
      score: calculateRiskScore(answers),
      flags,
      recommendations,
      legalBasis,
    };
  }

  // Minimal risk - no specific obligations
  return {
    level: "minimal",
    score: calculateRiskScore(answers),
    flags: [
      {
        type: "info",
        message: "System classified as minimal risk - voluntary codes of conduct apply",
      },
    ],
    recommendations: [
      "Consider adopting voluntary codes of conduct",
      "Monitor for regulatory updates",
      "Maintain good AI practices",
    ],
    legalBasis: ["No mandatory requirements - minimal risk system"],
  };
}

/**
 * Check for prohibited AI practices under Article 5
 */
function checkProhibitedPractices(answers: QuizAnswer[]): RiskFlag[] {
  const flags: RiskFlag[] = [];

  const subliminal = answers.find((a) => a.questionId === "subliminal");
  if (subliminal?.value === "yes") {
    flags.push({
      type: "critical",
      message: "PROHIBITED: Use of subliminal techniques to manipulate behavior",
      articleReference: "Article 5(1)(a)",
    });
  }

  const vulnerability = answers.find((a) => a.questionId === "vulnerability");
  if (vulnerability?.value === "yes") {
    flags.push({
      type: "critical",
      message: "PROHIBITED: Exploitation of vulnerabilities of specific groups",
      articleReference: "Article 5(1)(b)",
    });
  }

  const socialScoring = answers.find((a) => a.questionId === "social-scoring");
  if (socialScoring?.value === "yes") {
    flags.push({
      type: "critical",
      message: "PROHIBITED: Social scoring by public authorities leading to detrimental treatment",
      articleReference: "Article 5(1)(c)",
    });
  }

  const biometricRealtime = answers.find((a) => a.questionId === "biometric-realtime");
  if (biometricRealtime?.value === "yes") {
    flags.push({
      type: "critical",
      message:
        "PROHIBITED: Real-time remote biometric identification in public spaces without judicial authorization",
      articleReference: "Article 5(1)(d)",
    });
  }

  return flags;
}

/**
 * Calculate risk score (0-100) based on answer patterns
 */
function calculateRiskScore(answers: QuizAnswer[]): number {
  let score = 0;
  const questions = RISK_QUIZ_QUESTIONS;

  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    const option = question?.options.find((o) => o.value === answer.value);

    if (option?.riskIndicator) {
      switch (option.riskIndicator) {
        case "unacceptable":
          score += 30;
          break;
        case "high":
          score += 20;
          break;
        case "limited":
          score += 10;
          break;
        case "minimal":
          score += 0;
          break;
      }
    }
  }

  return Math.min(100, score);
}

/**
 * Format high-risk category for display
 */
function formatCategory(category: HighRiskCategory): string {
  const labels: Record<HighRiskCategory, string> = {
    "biometric-identification": "Biometric Identification & Categorization",
    "critical-infrastructure": "Critical Infrastructure",
    "education-training": "Education & Vocational Training",
    "employment-workers": "Employment & Worker Management",
    "essential-services": "Essential Private/Public Services",
    "law-enforcement": "Law Enforcement",
    "migration-asylum": "Migration, Asylum & Border Control",
    "justice-democracy": "Administration of Justice & Democracy",
  };
  return labels[category] || category;
}

/**
 * Get all quiz questions for the risk assessment
 */
export function getQuizQuestions(): QuizQuestion[] {
  return RISK_QUIZ_QUESTIONS;
}

/**
 * Get detailed recommendations based on risk level
 */
export function getComplianceGuidance(assessment: RiskAssessment): string[] {
  const guidance: string[] = [];

  switch (assessment.level) {
    case "unacceptable":
      guidance.push(
        "⛔ This system is PROHIBITED under EU AI Act Article 5",
        "Do not deploy or make available in the EU market",
        "Consult legal counsel for alternatives"
      );
      break;
    case "high":
      guidance.push(
        "📋 Register in EU database before market placement",
        "🔍 Conduct conformity assessment",
        "📝 Prepare technical documentation (Annex IV)",
        "⚠️ Implement risk management system",
        "🧪 Test for accuracy, robustness, cybersecurity",
        "👤 Enable human oversight measures",
        "📊 Maintain logs for at least 6 months"
      );
      break;
    case "limited":
      guidance.push(
        "💬 Inform users about AI interaction",
        "🏷️ Label AI-generated content",
        "📚 Consider voluntary codes of conduct"
      );
      break;
    case "minimal":
      guidance.push(
        "✅ No mandatory requirements",
        "📖 Voluntary codes of conduct encouraged",
        "🔄 Monitor regulatory updates"
      );
      break;
  }

  return guidance;
}
