export function requireHumanApproval(message) {
  const normalized = message.toLowerCase();
  return normalized.includes("medical") || normalized.includes("legal");
}

export function handleApproval(result) {
  return { approved: true, reviewedResult: result };
}
