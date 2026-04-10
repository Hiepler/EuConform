import type {
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  SignalEvidence,
} from "../../evidence/types";
import { EXTENDED_EXTENSIONS } from "./shared";

// ---------------------------------------------------------------------------
// Detection rules
// ---------------------------------------------------------------------------

interface DetectionRule {
  id: string;
  name: string;
  pattern: RegExp;
  confidence: ConfidenceLevel;
  /** File extensions this rule applies to. Empty = all allowed extensions. */
  extensions?: string[];
}

const RULES: DetectionRule[] = [
  // Ollama API URL
  {
    id: "local-inference-ollama-api",
    name: "Ollama API (localhost:11434)",
    pattern: /localhost:11434/,
    confidence: "high",
  },
  // Ollama imports
  {
    id: "local-inference-ollama-import",
    name: "Ollama SDK import",
    pattern:
      /(?:from\s+['"](?:ollama|@ollama\/ollama)['"]|require\s*\(\s*['"](?:ollama|@ollama\/ollama)['"])/,
    confidence: "medium",
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  // Transformers.js browser usage (pipeline / env)
  {
    id: "local-inference-transformers-browser",
    name: "Transformers.js (browser inference)",
    pattern: /(?:from\s+['"]@xenova\/transformers['"]|\.pipeline\s*\(|env\.allowLocalModels)/,
    confidence: "medium",
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  // ONNX Runtime
  {
    id: "local-inference-onnx",
    name: "ONNX Runtime",
    pattern:
      /(?:from\s+['"]onnxruntime[^'"]*['"]|require\s*\(\s*['"]onnxruntime[^'"]*['"]|onnxruntime)/,
    confidence: "medium",
  },
  // llama.cpp references
  {
    id: "local-inference-llamacpp",
    name: "llama.cpp",
    pattern: /llama\.cpp|llama-cpp|llamacpp/,
    confidence: "medium",
  },
  // Docker Compose ollama service
  {
    id: "local-inference-ollama-docker",
    name: "Ollama Docker service",
    pattern: /ollama\/ollama|image:\s*ollama/,
    confidence: "high",
    extensions: [".yaml", ".yml", ".json"],
  },
];

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

function matchRuleToLine(
  rule: (typeof RULES)[number],
  line: string,
  lineNum: number,
  filePath: string,
  signalMap: Map<string, DetectedSignal>
): void {
  if (!rule.pattern.test(line)) return;

  const evidence: SignalEvidence = {
    file: filePath,
    line: lineNum,
    snippet: line.trim().slice(0, 200),
  };

  const existing = signalMap.get(rule.id);
  if (existing) {
    existing.evidence.push(evidence);
    if (rule.confidence === "high") existing.confidence = "high";
  } else {
    signalMap.set(rule.id, {
      id: rule.id,
      name: rule.name,
      category: "local-inference",
      confidence: rule.confidence,
      evidence: [evidence],
    });
  }
}

export function detectLocalInferenceSignals(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (!EXTENDED_EXTENSIONS.has(file.extension)) return [];

  const lines = ctx.lines;
  const signalMap = new Map<string, DetectedSignal>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    for (const rule of RULES) {
      if (rule.extensions && !rule.extensions.includes(file.extension)) continue;
      matchRuleToLine(rule, line, i + 1, file.relativePath, signalMap);
    }
  }

  return Array.from(signalMap.values());
}
