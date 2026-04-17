import type { BomComponentKind } from "../evidence/types";

export const KNOWN_AI_PACKAGES: Record<string, BomComponentKind> = {
  // Models / model runtimes
  "llama.cpp": "model",
  "llama-cpp-python": "model",
  "whisper.cpp": "model",
  ggml: "model",
  ctransformers: "model",

  // AI Frameworks
  transformers: "ai-framework",
  torch: "ai-framework",
  pytorch: "ai-framework",
  tensorflow: "ai-framework",
  "tensorflow-gpu": "ai-framework",
  jax: "ai-framework",
  keras: "ai-framework",
  "pytorch-lightning": "ai-framework",
  "scikit-learn": "ai-framework",
  sklearn: "ai-framework",
  xgboost: "ai-framework",
  lightgbm: "ai-framework",
  spacy: "ai-framework",
  "huggingface-hub": "ai-framework",
  diffusers: "ai-framework",
  accelerate: "ai-framework",
  peft: "ai-framework",
  trl: "ai-framework",
  onnxruntime: "ai-framework",
  "onnxruntime-gpu": "ai-framework",
  mlflow: "ai-framework",

  // Embeddings
  "sentence-transformers": "embedding",
  fastembed: "embedding",
  "openai-embeddings": "embedding",
  "cohere-embed": "embedding",

  // Inference Providers
  openai: "inference-provider",
  anthropic: "inference-provider",
  ollama: "inference-provider",
  vllm: "inference-provider",
  "together-ai": "inference-provider",
  replicate: "inference-provider",
  groq: "inference-provider",
  mistralai: "inference-provider",
  cohere: "inference-provider",
  "google-generativeai": "inference-provider",
  "@google/generative-ai": "inference-provider",
  ai21: "inference-provider",

  // Vector Stores
  pinecone: "vector-store",
  "pinecone-client": "vector-store",
  weaviate: "vector-store",
  "weaviate-client": "vector-store",
  qdrant: "vector-store",
  "qdrant-client": "vector-store",
  milvus: "vector-store",
  pymilvus: "vector-store",
  chromadb: "vector-store",
  "chromadb-client": "vector-store",
  pgvector: "vector-store",
  faiss: "vector-store",
  "faiss-cpu": "vector-store",
  "faiss-gpu": "vector-store",

  // Datasets
  datasets: "dataset",

  // Tools / Orchestration
  langchain: "tool",
  "langchain-core": "tool",
  "langchain-community": "tool",
  llamaindex: "tool",
  "llama-index": "tool",
  "semantic-kernel": "tool",
  autogen: "tool",
  crewai: "tool",
  dspy: "tool",
  "haystack-ai": "tool",
  guidance: "tool",
  guardrails: "tool",
  "guardrails-ai": "tool",
  lmql: "tool",
  outlines: "tool",
};

/**
 * Look up a package name in the known AI packages registry.
 * Returns the BomComponentKind if found, null otherwise.
 */
export function lookupKnownPackage(name: string): BomComponentKind | null {
  return KNOWN_AI_PACKAGES[name.toLowerCase()] ?? null;
}
