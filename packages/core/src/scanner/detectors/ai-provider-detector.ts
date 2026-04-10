import type { DetectedSignal, DetectorContext } from "../../evidence/types";
import { SOURCE_EXTENSIONS } from "./shared";

// ---------------------------------------------------------------------------
// Provider patterns
// ---------------------------------------------------------------------------

interface ProviderPattern {
  id: string;
  name: string;
  /** Regex applied per line to detect imports/requires */
  importPattern: RegExp;
}

const PROVIDER_IMPORTS: ProviderPattern[] = [
  {
    id: "ai-provider-openai",
    name: "OpenAI SDK",
    importPattern: /(?:from\s+['"]openai['"]|require\s*\(\s*['"]openai['"])/,
  },
  {
    id: "ai-provider-anthropic",
    name: "Anthropic SDK",
    importPattern:
      /(?:from\s+['"]@anthropic-ai\/sdk['"]|require\s*\(\s*['"]@anthropic-ai\/sdk['"])/,
  },
  {
    id: "ai-provider-cohere",
    name: "Cohere SDK",
    importPattern: /(?:from\s+['"]cohere-ai['"]|require\s*\(\s*['"]cohere-ai['"])/,
  },
  {
    id: "ai-provider-google-genai",
    name: "Google Generative AI",
    importPattern:
      /(?:from\s+['"]@google\/generative-ai['"]|require\s*\(\s*['"]@google\/generative-ai['"])/,
  },
  {
    id: "ai-provider-mistral",
    name: "Mistral AI SDK",
    importPattern:
      /(?:from\s+['"]@mistralai\/mistralai['"]|require\s*\(\s*['"]@mistralai\/mistralai['"])/,
  },
];

interface ApiEndpoint {
  id: string;
  name: string;
  pattern: RegExp;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "ai-provider-openai-api",
    name: "OpenAI API endpoint",
    pattern: /api\.openai\.com/,
  },
  {
    id: "ai-provider-anthropic-api",
    name: "Anthropic API endpoint",
    pattern: /api\.anthropic\.com/,
  },
  {
    id: "ai-provider-cohere-api",
    name: "Cohere API endpoint",
    pattern: /api\.cohere\.ai/,
  },
];

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

export function detectAiProviderSignals(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (!SOURCE_EXTENSIONS.has(file.extension)) return [];

  const lines = ctx.lines;
  const signalMap = new Map<string, DetectedSignal>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const lineNum = i + 1;

    // Check import/require patterns
    for (const provider of PROVIDER_IMPORTS) {
      if (provider.importPattern.test(line)) {
        addEvidence(signalMap, provider.id, provider.name, "medium", {
          file: file.relativePath,
          line: lineNum,
          snippet: line.trim().slice(0, 200),
        });
      }
    }

    // Check API endpoint URLs
    for (const endpoint of API_ENDPOINTS) {
      if (endpoint.pattern.test(line)) {
        addEvidence(signalMap, endpoint.id, endpoint.name, "medium", {
          file: file.relativePath,
          line: lineNum,
          snippet: line.trim().slice(0, 200),
        });
      }
    }
  }

  return Array.from(signalMap.values());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addEvidence(
  map: Map<string, DetectedSignal>,
  id: string,
  name: string,
  confidence: "high" | "medium" | "low",
  evidence: { file: string; line?: number; snippet: string }
): void {
  const existing = map.get(id);
  if (existing) {
    existing.evidence.push(evidence);
  } else {
    map.set(id, {
      id,
      name,
      category: "ai-provider",
      confidence,
      evidence: [evidence],
    });
  }
}
