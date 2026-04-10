import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateScanOutput, sha256Hex } from "@euconform/core/evidence";
import { scanRepository } from "@euconform/core/scanner";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeCiArtifacts } from "../src/output/ci";
import { writeBundleManifest, writeOutputFiles, writeZipBundle } from "../src/output/writer";
import { shouldFailVerifyReport, verifyBundleInput } from "../src/verify/verify";

const FIXTURES = resolve(import.meta.dirname, "../../core/tests/fixtures");
const TMP_DIR = resolve(import.meta.dirname, "../.tmp-test-verify");

async function createBundleFixture(name: string) {
  const outDir = resolve(TMP_DIR, name);
  const scanResult = await scanRepository({
    targetPath: resolve(FIXTURES, "nextjs-openai"),
  });
  const output = generateScanOutput(scanResult);

  await writeOutputFiles(output, outDir, "all");
  await writeCiArtifacts(output, outDir, "high", "github", "production", [
    "euconform.report.json",
    "euconform.aibom.json",
    "euconform.summary.md",
  ]);
  await writeBundleManifest(outDir, {
    tool: output.report.tool,
    target: {
      name: output.report.target.name,
      rootPath: output.report.target.rootPath,
    },
    generatedAt: output.report.generatedAt,
  });

  return { outDir, output };
}

describe("verifyBundleInput", () => {
  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it("verifies a bundle manifest file", async () => {
    const { outDir } = await createBundleFixture("manifest");

    const report = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"));

    expect(report.status).toBe("valid");
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
    expect(report.artifacts.some((artifact) => artifact.role === "ci")).toBe(true);
  });

  it("verifies a bundle directory", async () => {
    const { outDir } = await createBundleFixture("directory");

    const report = await verifyBundleInput(outDir);

    expect(report.inputType).toBe("bundle-dir");
    expect(report.status).toBe("valid");
  });

  it("verifies a bundle zip archive", async () => {
    const { outDir } = await createBundleFixture("zip");
    const zipPath = await writeZipBundle(outDir);

    expect(existsSync(zipPath)).toBe(true);

    const report = await verifyBundleInput(zipPath);

    expect(report.inputType).toBe("bundle-zip");
    expect(report.status).toBe("valid");
  });

  it("warns on hash mismatches by default", async () => {
    const { outDir } = await createBundleFixture("hash-warning");
    const reportPath = resolve(outDir, "euconform.report.json");
    const content = await readFile(reportPath, "utf8");
    await writeFile(reportPath, `${content}\n`, "utf8");

    const report = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"));

    expect(report.status).toBe("warnings");
    expect(report.errors).toHaveLength(0);
    expect(report.warnings.some((issue) => issue.code === "artifact.sha256")).toBe(true);
    expect(shouldFailVerifyReport(report, "errors")).toBe(false);
    expect(shouldFailVerifyReport(report, "warnings")).toBe(true);
  });

  it("escalates hash mismatches in strict mode", async () => {
    const { outDir } = await createBundleFixture("hash-strict");
    const reportPath = resolve(outDir, "euconform.report.json");
    const content = await readFile(reportPath, "utf8");
    await writeFile(reportPath, `${content}\n`, "utf8");

    const report = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"), {
      strict: true,
    });

    expect(report.status).toBe("errors");
    expect(report.errors.some((issue) => issue.code === "artifact.sha256")).toBe(true);
  });

  it("warns on metadata mismatches when hashes are updated to match edited content", async () => {
    const { outDir } = await createBundleFixture("metadata-warning");
    const reportPath = resolve(outDir, "euconform.report.json");
    const bundlePath = resolve(outDir, "euconform.bundle.json");

    const parsedReport = JSON.parse(await readFile(reportPath, "utf8")) as Record<string, unknown>;
    const target = parsedReport.target as Record<string, unknown>;
    target.name = "renamed-project";

    const updatedReport = `${JSON.stringify(parsedReport, null, 2)}\n`;
    await writeFile(reportPath, updatedReport, "utf8");

    const bundle = JSON.parse(await readFile(bundlePath, "utf8")) as {
      artifacts: Array<{ fileName: string; sha256: string }>;
    };
    const artifact = bundle.artifacts.find((entry) => entry.fileName === "euconform.report.json");
    if (!artifact) throw new Error("report artifact missing from bundle");
    artifact.sha256 = sha256Hex(updatedReport);
    await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

    const report = await verifyBundleInput(bundlePath);

    expect(report.status).toBe("warnings");
    expect(report.warnings.some((issue) => issue.code === "metadata.target.name")).toBe(true);
  });

  it("fails when a referenced required artifact is missing", async () => {
    const { outDir } = await createBundleFixture("missing-report");
    await rm(resolve(outDir, "euconform.report.json"));

    const report = await verifyBundleInput(resolve(outDir, "euconform.bundle.json"));

    expect(report.status).toBe("errors");
    expect(report.errors.some((issue) => issue.code === "artifact.missing")).toBe(true);
  });
});
