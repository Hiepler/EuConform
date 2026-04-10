import { ChromaClient } from "chromadb";
import express from "express";
import { Ollama } from "ollama";

const app = express();
const ollama = new Ollama({ host: "http://localhost:11434" });
const chroma = new ChromaClient();

app.post("/chat", async (req, res) => {
  const collection = await chroma.getCollection({ name: "docs" });
  const results = await collection.query({ queryTexts: [req.body.query] });
  const context = results.documents.flat().join("\n");

  const response = await ollama.chat({
    model: "llama3.2",
    messages: [{ role: "user", content: `Context: ${context}\n\nQuestion: ${req.body.query}` }],
  });
  res.json({ answer: response.message.content });
});

app.listen(3000);
