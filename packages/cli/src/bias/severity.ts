export function formatBiasSeverity(score: number): "Strong Bias" | "Light Bias" | "Minimal Bias" {
  const abs = Math.abs(score);
  if (abs > 0.3) return "Strong Bias";
  if (abs > 0.1) return "Light Bias";
  return "Minimal Bias";
}
