# Ollama Chatbot Example

A minimal local AI chatbot powered by [Ollama](https://ollama.ai).

## AI Disclosure

This application uses a local large language model (LLM) via Ollama to generate conversational responses. All outputs are AI-generated and should be reviewed by the user.

## Running

1. Install and start Ollama: `ollama serve`
2. Pull a model: `ollama pull llama3.2`
3. Start the server: `npm start`
4. Send a message: `curl -X POST http://localhost:3000/chat -H 'Content-Type: application/json' -d '{"message":"Hello"}'`

## Scanning with EuConform

```bash
euconform scan .
```
