import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChromaClient } from "chromadb";
import { Ollama } from "ollama";

const chroma = new ChromaClient({ path: "http://localhost:8000" });
const ollama = new Ollama({ host: "http://localhost:11434" });

export async function retrieveContext(query) {
  const vectorStore = {
    asRetriever() {
      return {
        async getRelevantDocuments(input) {
          return [{ pageContent: `retriever result for ${input}`, metadata: { source: "kb" } }];
        },
      };
    },
  };

  const retriever = vectorStore.asRetriever();
  const documents = await retriever.getRelevantDocuments(query);

  await chroma.listCollections();

  return { documents, retriever, vectorStore };
}

export async function runAiAssistedSearch(query) {
  const prompt = ChatPromptTemplate.fromTemplate(
    "Answer with retrieval context only. User question: {question}"
  );
  const context = await retrieveContext(query);
  const chainInput = await prompt.format({ question: query });
  const response = await ollama.generate({
    model: "llama3.2",
    prompt: chainInput,
  });

  return {
    answer: response.response,
    sources: context.documents.map((doc) => doc.metadata.source),
    vectorStore: "ChromaDB",
    retriever: "LangChain retriever",
  };
}
