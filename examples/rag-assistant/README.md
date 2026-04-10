# RAG Assistant Reference Project

A minimal retrieval-augmented generation service that acts as a EuConform and ECEF
reference project for local/private RAG systems.

## What this example demonstrates

- LangChain-style orchestration
- ChromaDB as a vector store
- Ollama as the local inference backend
- user-facing AI disclosure on the query route
- structured logging, incident hooks, and report export

## Running

This project is a reference repo first. It is intentionally lightweight and optimized for
scanner and documentation workflows.

## Scanning with EuConform

From the repo root:

```bash
pnpm --filter @euconform/cli build
node packages/cli/dist/index.js scan examples/rag-assistant --scope production --output examples/rag-assistant/ecef
node packages/cli/dist/index.js verify examples/rag-assistant/ecef/euconform.bundle.json
```

The canonical public ECEF artifact set for this scenario lives under
`docs/ecef/examples/rag/`.
