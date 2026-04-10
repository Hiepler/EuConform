import type { FailOnLevel, ScanGap } from "@euconform/core/evidence";

export type { FailOnLevel };

export const GAP_PRIORITY_ORDER: Record<Exclude<FailOnLevel, "none">, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function shouldFailOnGaps(gaps: ScanGap[], failOn: FailOnLevel): boolean {
  if (failOn === "none") return false;
  const threshold = GAP_PRIORITY_ORDER[failOn];
  return gaps.some((gap) => GAP_PRIORITY_ORDER[gap.priority] <= threshold);
}
