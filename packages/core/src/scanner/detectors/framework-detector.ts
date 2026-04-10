import type {
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  SignalEvidence,
} from "../../evidence/types";
import { EXTENDED_EXTENSIONS } from "./shared";

interface FrameworkRule {
  name: string;
  category: "framework" | "runtime";
  /** Match against file name (basename) */
  configPattern?: RegExp;
  /** Match against file content (line-level) */
  importPattern?: RegExp;
  configConfidence: ConfidenceLevel;
  importConfidence: ConfidenceLevel;
}

const rules: FrameworkRule[] = [
  // Frameworks
  {
    name: "nextjs",
    category: "framework",
    configPattern: /^next\.config\./,
    importPattern: /\bfrom\s+['"]next[\/'"]|\brequire\(\s*['"]next['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "react",
    category: "framework",
    importPattern: /\bfrom\s+['"]react['"]|\brequire\(\s*['"]react['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "express",
    category: "framework",
    importPattern: /\bfrom\s+['"]express['"]|\brequire\(\s*['"]express['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "fastify",
    category: "framework",
    importPattern: /\bfrom\s+['"]fastify['"]|\brequire\(\s*['"]fastify['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "nestjs",
    category: "framework",
    importPattern: /\bfrom\s+['"]@nestjs\/|\brequire\(\s*['"]@nestjs\//,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "hono",
    category: "framework",
    importPattern: /\bfrom\s+['"]hono['"]|\brequire\(\s*['"]hono['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "elysia",
    category: "framework",
    importPattern: /\bfrom\s+['"]elysia['"]|\brequire\(\s*['"]elysia['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "vite",
    category: "framework",
    configPattern: /^vite\.config\./,
    importPattern: /\bfrom\s+['"]vite['"]|\brequire\(\s*['"]vite['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  // Runtimes
  {
    name: "nodejs",
    category: "runtime",
    importPattern:
      /\bfrom\s+['"]node:(?:fs|http|path|crypto|stream)['"]|\bfrom\s+['"](?:fs|http|net|dgram)['"]|\brequire\(\s*['"](?:fs|http|path|crypto)['"]\)/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "bun",
    category: "runtime",
    importPattern: /\bBun\.serve\b|\bBun\.file\b|\bBun\.write\b/,
    configConfidence: "high",
    importConfidence: "medium",
  },
  {
    name: "deno",
    category: "runtime",
    importPattern: /\bDeno\.serve\b|\bDeno\.readFile\b|\bDeno\.env\b/,
    configConfidence: "high",
    importConfidence: "medium",
  },
];

const CONFIG_NAME_PATTERN = /^(next|vite)\.config\./;

function shouldProcess(file: { extension: string; relativePath: string }): boolean {
  if (EXTENDED_EXTENSIONS.has(file.extension)) return true;
  const basename = file.relativePath.split("/").pop() ?? "";
  return CONFIG_NAME_PATTERN.test(basename);
}

function findImportEvidence(lines: string[], pattern: RegExp, filePath: string): SignalEvidence[] {
  const evidence: SignalEvidence[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (pattern.test(line)) {
      evidence.push({ file: filePath, line: i + 1, snippet: line.trim().slice(0, 120) });
      if (evidence.length >= 3) break;
    }
  }
  return evidence;
}

export function detectFrameworks(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (!shouldProcess(file)) return [];

  const basename = file.relativePath.split("/").pop() ?? "";
  const seen = new Set<string>();
  const signals: DetectedSignal[] = [];

  for (const rule of rules) {
    if (rule.configPattern?.test(basename) && !seen.has(rule.name)) {
      seen.add(rule.name);
      signals.push({
        id: `${rule.category}-${rule.name}`,
        name: rule.name,
        category: rule.category,
        confidence: rule.configConfidence,
        evidence: [
          { file: file.relativePath, line: 1, snippet: `Config file detected: ${basename}` },
        ],
      });
    }

    if (!rule.importPattern) continue;
    const evidence = findImportEvidence(ctx.lines, rule.importPattern, file.relativePath);
    if (evidence.length > 0 && !seen.has(rule.name)) {
      seen.add(rule.name);
      signals.push({
        id: `${rule.category}-${rule.name}`,
        name: rule.name,
        category: rule.category,
        confidence: rule.importConfidence,
        evidence,
      });
    }
  }

  return signals;
}
