import type {
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  SignalCategory,
  SignalEvidence,
} from "../../evidence/types";

// ---------------------------------------------------------------------------
// .env file detection — variable names only, never values
// ---------------------------------------------------------------------------

interface EnvKeyRule {
  id: string;
  name: string;
  category: SignalCategory;
  pattern: RegExp;
  confidence: ConfidenceLevel;
}

const envKeyRules: EnvKeyRule[] = [
  {
    id: "ai-provider-openai",
    name: "OpenAI API key",
    category: "ai-provider",
    pattern: /^OPENAI_API_KEY\b/,
    confidence: "high",
  },
  {
    id: "ai-provider-anthropic",
    name: "Anthropic API key",
    category: "ai-provider",
    pattern: /^ANTHROPIC_API_KEY\b/,
    confidence: "high",
  },
  {
    id: "ai-provider-azure-openai",
    name: "Azure OpenAI key",
    category: "ai-provider",
    pattern: /^AZURE_OPENAI_/,
    confidence: "high",
  },
  {
    id: "ai-provider-google-ai",
    name: "Google AI key",
    category: "ai-provider",
    pattern: /^(?:GOOGLE_AI_API_KEY|GEMINI_API_KEY)\b/,
    confidence: "high",
  },
  {
    id: "ai-provider-cohere",
    name: "Cohere API key",
    category: "ai-provider",
    pattern: /^COHERE_API_KEY\b/,
    confidence: "high",
  },
  {
    id: "ai-provider-replicate",
    name: "Replicate API token",
    category: "ai-provider",
    pattern: /^REPLICATE_API_TOKEN\b/,
    confidence: "high",
  },
  {
    id: "ai-provider-huggingface",
    name: "HuggingFace token",
    category: "ai-provider",
    pattern: /^HUGGINGFACE_TOKEN\b|^HF_TOKEN\b/,
    confidence: "high",
  },
  {
    id: "local-inference-ollama",
    name: "Ollama host config",
    category: "local-inference",
    pattern: /^OLLAMA_HOST\b|^OLLAMA_BASE_URL\b/,
    confidence: "high",
  },
  {
    id: "rag-pinecone",
    name: "Pinecone API key",
    category: "rag",
    pattern: /^PINECONE_API_KEY\b/,
    confidence: "high",
  },
  {
    id: "rag-weaviate",
    name: "Weaviate config",
    category: "rag",
    pattern: /^WEAVIATE_/,
    confidence: "high",
  },
  {
    id: "rag-chroma",
    name: "ChromaDB config",
    category: "rag",
    pattern: /^CHROMA_/,
    confidence: "high",
  },
];

// ---------------------------------------------------------------------------
// Docker Compose detection
// ---------------------------------------------------------------------------

interface DockerServiceRule {
  id: string;
  name: string;
  category: SignalCategory;
  pattern: RegExp;
  confidence: ConfidenceLevel;
}

const dockerServiceRules: DockerServiceRule[] = [
  {
    id: "local-inference-ollama-docker",
    name: "Ollama Docker service",
    category: "local-inference",
    pattern: /\bollama\/ollama\b|image:\s*ollama/,
    confidence: "high",
  },
  {
    id: "rag-chromadb-docker",
    name: "ChromaDB Docker service",
    category: "rag",
    pattern: /\bchromadb\/chroma\b|image:\s*chroma/,
    confidence: "high",
  },
  {
    id: "rag-weaviate-docker",
    name: "Weaviate Docker service",
    category: "rag",
    pattern: /\bsemitechnologies\/weaviate\b|image:\s*weaviate/,
    confidence: "high",
  },
  {
    id: "rag-redis-vector",
    name: "Redis with vector module",
    category: "rag",
    pattern: /redis\/redis-stack|redisearch|redis-stack-server/,
    confidence: "high",
  },
  {
    id: "rag-qdrant-docker",
    name: "Qdrant Docker service",
    category: "rag",
    pattern: /\bqdrant\/qdrant\b|image:\s*qdrant/,
    confidence: "high",
  },
];

