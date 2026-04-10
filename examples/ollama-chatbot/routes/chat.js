import { Ollama } from "ollama";
import { incidentReport } from "../lib/incidents.js";
import { logAiConversation } from "../lib/logging.js";
import { exportReport } from "../lib/report.js";
import { handleApproval, requireHumanApproval } from "../lib/review.js";

const ollama = new Ollama({ host: "http://localhost:11434" });

export function createChatHandler() {
  return async function chatRoute(req, res) {
    const { message } = req.body;
    const response = await ollama.chat({
      model: "llama3.2",
      messages: [{ role: "user", content: message }],
    });

    const result = {
      reply: response.message.content,
      notice: "This response was AI-generated via a local Ollama model.",
      manualReviewRequired: requireHumanApproval(message),
    };

    logAiConversation({ message, result });

    if (result.manualReviewRequired) {
      const incident = incidentReport({
        severity: "medium",
        reason: "manual_review_required",
      });
      return res.json({
        ...handleApproval(result),
        incident,
        exportReport: exportReport([{ message, result }]),
      });
    }

    return res.json({
      ...result,
      exportReport: exportReport([{ message, result }]),
    });
  };
}
