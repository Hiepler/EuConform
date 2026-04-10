import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../src/evidence/hash";

describe("sha256Hex", () => {
  it("produces correct hex digest for known input", () => {
    expect(sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("produces 64-character hex string", () => {
    const result = sha256Hex("test content");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("handles empty string", () => {
    const result = sha256Hex("");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("produces different hashes for different inputs", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});
