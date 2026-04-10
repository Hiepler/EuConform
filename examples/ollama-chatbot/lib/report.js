export function generateReport(conversation) {
  return {
    complianceReport: "local-ollama-chatbot",
    generatedAt: new Date().toISOString(),
    items: conversation,
  };
}

export function exportReport(conversation) {
  return JSON.stringify(generateReport(conversation), null, 2);
}
