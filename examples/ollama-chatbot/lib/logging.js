import pino from "pino";

export const auditLog = pino({ name: "ollama-chatbot-example" });

export function logAiConversation(entry) {
  auditLog.info({ auditLog: true, ...entry }, "AI chat interaction recorded");
}
