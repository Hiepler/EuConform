import type {
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  SignalCategory,
  SignalEvidence,
} from "../../evidence/types";

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

interface MarkdownRule {
  id: string;
  name: string;
  category: SignalCategory;
  /** Match against individual lines */
  pattern: RegExp;
  confidence: ConfidenceLevel;
  /** When true, only matches inside heading-level sections (## ...) */
  sectionHeading?: boolean;
}

const rules: MarkdownRule[] = [
  // --- compliance-disclosure ---
  {
    id: "compliance-disclosure-readme",
    name: "AI disclosure in README",
    category: "compliance-disclosure",
    pattern:
      /\b(?:artificial\s+intelligence|machine\s+learning|AI[- ]powered|AI[- ]generated|uses?\s+AI|deep\s+learning|neural\s+network|large\s+language\s+model|LLM)\b/i,
    confidence: "low",
  },
  {
    id: "compliance-disclosure-transparency",
    name: "Transparency notice",
    category: "compliance-disclosure",
    pattern: /\b(?:transparency\s+notice|AI\s+disclosure|generated\s+by\s+AI)\b/i,
    confidence: "medium",
  },

  // --- Model card ---
  {
    id: "compliance-disclosure-model-card",
    name: "Model card documentation",
    category: "compliance-disclosure",
    pattern: /^#{1,3}\s+Model\s+Card\b/i,
    confidence: "medium",
    sectionHeading: true,
  },

  // --- compliance-data ---
  {
    id: "compliance-data-docs",
    name: "Data governance documentation",
    category: "compliance-data",
    pattern: /^#{1,3}\s+(?:Data\s+(?:Sources?|Governance|Quality|Lineage)|Training\s+Data)\b/i,
    confidence: "medium",
    sectionHeading: true,
  },
  {
    id: "compliance-data-reference",
    name: "Data source references",
    category: "compliance-data",
    pattern: /\b(?:training\s+data|data\s+sources?|dataset\s+documentation)\b/i,
    confidence: "low",
  },

  // --- Privacy / GDPR ---
  {
    id: "compliance-data-privacy",
    name: "Privacy policy reference",
    category: "compliance-data",
    pattern: /\b(?:privacy\s+policy|GDPR|data\s+protection|DSGVO)\b/i,
    confidence: "medium",
  },

  // --- License / AI-specific ---
  {
    id: "compliance-disclosure-license",
    name: "AI-relevant license terms",
    category: "compliance-disclosure",
    pattern:
      /\b(?:model\s+license|AI\s+license|responsible\s+AI|acceptable\s+use\s+policy|RAIL\s+license)\b/i,
    confidence: "medium",
  },
];

// ---------------------------------------------------------------------------
// File filtering
// ---------------------------------------------------------------------------

/** Files that should always be skipped unless they contain AI-specific content */
const SKIP_BASENAMES = new Set([
  "changelog.md",
  "changes.md",
  "history.md",
  "contributing.md",
  "code_of_conduct.md",
]);

/** Only process these docs-level paths */
function isRelevantMarkdown(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  const basename = lower.split("/").pop() ?? "";

  // Always process README files at any level
  if (basename.startsWith("readme")) return true;

  // Process files inside docs/ directories
  if (lower.includes("/docs/") || lower.startsWith("docs/")) {
    return !SKIP_BASENAMES.has(basename);
  }

  // For other markdown files, skip known non-relevant ones
  if (SKIP_BASENAMES.has(basename)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

function gatherMarkdownEvidence(
  rule: (typeof rules)[number],
  lines: string[],
  filePath: string
): SignalEvidence[] {
  const evidence: SignalEvidence[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (rule.sectionHeading && !line.startsWith("#")) continue;
    if (rule.pattern.test(line)) {
      evidence.push({ file: filePath, line: i + 1, snippet: line.trim().slice(0, 120) });
      if (evidence.length >= 5) break;
    }
  }
  return evidence;
}

function isSkippableGenericContent(basename: string, evidence: SignalEvidence[]): boolean {
  if (!SKIP_BASENAMES.has(basename)) return false;
  return !evidence.some((e) => /\bAI\b|\bML\b|\bmodel\b|\binference\b/i.test(e.snippet));
}

export function detectMarkdown(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (file.extension !== ".md") return [];
  if (!isRelevantMarkdown(file.relativePath)) return [];

  const signalMap = new Map<string, DetectedSignal>();
  const basename = file.relativePath.toLowerCase().split("/").pop() ?? "";

  for (const rule of rules) {
    const evidence = gatherMarkdownEvidence(rule, ctx.lines, file.relativePath);
    if (evidence.length === 0) continue;
    if (isSkippableGenericContent(basename, evidence)) continue;

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
