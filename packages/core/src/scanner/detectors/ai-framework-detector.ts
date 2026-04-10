import type { DetectedSignal, DetectorContext } from "../../evidence/types";
import { SOURCE_EXTENSIONS } from "./shared";

// ---------------------------------------------------------------------------
// Framework patterns
// ---------------------------------------------------------------------------

interface FrameworkPattern {
  id: string;
  name: string;
  importPattern: RegExp;
}

const FRAMEWORK_IMPORTS: FrameworkPattern[] = [
  {
    id: "ai-framework-langchain",
    name: "LangChain",
    importPattern: /(?:from\s+['"]langchain[/'"]|require\s*\(\s*['"]langchain[/'"])/,
  },
  {
    id: "ai-framework-langchain-core",
    name: "LangChain Core",
    importPattern:
      /(?:from\s+['"]@langchain\/[^'"]+['"]|require\s*\(\s*['"]@langchain\/[^'"]+['"])/,
  },
  {
    id: "ai-framework-llamaindex",
    name: "LlamaIndex",
    importPattern: /(?:from\s+['"]llamaindex[/'"]|require\s*\(\s*['"]llamaindex[/'"])/,
  },
  {
    id: "ai-framework-transformers",
    name: "Transformers.js",
    importPattern:
      /(?:from\s+['"]@xenova\/transformers['"]|require\s*\(\s*['"]@xenova\/transformers['"])/,
  },
  {
    id: "ai-framework-vercel-ai",
    name: "Vercel AI SDK",
    // Only match Vercel AI SDK subpath imports (ai/react, ai/rsc) to avoid false positives
    // on generic "ai" package name. Bare "ai" import matched only with package.json cross-check.
    importPattern:
      /(?:from\s+['"]ai\/(?:react|rsc|svelte|vue|solid|core)['"']|require\s*\(\s*['"]ai\/(?:react|rsc|svelte|vue|solid|core)['"])/,
  },
  {
    id: "ai-framework-huggingface",
    name: "HuggingFace",
    importPattern:
      /(?:from\s+['"]@huggingface\/[^'"]+['"]|require\s*\(\s*['"]@huggingface\/[^'"]+['"])/,
  },
];

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

export function detectAiFrameworkSignals(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (!SOURCE_EXTENSIONS.has(file.extension)) return [];

  const lines = ctx.lines;
  const signalMap = new Map<string, DetectedSignal>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const lineNum = i + 1;

    for (const framework of FRAMEWORK_IMPORTS) {
      if (framework.importPattern.test(line)) {
        const existing = signalMap.get(framework.id);
        const evidence = {
          file: file.relativePath,
          line: lineNum,
          snippet: line.trim().slice(0, 200),
        };

        if (existing) {
          existing.evidence.push(evidence);
        } else {
          signalMap.set(framework.id, {
            id: framework.id,
            name: framework.name,
            category: "ai-framework",
            confidence: "medium",
            evidence: [evidence],
          });
        }
      }
    }
  }

  return Array.from(signalMap.values());
}
