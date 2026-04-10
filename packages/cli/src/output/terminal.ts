import type {
  ComplianceSignalGroup,
  ConfidenceLevel,
  ScanGap,
  ScanOutput,
  ScanReport,
} from "@euconform/core/evidence";
import consola from "consola";

const AREA_LABELS: Record<string, string> = {
  disclosure: "Disclosure & Transparency",
  biasTesting: "Bias Testing",
  reportingExports: "Reporting & Exports",
  loggingMonitoring: "Logging & Monitoring",
  humanOversight: "Human Oversight",
  dataGovernance: "Data Governance",
  incidentReporting: "Incident Reporting",
};

const STATUS_ICONS: Record<string, string> = {
  present: "[OK]",
  partial: "[!!]",
  absent: "[--]",
};

function printSignalCounts(complianceSignals: ScanReport["complianceSignals"]): void {
  const byConfidence: Record<ConfidenceLevel, number> = { high: 0, medium: 0, low: 0 };
  for (const area of Object.values(complianceSignals) as ComplianceSignalGroup[]) {
    byConfidence[area.confidence]++;
  }
  const total = Object.values(complianceSignals).length;
  consola.info(
    `${total} compliance areas assessed (${byConfidence.high} high, ${byConfidence.medium} medium, ${byConfidence.low} low confidence)`
  );
}

function printComplianceOverview(complianceSignals: ScanReport["complianceSignals"]): void {
  consola.log("");
  consola.info("Compliance Overview:");
  for (const [key, group] of Object.entries(complianceSignals) as [
    string,
    ComplianceSignalGroup,
  ][]) {
    const label = AREA_LABELS[key] ?? key;
    const icon = STATUS_ICONS[group.status] ?? "[??]";
    consola.log(`  ${icon} ${label.padEnd(28)} ${group.status} (${group.confidence})`);
  }
}

function printTopGaps(gaps: ScanGap[]): void {
  if (gaps.length === 0) return;
  consola.log("");
  consola.warn(`Top gaps (${gaps.length} total):`);
  for (const gap of gaps.slice(0, 3)) {
    consola.log(`  - [${gap.priority}] ${gap.title}`);
  }
  if (gaps.length > 3) {
    consola.log(`  ... and ${gaps.length - 3} more`);
  }
}

/**
 * Prints a formatted compliance summary to the terminal.
 */
export function printTerminalSummary(output: ScanOutput, outputDir: string): void {
  const { report } = output;

  consola.box("EuConform Scan Complete");
  printSignalCounts(report.complianceSignals);

  const ai = report.aiFootprint;
  consola.info(
    `AI detected: ${ai.usesAI ? "yes" : "no"}${ai.inferenceModes.length > 0 ? ` | Inference: ${ai.inferenceModes.join(", ")}` : ""}`
  );

  printComplianceOverview(report.complianceSignals);
  printTopGaps(report.gaps);

  const openCount = report.assessmentHints.openQuestions.length;
  if (openCount > 0) {
    consola.info(`${openCount} open question${openCount > 1 ? "s" : ""} for manual review`);
  }

  consola.log("");
  consola.success(`Output written to: ${outputDir}`);
  consola.info("Next steps:");
  consola.log("  - Review `euconform.report.json` and `euconform.summary.md`");
  consola.log("  - Complete role and risk classification in the EuConform web app");
  consola.log("  - Use `--ci github --fail-on <level>` to turn scans into CI checks");
}
