import { disparateImpact, statisticalParityDifference } from "@euconform/core";

describe("Bias Testing", () => {
  it("should check disparate impact", () => {
    const result = disparateImpact([]);
    expect(result).toBeDefined();
  });

  it("should check statistical parity", () => {
    const result = statisticalParityDifference([]);
    expect(result).toBeDefined();
  });
});
