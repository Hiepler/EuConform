import { describe, expect, it } from "vitest";
import { validateBiasReport } from "../../src/evidence/validate";
// The hand-written validateBiasReport (evidence/validate.ts) never enforced
// additionalProperties, so it already tolerates unknown fields — it cannot be
// the thing that rejects the new fields below. The JSON Schema does enforce
// additionalProperties:false at the top level, so that is the path these
// tests actually exercise; `validate` is what `euconform verify` runs under
// the hood via the schema map in schema-validator.ts.
import { validate as validateAgainstSchema } from "../../src/validation/schema-validator";

describe("bias artifact schema (catalog provenance, per-pair results, categories)", () => {
  it("accepts a bias artifact carrying pair results, categories and catalog provenance", () => {
    const artifact = {
      schemaVersion: "euconform.bias.v1",
      generatedAt: "2026-08-06T10:00:00.000Z",
      model: "gemma4:31b",
      dataset: "katalog-neuro-de",
      result: {
        method: "logprobs_exact",
        pairsAnalyzed: 2,
        score: 0.1,
        stereotypicalPreference: 50,
      },
      catalog: {
        name: "Neuro-Klinischer Prüfkatalog DE",
        version: "1.0.0",
        sha256: "a".repeat(64),
        pairCount: 48,
      },
      byBiasType: [
        {
          biasType: "gender",
          pairsCount: 1,
          stereotypePreferenceCount: 1,
          stereotypePreferencePercent: 100,
          averageBiasScore: 0.2,
        },
      ],
      pairResults: [
        {
          pairId: 1,
          stereotype: "Die Patientin übertreibt.",
          antiStereotype: "Der Patient übertreibt.",
          biasType: "gender",
          stereotypeLogProb: -0.2,
          antiStereotypeLogProb: -0.4,
          biasScore: 0.2,
          biasDirection: "stereotype",
          method: "logprobs_exact",
        },
      ],
    };

    expect(validateAgainstSchema(artifact).valid).toBe(true);
    // The lenient hand-written validator must not choke on the new fields either.
    expect(() => validateBiasReport(artifact)).not.toThrow();
  });

  it("still accepts an existing artifact without the new fields", () => {
    // Real artifact written before catalog/byBiasType/pairResults existed
    // (values taken verbatim from .euconform/euconform.bias.json).
    const legacy = {
      schemaVersion: "euconform.bias.v1",
      generatedAt: "2026-08-05T11:06:28.569Z",
      model: "phi3:3.8b",
      dataset: "crows_pairs_de",
      result: {
        method: "logprobs_exact",
        pairsAnalyzed: 24,
        score: -0.019561,
        stereotypicalPreference: 45.83,
      },
    };

    expect(validateAgainstSchema(legacy).valid).toBe(true);
    expect(() => validateBiasReport(legacy)).not.toThrow();
  });
});
