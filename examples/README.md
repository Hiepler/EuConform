# EuConform Reference Projects

These projects are intentionally small OSS builder targets for `euconform scan`,
`euconform verify`, and the Web Viewer.

They demonstrate **structural** evidence: what a repository contains and what that implies.
They are not bias-measurement fixtures — bias measurement is a separate CLI command against
a Hugging Face model (`euconform bias <model> --engine transformers`), and the Ollama
backend of these examples is a scanned runtime, not a measurement engine.

## Included projects

| Project | Focus | Path | Canonical EuConform Evidence Format artifacts |
| --- | --- | --- | --- |
| Ollama Chatbot | Local inference, disclosure, audit logging | `examples/ollama-chatbot` | `docs/spec/examples/local-ollama/` |
| RAG Assistant | Retrieval, vector store, local inference | `examples/rag-assistant` | `docs/spec/examples/rag/` |

## Golden path

```bash
pnpm --filter @euconform/cli build

node packages/cli/dist/index.js scan examples/ollama-chatbot --scope production --output /tmp/euconform-ollama
node packages/cli/dist/index.js verify /tmp/euconform-ollama/euconform.bundle.json

node packages/cli/dist/index.js scan examples/rag-assistant --scope production --output /tmp/euconform-rag
node packages/cli/dist/index.js verify /tmp/euconform-rag/euconform.bundle.zip
```

Open the generated artifacts in the EuConform web app to inspect the report visually after
verification.
