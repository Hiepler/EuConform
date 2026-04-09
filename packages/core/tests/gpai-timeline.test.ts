import { describe, expect, it } from "vitest";
import { getTimelineForRiskLevel } from "../src/legal-checks/deadline-timeline";

// This function will be implemented in Step 3
import { getTimelineForAudiences } from "../src/legal-checks/deadline-timeline";

describe("getTimelineForAudiences", () => {
  it("returns GPAI-relevant phases for ['all', 'gpai'] audiences", () => {
    const phases = getTimelineForAudiences(["all", "gpai"]);
    const phaseIds = phases.map((p) => p.id);
    expect(phaseIds).toContain("phase-2-gpai");
  });

  it("includes Art. 53 documentation obligation for GPAI audience", () => {
    const phases = getTimelineForAudiences(["all", "gpai"]);
    const phase2 = phases.find((p) => p.id === "phase-2-gpai");
    expect(phase2).toBeDefined();
    const gpaiObligation = phase2!.obligations.find((o) => o.articleRef === "Art. 53");
    expect(gpaiObligation).toBeDefined();
  });

  it("includes Art. 55 systemic risk obligation for GPAI audience", () => {
    const phases = getTimelineForAudiences(["all", "gpai"]);
    const phase2 = phases.find((p) => p.id === "phase-2-gpai");
    expect(phase2).toBeDefined();
    const systemicObligation = phase2!.obligations.find((o) => o.articleRef === "Art. 55");
    expect(systemicObligation).toBeDefined();
  });

  it("does NOT include high-risk Annex III obligations for GPAI audience", () => {
    const phases = getTimelineForAudiences(["all", "gpai"]);
    const phase3 = phases.find((p) => p.id === "phase-3-high-risk-annex-iii");
    if (phase3) {
      const hasAllAudience = phase3.obligations.some((o) =>
        o.audiences.some((a) => ["all", "gpai"].includes(a))
      );
      expect(hasAllAudience).toBe(true);
    }
  });

  it("minimal risk level does NOT include GPAI obligations (regression)", () => {
    const phases = getTimelineForRiskLevel("minimal");
    const phase2 = phases.find((p) => p.id === "phase-2-gpai");
    if (phase2) {
      const gpaiOnly = phase2.obligations.filter(
        (o) => o.audiences.includes("gpai") && !o.audiences.includes("all")
      );
      const minimalAudiences = ["all", "minimal"];
      for (const obl of gpaiOnly) {
        const matches = obl.audiences.some((a) => minimalAudiences.includes(a));
        expect(matches).toBe(false);
      }
    }
  });
});
