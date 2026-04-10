export function incidentReport(event) {
  return {
    type: "incident_report",
    createdAt: new Date().toISOString(),
    ...event,
  };
}
