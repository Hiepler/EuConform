import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverFiles } from "../../src/scanner/discovery";

const FIXTURES = resolve(__dirname, "../fixtures");

describe("discoverFiles", () => {
  it("discovers files in a fixture directory", async () => {
    const { files } = await discoverFiles({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });

    const paths = files.map((f) => f.relativePath);
    expect(paths).toContain("package.json");
    expect(paths.some((p) => p.includes("app/page.tsx"))).toBe(true);
    expect(paths).toContain("README.md");
  });

  it("respects extension filtering", async () => {
    const { files } = await discoverFiles({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });

    // All discovered files should match default extensions or named file patterns
    for (const file of files) {
      const ext = file.extension;
      const isDefaultExt = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".yaml", ".yml"].includes(
        ext
      );
      const isNamedFile =
        /^(package\.json|\.env\.|next\.config\.|vite\.config\.|docker-compose|Dockerfile|tsconfig)/.test(
          file.relativePath.split("/").pop() ?? ""
        );
      expect(isDefaultExt || isNamedFile).toBe(true);
    }
  });

  it("skips node_modules", async () => {
    const { files } = await discoverFiles({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
    });

    const hasNodeModules = files.some((f) => f.relativePath.includes("node_modules"));
    expect(hasNodeModules).toBe(false);
  });

  it("defaults to production scope and excludes test/example files", async () => {
    const { files } = await discoverFiles({
      targetPath: resolve(FIXTURES, "compliance-good"),
    });

    const paths = files.map((file) => file.relativePath);
    expect(paths.some((path) => path.includes("tests/"))).toBe(false);
  });

  it("includes test files in all scope and annotates provenance", async () => {
    const { files } = await discoverFiles({
      targetPath: resolve(FIXTURES, "compliance-good"),
      scope: "all",
    });

    const testFile = files.find((file) => file.relativePath.includes("tests/bias-check.test.ts"));
    expect(testFile).toBeDefined();
    expect(testFile?.provenance).toBe("test");
  });

  it("respects max file size", async () => {
    // Set a very small max file size — only tiny files should be included
    const { files } = await discoverFiles({
      targetPath: resolve(FIXTURES, "nextjs-openai"),
      maxFileSizeBytes: 10,
    });

    // All included files should be at most 10 bytes
    for (const file of files) {
      expect(file.sizeBytes).toBeLessThanOrEqual(10);
    }
  });

  it("handles non-existent path", async () => {
    await expect(
      discoverFiles({
        targetPath: resolve(FIXTURES, "this-does-not-exist"),
      })
    ).rejects.toThrow(/Cannot read directory/);
  });
});
