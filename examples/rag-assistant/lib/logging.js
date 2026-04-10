import pino from "pino";

export const structuredLogger = pino({ name: "rag-assistant-example" });

export function logRetrievalEvent(entry) {
  structuredLogger.info({ auditLog: true, ...entry }, "RAG request handled");
}
