import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBundleManifest } from "@euconform/core/evidence";
import type { ScanOutput } from "@euconform/core/evidence";
import consola from "consola";

interface WrittenArtifact {
  fileName: string;
  content: string;
}

/**
 * Writes scan output artifacts to the specified directory
 * and generates a bundle manifest with SHA-256 integrity hashes.
 */
export async function writeOutputFiles(
  output: ScanOutput,
  outputDir: string,
  format: string
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  const written: WrittenArtifact[] = [];

  if (format === "json" || format === "all") {
    const reportContent = JSON.stringify(output.report, null, 2);
    const reportPath = join(outputDir, "euconform.report.json");
    await writeFile(reportPath, reportContent, "utf-8");
    consola.success(`Written ${reportPath}`);
    written.push({ fileName: "euconform.report.json", content: reportContent });

    const aibomContent = JSON.stringify(output.aibom, null, 2);
    const aibomPath = join(outputDir, "euconform.aibom.json");
    await writeFile(aibomPath, aibomContent, "utf-8");
    consola.success(`Written ${aibomPath}`);
    written.push({ fileName: "euconform.aibom.json", content: aibomContent });
  }

  if (format === "md" || format === "all") {
    const mdPath = join(outputDir, "euconform.summary.md");
    await writeFile(mdPath, output.summaryMarkdown, "utf-8");
    consola.success(`Written ${mdPath}`);
    written.push({ fileName: "euconform.summary.md", content: output.summaryMarkdown });
  }

  if (written.length > 0) {
    const reportArtifact = written.find((a) => a.fileName === "euconform.report.json");
    if (reportArtifact) {
      const bundle = buildBundleManifest({
        report: reportArtifact,
        aibom: written.find((a) => a.fileName === "euconform.aibom.json"),
        summary: written.find((a) => a.fileName === "euconform.summary.md"),
        tool: output.report.tool,
        target: {
          name: output.report.target.name,
          rootPath: output.report.target.rootPath,
        },
        generatedAt: output.report.generatedAt,
      });

      const bundlePath = join(outputDir, "euconform.bundle.json");
      await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf-8");
      consola.success(`Written ${bundlePath}`);
    }
  }
}

/**
 * Creates a ZIP archive of all artifacts in the output directory.
 * Requires the CI report to already be written if applicable.
 */
export async function writeZipBundle(outputDir: string): Promise<string> {
  const { zipSync, strToU8 } = await import("fflate");

  const fileNames = [
    "euconform.report.json",
    "euconform.aibom.json",
    "euconform.summary.md",
    "euconform.ci.json",
    "euconform.ci-summary.md",
    "euconform.bundle.json",
  ];

  const zipData: Record<string, Uint8Array> = {};

  for (const fileName of fileNames) {
    try {
      const content = await readFile(join(outputDir, fileName), "utf-8");
      zipData[fileName] = strToU8(content);
    } catch {
      // File doesn't exist — skip optional artifacts
    }
  }

  const zipped = zipSync(zipData);
  const zipPath = join(outputDir, "euconform.bundle.zip");
  await writeFile(zipPath, zipped);
  consola.success(`Written ${zipPath}`);
  return zipPath;
}
