import type {
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  SignalEvidence,
} from "../../evidence/types";
import { SOURCE_EXTENSIONS, higherConfidence } from "./shared";

// ---------------------------------------------------------------------------
// Detection rules
// ---------------------------------------------------------------------------

interface RagRule {
  id: string;
  name: string;
  pattern: RegExp;
  confidence: ConfidenceLevel;
}

// Explicit vector store imports (high confidence)
const IMPORT_RULES: RagRule[] = [
  {
    id: "rag-chromadb",
    name: "ChromaDB",
    pattern: /(?:from\s+['"]chromadb['"]|require\s*\(\s*['"]chromadb['"])/,
    confidence: "high",
  },
  {
    id: "rag-pinecone",
    name: "Pinecone",
    pattern:
      /(?:from\s+['"]@pinecone-database\/pinecone['"]|require\s*\(\s*['"]@pinecone-database\/pinecone['"])/,
    confidence: "high",
  },
  {
    id: "rag-weaviate",
    name: "Weaviate",
    pattern: /(?:from\s+['"]weaviate-client['"]|require\s*\(\s*['"]weaviate-client['"])/,
    confidence: "high",
  },
  {
    id: "rag-qdrant",
    name: "Qdrant",
    pattern:
      /(?:from\s+['"]@qdrant\/js-client-rest['"]|require\s*\(\s*['"]@qdrant\/js-client-rest['"])/,
    confidence: "high",
  },
  {
    id: "rag-pgvector",
    name: "pgvector",
    pattern: /(?:from\s+['"]pgvector['"]|require\s*\(\s*['"]pgvector['"])/,
    confidence: "high",
  },
  {
    id: "rag-faiss",
    name: "FAISS",
    pattern: /(?:from\s+['"]faiss-node['"]|require\s*\(\s*['"]faiss-node['"])/,
    confidence: "high",
  },
];

// Function call / usage patterns (medium confidence)
const USAGE_RULES: RagRule[] = [
  {
    id: "rag-embedding-call",
    name: "Embedding function call",
    pattern: /\.(?:createEmbedding|embedDocuments|embedQuery|embed)\s*\(/,
    confidence: "medium",
  },
  {
    id: "rag-retriever-pattern",
    name: "Retriever pattern",
    pattern:
      /\.(?:asRetriever|getRelevantDocuments|similaritySearch|similaritySearchWithScore)\s*\(/,
    confidence: "medium",
  },
  {
    id: "rag-vectorstore-usage",
    name: "Vector store usage",
    pattern: /(?:VectorStore|vectorStore|fromDocuments|fromTexts|addDocuments)\s*\(/,
    confidence: "medium",
  },
];

// Keyword patterns (low confidence)
const KEYWORD_RULES: RagRule[] = [
  {
    id: "rag-keyword-embedding",
    name: "Embedding keyword reference",
    pattern:
      /\b(?:text[_-]?embedding|embedding[_-]?(?:model|vector|dimension|size)|openai.*embedding|embedding[_-]?api)\b/i,
    confidence: "low",
  },
  {
    id: "rag-keyword-vector",
    name: "Vector keyword reference",
    pattern: /\b(?:vector(?:Store|DB|Database|Index))\b/,
    confidence: "low",
  },
  {
    id: "rag-keyword-retriever",
    name: "Retriever keyword reference",
    pattern: /\bretriever\b/i,
    confidence: "low",
  },
  {
    id: "rag-keyword-similarity",
    name: "Similarity search keyword",
    pattern: /\bsimilarity_search\b/,
    confidence: "low",
  },
];

// ---------------------------------------------------------------------------
// Combined rules (hoisted to module scope to avoid per-call reconstruction)
// ---------------------------------------------------------------------------

const ALL_RULES: RagRule[] = [...IMPORT_RULES, ...USAGE_RULES, ...KEYWORD_RULES];

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

export function detectRagSignals(ctx: DetectorContext): DetectedSignal[] {
  const { file } = ctx;
  if (!SOURCE_EXTENSIONS.has(file.extension)) return [];

  const lines = ctx.lines;
  const signalMap = new Map<string, DetectedSignal>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const lineNum = i + 1;

    for (const rule of ALL_RULES) {
      if (rule.pattern.test(line)) {
        const evidence: SignalEvidence = {
          file: file.relativePath,
          line: lineNum,
          snippet: line.trim().slice(0, 200),
        };

        const existing = signalMap.get(rule.id);
        if (existing) {
          existing.evidence.push(evidence);
          existing.confidence = higherConfidence(existing.confidence, rule.confidence);
        } else {
          signalMap.set(rule.id, {
            id: rule.id,
            name: rule.name,
            category: "rag",
            confidence: rule.confidence,
            evidence: [evidence],
          });
        }
      }
    }
  }

  return Array.from(signalMap.values());
}
