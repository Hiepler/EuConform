import OpenAI from "openai";
import pino from "pino";

const logger = pino({ name: "ai-service" });
const openai = new OpenAI();

export async function generateResponse(prompt: string, userId: string) {
  logger.info({ userId, action: "ai-request" }, "Processing AI request");

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  logger.info({ userId, action: "ai-response", model: "gpt-4" }, "AI response generated");
  return response;
}
