import { basename } from "node:path";
import type { DetectedSignal, DetectorContext, SignalCategory } from "../../evidence/types";
import { escapeRegex } from "./shared";

// ---------------------------------------------------------------------------
// Known package mappings
// ---------------------------------------------------------------------------

interface PackageInfo {
  category: SignalCategory;
  label: string;
}

const AI_PACKAGES: Record<string, PackageInfo> = {
  // Providers
  openai: { category: "ai-provider", label: "OpenAI SDK" },
  "@anthropic-ai/sdk": { category: "ai-provider", label: "Anthropic SDK" },
  "cohere-ai": { category: "ai-provider", label: "Cohere SDK" },
  "@google/generative-ai": { category: "ai-provider", label: "Google Generative AI" },
  "@mistralai/mistralai": { category: "ai-provider", label: "Mistral AI SDK" },

  // Frameworks
  langchain: { category: "ai-framework", label: "LangChain" },
  "@langchain/core": { category: "ai-framework", label: "LangChain Core" },
  llamaindex: { category: "ai-framework", label: "LlamaIndex" },
  "@xenova/transformers": { category: "ai-framework", label: "Transformers.js" },
  ai: { category: "ai-framework", label: "Vercel AI SDK" },
  "@huggingface/inference": { category: "ai-framework", label: "HuggingFace Inference" },

  // Local inference
  ollama: { category: "local-inference", label: "Ollama" },
  "@ollama/ollama": { category: "local-inference", label: "Ollama SDK" },

  // RAG / Vector
  chromadb: { category: "rag", label: "ChromaDB" },
  "@pinecone-database/pinecone": { category: "rag", label: "Pinecone" },
  "weaviate-client": { category: "rag", label: "Weaviate" },
  "@qdrant/js-client-rest": { category: "rag", label: "Qdrant" },
  pgvector: { category: "rag", label: "pgvector" },

  // Bias / Eval
  "@euconform/core": { category: "compliance-bias", label: "EuConform Core" },
};

const FRAMEWORK_PACKAGES: Record<string, PackageInfo> = {
  next: { category: "framework", label: "Next.js" },
  react: { category: "framework", label: "React" },
  express: { category: "framework", label: "Express" },
  fastify: { category: "framework", label: "Fastify" },
  "@nestjs/core": { category: "framework", label: "NestJS" },
  hono: { category: "framework", label: "Hono" },
  elysia: { category: "framework", label: "Elysia" },
};

const ALL_PACKAGES: Record<string, PackageInfo> = {
  ...AI_PACKAGES,
  ...FRAMEWORK_PACKAGES,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PACKAGE_JSON_NAMES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

function isPackageJsonFile(relativePath: string): boolean {
  return PACKAGE_JSON_NAMES.has(basename(relativePath));
}

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

export function detectPackageJsonSignals(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (!isPackageJsonFile(file.relativePath)) return [];

  const fileName = basename(file.relativePath);

  if (fileName === "package.json") {
    return detectFromPackageJson(file.relativePath, file.content);
  }

  // Lock files — scan for known package name strings
  return detectFromLockFile(file.relativePath, file.content);
}

// ---------------------------------------------------------------------------
// package.json detection
// ---------------------------------------------------------------------------

function detectFromPackageJson(filePath: string, content: string): DetectedSignal[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return [];
  }

  const signals: DetectedSignal[] = [];
  const deps = {
    ...(parsed.dependencies as Record<string, string> | undefined),
    ...(parsed.devDependencies as Record<string, string> | undefined),
  };

  for (const [pkg, info] of Object.entries(ALL_PACKAGES)) {
    if (pkg in deps) {
      const version = deps[pkg] ?? "unknown";
      signals.push({
        id: `${info.category}-${pkg.replace(/[@/]/g, "").replace(/\s/g, "-")}`,
        name: info.label,
        category: info.category,
        confidence: "high",
        evidence: [
          {
            file: filePath,
            snippet: `"${pkg}": "${version}"`,
          },
        ],
      });
    }
  }

  // Monorepo signals
  if (parsed.workspaces) {
    signals.push({
      id: "runtime-monorepo-workspaces",
      name: "Monorepo (workspaces)",
      category: "runtime",
      confidence: "high",
      evidence: [
        {
          file: filePath,
          snippet: `"workspaces": ${JSON.stringify(parsed.workspaces).slice(0, 120)}`,
        },
      ],
    });
  }

  const devDeps = parsed.devDependencies as Record<string, string> | undefined;
  if (devDeps && "turbo" in devDeps) {
    signals.push({
      id: "runtime-monorepo-turbo",
      name: "Monorepo (Turborepo)",
      category: "runtime",
      confidence: "high",
      evidence: [
        {
          file: filePath,
          snippet: `"turbo": "${devDeps.turbo}"`,
        },
      ],
    });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Lock-file detection (string search, no full parse)
// ---------------------------------------------------------------------------

// Pre-compiled lock-file patterns — avoids RegExp construction on every call
const LOCK_FILE_PATTERNS: Map<string, RegExp> = new Map(
  Object.keys(AI_PACKAGES).map((pkg) => [pkg, new RegExp(`["'/]${escapeRegex(pkg)}["'/@:]`)])
);

function detectFromLockFile(filePath: string, content: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  const seen = new Set<string>();

  for (const [pkg, info] of Object.entries(AI_PACKAGES)) {
    if (seen.has(pkg)) continue;

    // Use boundary-aware pattern to avoid false positives on short names
    // Lock files quote package names or use them as path segments
    const pattern = LOCK_FILE_PATTERNS.get(pkg);
    if (!pattern) continue;
    if (pattern.test(content)) {
      seen.add(pkg);
      signals.push({
        id: `${info.category}-${pkg.replace(/[@/]/g, "").replace(/\s/g, "-")}`,
        name: info.label,
        category: info.category,
        confidence: "medium",
        evidence: [
          {
            file: filePath,
            snippet: `Found "${pkg}" in lock file`,
          },
        ],
      });
    }
  }

  return signals;
}