// ---------------------------------------------------------------------------
// Dockerfile detection
// ---------------------------------------------------------------------------

interface DockerfileRule {
  id: string;
  name: string;
  category: SignalCategory;
  pattern: RegExp;
  confidence: ConfidenceLevel;
}

const dockerfileRules: DockerfileRule[] = [
  {
    id: "local-inference-pip-ai",
    name: "AI pip packages in Dockerfile",
    category: "local-inference",
    pattern:
      /pip\s+install\s+.*\b(?:torch|tensorflow|transformers|langchain|llama[-_]?cpp|vllm|onnxruntime)\b/,
    confidence: "high",
  },
  {
    id: "local-inference-model-download",
    name: "Model download in Dockerfile",
    category: "local-inference",
    pattern:
      /\b(?:huggingface-cli\s+download|wget\s+.*(?:\.gguf|\.safetensors|\.bin)|COPY\s+.*(?:model|weights))\b/i,
    confidence: "high",
  },
];

// ---------------------------------------------------------------------------
// File matching helpers
// ---------------------------------------------------------------------------

function isEnvExample(relativePath: string): boolean {
  const basename = relativePath.split("/").pop() ?? "";
  return /^\.env\.(?:example|sample)$/.test(basename);
}

function isDockerCompose(relativePath: string): boolean {
  const basename = relativePath.split("/").pop() ?? "";
  return /^docker-compose/.test(basename);
}

function isDockerfile(relativePath: string): boolean {
  const basename = relativePath.split("/").pop() ?? "";
  return /^Dockerfile/.test(basename);
}

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

export function detectConfig(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  const signals: DetectedSignal[] = [];

  const lines = ctx.lines;

  if (isEnvExample(file.relativePath)) {
    detectEnvKeys(file.relativePath, lines, signals);
  } else if (isDockerCompose(file.relativePath)) {
    detectDockerServices(file.relativePath, lines, signals);
  } else if (isDockerfile(file.relativePath)) {
    detectDockerfilePatterns(file.relativePath, lines, signals);
  }

  return signals;
}

function extractEnvVarName(rawLine: string): string | null {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) return null;
  const eqIndex = line.indexOf("=");
  return eqIndex >= 0 ? line.slice(0, eqIndex).trim() : line.trim();
}

function detectEnvKeys(relativePath: string, lines: string[], signals: DetectedSignal[]): void {
  for (const rule of envKeyRules) {
    const evidence: SignalEvidence[] = [];

    for (let i = 0; i < lines.length; i++) {
      const varName = extractEnvVarName(lines[i] ?? "");
      if (varName && rule.pattern.test(varName)) {
        evidence.push({ file: relativePath, line: i + 1, snippet: varName });
      }
    }

    if (evidence.length > 0) {
      signals.push({
        id: rule.id,
        name: rule.name,
        category: rule.category,
        confidence: rule.confidence,
        evidence,
      });
    }
  }
}

function detectDockerServices(
  relativePath: string,
  lines: string[],
  signals: DetectedSignal[]
): void {
  for (const rule of dockerServiceRules) {
    const evidence: SignalEvidence[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (rule.pattern.test(line)) {
        evidence.push({
          file: relativePath,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
        });
        if (evidence.length >= 3) break;
      }
    }

    if (evidence.length > 0) {
      signals.push({
        id: rule.id,
        name: rule.name,
        category: rule.category,
        confidence: rule.confidence,
        evidence,
      });
    }
  }
}

function detectDockerfilePatterns(
  relativePath: string,
  lines: string[],
  signals: DetectedSignal[]
): void {
  for (const rule of dockerfileRules) {
    const evidence: SignalEvidence[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (rule.pattern.test(line)) {
        evidence.push({
          file: relativePath,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
        });
        if (evidence.length >= 3) break;
      }
    }

    if (evidence.length > 0) {
      signals.push({
        id: rule.id,
        name: rule.name,
        category: rule.category,
        confidence: rule.confidence,
        evidence,
      });
    }
  }
}
