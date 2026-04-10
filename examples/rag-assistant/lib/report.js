export function generateReport(query, result) {
  return {
    complianceReport: "rag-assistant-example",
    generatedAt: new Date().toISOString(),
    query,
    result,
  };
}

export function exportReport(query, result) {
  return JSON.stringify(generateReport(query, result), null, 2);
}
