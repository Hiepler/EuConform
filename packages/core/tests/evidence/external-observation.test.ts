import { describe, expect, it } from "vitest";
import {
  type ExternalObservation,
  validateEcefJsonDocument,
  validateExternalObservation,
} from "../../src/evidence";
import { validate } from "../../src/validation";

const SHA = "a".repeat(64);

function observation(overrides: Record<string, unknown> = {}): ExternalObservation {
  return {
    schemaVersion: "euconform.external-observation.v1",
    observationId: "obs_01J9Z6K3Q8",
    observedAt: "2026-10-29T12:00:00Z",
    provider: {
      name: "example-rights-observer",
      version: "1.0.0",
      endpoint: "https://api.example.com/v1/rights/preflight",
    },
    subject: {
      kind: "url",
      identifier: "https://example.com/dataset",
      retrievedAt: "2026-10-29T11:59:41Z",
      contentSha256: SHA,
    },
    observation: {
      kind: "rights-declaration",
      intendedUse: ["ai-input", "ai-train"],
      result: "declared",
      declaration: {
        text: "AI training permitted for non-commercial research only.",
        sha256: SHA,
        url: "https://example.com/dataset/terms",
        license: "CC-BY-NC-4.0",
      },
    },
    limitations: ["Coverage limited to reviewed origins."],
    ...overrides,
  };
}

function schemaValid(document: unknown): boolean {
  return validate(document).valid;
}

describe("euconform.external-observation.v1 schema", () => {
  it("accepts a declared observation with a signature", () => {
    const withSignature = observation({
      signature: {
        algorithm: "ed25519",
        keyId: "provider-2026-01",
        value: "base64-signature",
        signedPayloadSha256: SHA,
      },
    });

    expect(schemaValid(withSignature)).toBe(true);
    expect(validate(withSignature).schemaType).toBe("external-observation.v1");
  });

  it("accepts 'unknown' without a declaration", () => {
    const unknown = observation({
      observation: { kind: "rights-declaration", intendedUse: ["ai-train"], result: "unknown" },
    });

    expect(schemaValid(unknown)).toBe(true);
  });

  it("requires the declaration when the result is 'declared'", () => {
    const withoutDeclaration = observation({
      observation: { kind: "rights-declaration", intendedUse: ["ai-train"], result: "declared" },
    });

    const result = validate(withoutDeclaration);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("declaration"))).toBe(true);
  });

  it("rejects permission-shaped results", () => {
    const permitted = observation({
      observation: { kind: "rights-declaration", intendedUse: ["ai-train"], result: "permitted" },
    });

    expect(schemaValid(permitted)).toBe(false);
  });

  it("rejects a permission field even though the rest is valid", () => {
    const withPermission = { ...observation(), permission: true };

    const result = validate(withPermission);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("additional properties"))).toBe(true);
  });

  it("requires at least one stated limitation", () => {
    expect(schemaValid(observation({ limitations: [] }))).toBe(false);
    expect(schemaValid(observation({ limitations: undefined }))).toBe(false);
  });

  it("rejects unknown schema versions", () => {
    const result = validate({
      ...observation(),
      schemaVersion: "euconform.external-observation.v2",
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/Unknown schemaVersion/);
  });

  it("requires the integrity fields of a present signature", () => {
    const partialSignature = observation({
      signature: { algorithm: "ed25519", keyId: "k", value: "v" },
    });

    expect(schemaValid(partialSignature)).toBe(false);
  });
});

describe("validateExternalObservation", () => {
  it("accepts a valid observation and returns it unchanged", () => {
    const document = observation();
    expect(validateExternalObservation(document)).toEqual(document);
  });

  it("rejects a missing provider name", () => {
    const broken = observation({ provider: { version: "1.0.0" } });
    expect(() => validateExternalObservation(broken)).toThrow(/provider\.name/);
  });

  it("rejects a missing subject retrieval timestamp", () => {
    const broken = observation({
      subject: { kind: "url", identifier: "https://example.com" },
    });
    expect(() => validateExternalObservation(broken)).toThrow(/subject\.retrievedAt/);
  });

  it("rejects a declared result without a checkable declaration", () => {
    const broken = observation({
      observation: { kind: "rights-declaration", intendedUse: ["ai-train"], result: "declared" },
    });
    expect(() => validateExternalObservation(broken)).toThrow(/observation\.declaration/);
  });

  it("rejects a declaration without its hash", () => {
    const broken = observation({
      observation: {
        kind: "rights-declaration",
        intendedUse: ["ai-train"],
        result: "declared",
        declaration: { text: "permitted" },
      },
    });
    expect(() => validateExternalObservation(broken)).toThrow(/declaration\.sha256/);
  });

  it("explains why an observation without limitations is rejected", () => {
    const broken = observation({ limitations: [] });
    expect(() => validateExternalObservation(broken)).toThrow(/not reviewable/);
  });

  it("is reachable through the generic document dispatcher", () => {
    const document = observation();
    expect(validateEcefJsonDocument("euconform.external-observation.v1", document)).toEqual(
      document
    );
  });
});
