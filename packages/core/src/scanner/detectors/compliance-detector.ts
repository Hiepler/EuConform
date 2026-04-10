import { IMPLEMENTATION_PROVENANCE, isUserFacingPath } from "../../evidence/compliance-evaluation";
import type {
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  SignalCategory,
  SignalEvidence,
} from "../../evidence/types";
import { SOURCE_EXTENSIONS } from "./shared";

interface ComplianceRule {
  id: string;
  name: string;
  category: SignalCategory;
  pattern: RegExp;
  confidence: ConfidenceLevel;
  requiresUserFacingPath?: boolean;
}

const rules: ComplianceRule[] = [
  // --- compliance-disclosure ---
  {
    id: "compliance-disclosure-ai-generated",
    name: "AI disclosure text",
    category: "compliance-disclosure",
    pattern: /\b(?:generated\s+by\s+ai|ai[- ]generated|powered\s+by\s+ai)\b/i,
    confidence: "medium",
  },
  {
    id: "compliance-disclosure-ai-notice",
    name: "AI transparency notice",
    category: "compliance-disclosure",
    pattern: /\b(?:artificial\s+intelligence|machine\s+learning\s+model|transparency\s+notice)\b/i,
    confidence: "medium",
  },

  // --- compliance-logging ---
  {
    id: "compliance-logging-structured",
    name: "Structured logging library",
    category: "compliance-logging",
    pattern:
      /\bfrom\s+['"](?:winston|pino|bunyan)['"]|\brequire\(\s*['"](?:winston|pino|bunyan)['"]\)/,
    confidence: "medium",
  },
  {
    id: "compliance-logging-audit",
    name: "Audit trail pattern",
    category: "compliance-logging",
    pattern: /\b(?:audit[._-]?log|audit[._-]?trail|log[._-]?audit)\b/i,
    confidence: "medium",
  },
  {
    id: "compliance-logging-middleware",
    name: "Logging middleware",
    category: "compliance-logging",
    pattern: /\b(?:logging[Mm]iddleware|requestLogger|morgan)\b/,
    confidence: "low",
  },

  // --- compliance-oversight ---
  {
    id: "compliance-oversight-review",
    name: "Human review flow",
    category: "compliance-oversight",
    pattern: /\b(?:human[_-]?review|manual[_-]?review|approval[_-]?flow|review[_-]?gate)\b/i,
    confidence: "medium",
  },
  {
    id: "compliance-oversight-approve-reject",
    name: "Approval/rejection mechanism",
    category: "compliance-oversight",
    pattern: /\b(?:onApprove|onReject|handleApproval|approveAction|rejectAction)\b/,
    confidence: "medium",
  },
  {
    id: "compliance-oversight-override",
    name: "Override mechanism",
    category: "compliance-oversight",
    pattern: /\b(?:override[_-]?ai|human[_-]?override|manual[_-]?override)\b/i,
    confidence: "medium",
  },

  // --- compliance-bias ---
  {
    id: "compliance-bias-fairness",
    name: "Fairness/bias testing",
    category: "compliance-bias",
    pattern: /\b(?:fairness[_-]?test|bias[_-]?test|disparate[_-]?impact|demographic[_-]?parity)\b/i,
    confidence: "medium",
  },
  {
    id: "compliance-bias-benchmark",
    name: "Bias benchmark reference",
    category: "compliance-bias",
    pattern: /\bCrowS[_-]?Pairs\b/i,
    confidence: "medium",
  },
  {
    id: "compliance-bias-euconform",
    name: "EuConform bias utilities",
    category: "compliance-bias",
    pattern: /\bfrom\s+['"]@euconform\/core.*bias/,
    confidence: "medium",
  },

  // --- compliance-data ---
  {
    id: "compliance-data-quality",
    name: "Data quality checks",
    category: "compliance-data",
    pattern: /\b(?:data[_-]?quality|data[_-]?validation|dataset[_-]?doc|data[_-]?lineage)\b/i,
    confidence: "medium",
  },
  {
    id: "compliance-data-pii",
    name: "PII handling / anonymization",
    category: "compliance-data",
    pattern: /\b(?:pii[_-]?filter|anonymi[sz]e|pseudonymi[sz]e|redact[_-]?pii)\b/i,
    confidence: "medium",
  },
  {
    id: "compliance-data-gdpr",
    name: "GDPR reference",
    category: "compliance-data",
    pattern: /\bGDPR\b|data[_-]?protection[_-]?regulation/i,
    confidence: "low",
  },

  // --- compliance-reporting ---
  {
    id: "compliance-reporting-json",
    name: "JSON export capability",
    category: "compliance-reporting",
    pattern:
      /\b(?:exportJSON|downloadJSON|writeJSONFile|saveJSONReport|exportAuditJSON|exportAnnexJSON|generateAnnexJson)\b|(?:writeFile(?:Sync)?|saveAs|download)\s*\([^)]*(?:report|audit|annex|compliance)[^)]*\.json/i,
    confidence: "medium",
  },
  {
    id: "compliance-reporting-pdf",
    name: "PDF export capability",
    category: "compliance-reporting",
    pattern:
      /\b(?:jspdf|pdf[_-]?lib|pdfmake|generatePDF|exportPDF|downloadPDF|renderPDF|generateAnnexPdf)\b|puppeteer.*\.pdf/i,
    confidence: "medium",
  },
  {
    id: "compliance-reporting-report",
    name: "Report generation",
    category: "compliance-reporting",
    pattern:
      /\b(?:generateReport|buildReport|exportReport|downloadReport|createReport|annex[_-]?iv[_-]?report|compliance[_-]?report|audit[_-]?report)\b/i,
    confidence: "medium",
  },

  // --- compliance-incident ---
  {
    id: "compliance-incident-sentry",
    name: "Sentry error reporting",
    category: "compliance-incident",
    pattern: /\bfrom\s+['"]@sentry\/|\bSentry\.init\b|\brequire\(\s*['"]@sentry\//,
    confidence: "medium",
  },
  {
    id: "compliance-incident-boundary",
    name: "Error boundary",
    category: "compliance-incident",
    pattern: /\bErrorBoundary\b|componentDidCatch/,
    confidence: "medium",
  },
  {
    id: "compliance-incident-response",
    name: "Incident response hook",
    category: "compliance-incident",
    pattern: /\b(?:incident[_-]?report|incident[_-]?response|useIncident|alerting[_-]?hook)\b/i,
    confidence: "medium",
  },
];

function canEvaluateRule(rule: ComplianceRule, file: DetectorContext["file"]): boolean {
  if (!IMPLEMENTATION_PROVENANCE.has(file.provenance)) return false;
  if (rule.category === "compliance-disclosure") return isUserFacingPath(file.relativePath);
  if (rule.requiresUserFacingPath) return isUserFacingPath(file.relativePath);
  return true;
}

function gatherEvidence(
  lines: string[],
  pattern: RegExp,
  filePath: string,
  maxItems: number
): SignalEvidence[] {
  const evidence: SignalEvidence[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (pattern.test(line)) {
      evidence.push({ file: filePath, line: i + 1, snippet: line.trim().slice(0, 120) });
      if (evidence.length >= maxItems) break;
    }
  }
  return evidence;
}

export function detectCompliance(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (!SOURCE_EXTENSIONS.has(file.extension)) return [];

  const signalMap = new Map<string, DetectedSignal>();

  for (const rule of rules) {
    if (!canEvaluateRule(rule, file)) continue;

    const evidence = gatherEvidence(ctx.lines, rule.pattern, file.relativePath, 3);
    if (evidence.length === 0) continue;

    const existing = signalMap.get(rule.id);
    if (existing) {
      existing.evidence.push(...evidence);
    } else {
      signalMap.set(rule.id, {
        id: rule.id,
        name: rule.name,
        category: rule.category,
        confidence: rule.confidence,
        evidence,
      });
    }
  }

  return Array.from(signalMap.values());
}
