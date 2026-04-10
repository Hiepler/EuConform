import consola from "consola";
import type { VerifyBundleReport } from "../verify/verify";

export function printVerifySummary(report: VerifyBundleReport): void {
  consola.box("EuConform Bundle Verify");
  consola.info(`Input: ${report.bundlePath}`);
  consola.info(`Mode: ${report.inputType}`);

  if (!report.bundle) {
    consola.error("Bundle manifest could not be validated.");
  } else {
    consola.info(`Bundle: ${report.bundle.schemaVersion}`);
    consola.info(
      `Target: ${report.bundle.target.name} (${report.bundle.tool.name} v${report.bundle.tool.version})`
    );
  }

  if (report.artifacts.length > 0) {
    consola.log("");
    consola.info("Artifacts:");
    for (const artifact of report.artifacts) {
      consola.log(
        `  - ${artifact.fileName} [${artifact.role}] hash=${artifact.hashStatus} schema=${artifact.schemaStatus} metadata=${artifact.metadataStatus}`
      );
    }
  }

  if (report.warnings.length > 0) {
    consola.log("");
    consola.warn(`Warnings (${report.warnings.length}):`);
    for (const warning of report.warnings) {
      consola.warn(`  - ${warning.message}`);
    }
  }

  if (report.errors.length > 0) {
    consola.log("");
    consola.error(`Errors (${report.errors.length}):`);
    for (const error of report.errors) {
      consola.error(`  - ${error.message}`);
    }
  }

  consola.log("");
  if (report.status === "valid") {
    consola.success("Bundle verification passed without warnings.");
  } else if (report.status === "warnings") {
    consola.warn("Bundle verification completed with warnings.");
  } else {
    consola.error("Bundle verification failed.");
  }
}
