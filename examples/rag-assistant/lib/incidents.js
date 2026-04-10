export function incidentReport(event) {
  return {
    type: "incident_response",
    createdAt: new Date().toISOString(),
    ...event,
  };
}
