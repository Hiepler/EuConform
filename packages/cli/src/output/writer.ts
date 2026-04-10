import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScanOutput } from "@euconform/core/evidence";
import consola from "consola";

/**
 * Writes scan output artifacts to the specified directory.
 */
export async function writeOutputFiles(
  output: ScanOutput,
  outputDir: string,
  format: string
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  if (format === "json" || format === "all") {
    const reportPath = join(outputDir, "euconform.report.json");
    await writeFile(reportPath, JSON.stringify(output.report, null, 2), "utf-8");
    consola.success(`Written ${reportPath}`);

    const aibomPath = join(outputDir, "euconform.aibom.json");
    await writeFile(aibomPath, JSON.stringify(output.aibom, null, 2), "utf-8");
    consola.success(`Written ${aibomPath}`);
  }

  if (format === "md" || format === "all") {
    const mdPath = join(outputDir, "euconform.summary.md");
    await writeFile(mdPath, output.summaryMarkdown, "utf-8");
    consola.success(`Written ${mdPath}`);
  }
}
