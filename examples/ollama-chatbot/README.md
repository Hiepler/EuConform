# Ollama Chatbot Reference Project

A minimal local AI chatbot that acts as a EuConform and EuConform Evidence Format reference project for
offline-first inference.

## What this example demonstrates

- local inference with [Ollama](https://ollama.ai)
- a user-facing AI disclosure in the chat route
- structured audit logging
- human review escalation for sensitive prompts
- JSON report export hooks that the scanner can see

## Running

1. Install and start Ollama: `ollama serve`
2. Pull a model: `ollama pull llama3.2`
3. Start the server: `npm start`
4. Send a message:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello"}'
```

## Scanning with EuConform

From the repo root:

```bash
pnpm --filter @euconform/cli build
node packages/cli/dist/index.js scan examples/ollama-chatbot --scope production --output examples/ollama-chatbot/.euconform
node packages/cli/dist/index.js verify examples/ollama-chatbot/.euconform/euconform.bundle.json
```

The canonical public EuConform Evidence Format artifact set for this scenario lives under
`docs/spec/examples/local-ollama/`.
