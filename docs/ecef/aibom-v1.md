# `euconform.aibom.v1`

`euconform.aibom.v1` is the AI Bill of Materials document inside ECEF.

## What is an AI BOM?

An **AI BOM** is the AI equivalent of a software bill of materials:

- which models are present
- which providers and inference runtimes are used
- which RAG, embedding, or vector components are involved
- which compliance-relevant capabilities are detectable

## Purpose

- provide a stable machine-readable inventory layer
- separate technical composition from compliance interpretation
- support viewers, CI, and future bundle manifests

## Required fields

- `schemaVersion`
- `generatedAt`
- `project`
- `components`
- `complianceCapabilities`

## Component ID convention

Component IDs follow the pattern `kind:kebab-name`, e.g.:

- `runtime:node-js`
- `inference-provider:openai`
- `ai-framework:langchain`
- `vector-store:chromadb`

## Notes

- the AI BOM is a **sub-document** of ECEF, not the umbrella specification
- empty `components` is valid for non-AI projects
- `generatedAt` records when the inventory was produced (ISO 8601)

## Example

See [local Ollama example AIBOM](./examples/local-ollama/euconform.aibom.json).
