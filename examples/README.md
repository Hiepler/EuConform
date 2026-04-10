# EuConform Reference Projects

These projects are intentionally small OSS builder targets for `euconform scan`,
`euconform verify`, and the Web Viewer.

## Included projects

| Project | Focus | Path | Canonical ECEF artifacts |
| --- | --- | --- | --- |
| Ollama Chatbot | Local inference, disclosure, audit logging | `examples/ollama-chatbot` | `docs/ecef/examples/local-ollama/` |
| RAG Assistant | Retrieval, vector store, local inference | `examples/rag-assistant` | `docs/ecef/examples/rag/` |

## Golden path

```bash
pnpm --filter @euconform/cli build

node packages/cli/dist/index.js scan examples/ollama-chatbot --scope production --output /tmp/ecef-ollama
node packages/cli/dist/index.js verify /tmp/ecef-ollama/euconform.bundle.json

node packages/cli/dist/index.js scan examples/rag-assistant --scope production --output /tmp/ecef-rag
node packages/cli/dist/index.js verify /tmp/ecef-rag/euconform.bundle.zip
```

Open the generated artifacts in the EuConform web app to inspect the report visually after
verification.
