import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCustomDataset } from "../src/datasets/crows-pairs";

function writeCatalog(content: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "katalog-"));
  const file = join(dir, "katalog.json");
  writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content));
  return file;
}

const valid = {
  metadata: { name: "Testkatalog", version: "1.0.0" },
  pairs: [
    {
      id: 1,
      stereotype: "Die Patientin übertreibt.",
      antiStereotype: "Der Patient übertreibt.",
      biasType: "gender",
    },
    {
      id: 2,
      stereotype: "Der ältere Patient ist verwirrt.",
      antiStereotype: "Der jüngere Patient ist verwirrt.",
      biasType: "age",
    },
  ],
};

describe("loadCustomDataset", () => {
  it("maps catalog pairs into the engine's entry shape", () => {
    const { pairs } = loadCustomDataset(writeCatalog(valid));
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({
      id: 1,
      sent_more: "Die Patientin übertreibt.",
      sent_less: "Der Patient übertreibt.",
      bias_type: "gender",
    });
  });

  it("reports name, version, pair count and a content hash", () => {
    const { metadata } = loadCustomDataset(writeCatalog(valid));
    expect(metadata.name).toBe("Testkatalog");
    expect(metadata.version).toBe("1.0.0");
    expect(metadata.pairCount).toBe(2);
    expect(metadata.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a stable hash for identical content", () => {
    const a = loadCustomDataset(writeCatalog(valid)).metadata.sha256;
    const b = loadCustomDataset(writeCatalog(valid)).metadata.sha256;
    expect(a).toBe(b);
  });

  it("fails loudly when the file is missing", () => {
    expect(() => loadCustomDataset("/nicht/vorhanden.json")).toThrow(/nicht gefunden/i);
  });

  it("fails loudly on broken JSON", () => {
    expect(() => loadCustomDataset(writeCatalog("{kaputt"))).toThrow(/kein gültiges JSON/i);
  });

  it("fails loudly when pairs are missing or empty", () => {
    expect(() => loadCustomDataset(writeCatalog({ metadata: {}, pairs: [] }))).toThrow(
      /keine Paare/i
    );
    expect(() => loadCustomDataset(writeCatalog({ metadata: {} }))).toThrow(/keine Paare/i);
  });

  it("names the offending pair when a sentence is missing", () => {
    const broken = {
      metadata: {},
      pairs: [{ id: 4, stereotype: "nur einer", biasType: "gender" }],
    };
    expect(() => loadCustomDataset(writeCatalog(broken))).toThrow(/Paar 4/);
  });
});
