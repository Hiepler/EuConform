import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ComplianceSignalGroup,
  ScanGap,
  ScanOutput,
  ScanScope,
} from "@euconform/core/evidence";
import consola from "consola";
import { type FailOnLevel, shouldFailOnGaps } from "../utils/gap-priority";

export type { FailOnLevel };
export type CiMode = "off" | "github";
export type BaseArtifactName =
  | "euconform.report.json"
  | "euconform.aibom.json"
  | "euconform.summary.md";

interface GapCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CiArtifacts {
  reportPath: string;
  summaryPath: string;
  githubStepSummaryPath?: string;
  baseArtifacts: BaseArtifactName[];
}

export interface CiReport {
  schemaVersion: "euconform.ci.v1";
  generatedAt: string;
  target: {
    name: string;
    rootPath: string;
  };
  status: {
    failOn: FailOnLevel;
    failing: boolean;
    gapCounts: GapCounts;
    openQuestions: number;
  };
  aiDetected: boolean;
  scanScope: ScanScope;
  artifacts: string[];
  complianceOverview: Array<{
    area: string;
    status: ComplianceSignalGroup["status"];
    confidence: ComplianceSignalGroup["confidence"];
  }>;
  topGaps: Array<{
    id: string;
    title: string;
    priority: ScanGap["priority"];
    status: ScanGap["status"];
  }>;
}

interface CiComplianceArea {
  area: string;
  group: ComplianceSignalGroup;
}

const PRIORITY_LABELS: Record<ScanGap["priority"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function countGaps(gaps: ScanGap[]): GapCounts {
  return gaps.reduce<GapCounts>(
    (counts, gap) => {
      counts[gap.priority]++;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

function escapeGitHubValue(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function annotationLevel(priority: ScanGap["priority"]): "error" | "warning" | "notice" {
  if (priority === "critical" || priority === "high") return "error";
  if (priority === "medium") return "warning";
  return "notice";
}

export function buildCiReport(
  output: ScanOutput,
  failOn: FailOnLevel,
  scanScope: ScanScope,
  baseArtifacts: BaseArtifactName[]
): CiReport {
  const gapCounts = countGaps(output.report.gaps);
  const complianceAreas: CiComplianceArea[] = [
    { area: "Disclosure", group: output.report.complianceSignals.disclosure },
    { area: "Bias Testing", group: output.report.complianceSignals.biasTesting },
    { area: "Reporting & Exports", group: output.report.complianceSignals.reportingExports },
    { area: "Logging & Monitoring", group: output.report.complianceSignals.loggingMonitoring },
    { area: "Human Oversight", group: output.report.complianceSignals.humanOversight },
    { area: "Data Governance", group: output.report.complianceSignals.dataGovernance },
    { area: "Incident Reporting", group: output.report.complianceSignals.incidentReporting },
  ];

  return {
    schemaVersion: "euconform.ci.v1",
    generatedAt: output.report.generatedAt,
    target: {
      name: output.report.target.name,
      rootPath: output.report.target.rootPath,
    },
    status: {
      failOn,
      failing: shouldFailOnGaps(output.report.gaps, failOn),
      gapCounts,
      openQuestions: output.report.assessmentHints.openQuestions.length,
    },
    aiDetected: output.report.aiFootprint.usesAI,
    scanScope,
    artifacts: [...baseArtifacts, "euconform.ci.json", "euconform.ci-summary.md"],
    complianceOverview: complianceAreas.map(({ area, group }) => ({
      area,
      status: group.status,
      confidence: group.confidence,
    })),
    topGaps: output.report.gaps.slice(0, 5).map((gap) => ({
      id: gap.id,
      title: gap.title,
      priority: gap.priority,
      status: gap.status,
    })),
  };
}

export function renderCiSummaryMarkdown(output: ScanOutput, report: CiReport): string {
  const lines = [
    "## EuConform Compliance Scan",
    "",
    `- **Project:** ${report.target.name}`,
    `- **Scan Scope:** ${report.scanScope}`,
    `- **AI Detected:** ${report.aiDetected ? "yes" : "no"}`,
    `- **Fail Threshold:** ${report.status.failOn}`,
    `- **CI Status:** ${report.status.failing ? "failing" : "passing"}`,
    "",
    "### Gap Counts",
    "",
    `- Critical: ${report.status.gapCounts.critical}`,
    `- High: ${report.status.gapCounts.high}`,
    `- Medium: ${report.status.gapCounts.medium}`,
    `- Low: ${report.status.gapCounts.low}`,
    "",
    "### Compliance Overview",
    "",
    "| Area | Status | Confidence |",
    "|------|--------|------------|",
    ...report.complianceOverview.map(
      (item) => `| ${item.area} | ${item.status} | ${item.confidence} |`
    ),
    "",
  ];

  if (report.topGaps.length > 0) {
    lines.push("### Top Gaps", "");
    for (const gap of report.topGaps) {
      lines.push(`- **${PRIORITY_LABELS[gap.priority]}** ${gap.title}`);
    }
    lines.push("");
  }

  if (output.report.assessmentHints.openQuestions.length > 0) {
    lines.push("### Open Questions", "");
    for (const question of output.report.assessmentHints.openQuestions.slice(0, 5)) {
      lines.push(`- ${question}`);
    }
    lines.push("");
  }

  lines.push("### Artifacts", "", ...report.artifacts.map((artifact) => `- \`${artifact}\``));

  return `${lines.join("\n")}\n`;
}

export function emitGitHubAnnotations(output: ScanOutput): void {
  for (const gap of output.report.gaps.slice(0, 10)) {
    const level = annotationLevel(gap.priority);
    const firstEvidence = gap.evidence[0];
    const message = escapeGitHubValue(`EuConform: ${gap.title}`);

    if (firstEvidence?.file) {
      const line = firstEvidence.line ? `,line=${firstEvidence.line}` : "";
      process.stdout.write(`::${level} file=${firstEvidence.file}${line}::${message}\n`);
    } else {
      process.stdout.write(`::${level}::${message}\n`);
    }
  }

  for (const question of output.report.assessmentHints.openQuestions.slice(0, 5)) {
    process.stdout.write(
      `::notice::${escapeGitHubValue(`EuConform open question: ${question}`)}\n`
    );
  }
}

export async function writeCiArtifacts(
  output: ScanOutput,
  outputDir: string,
  failOn: FailOnLevel,
  mode: CiMode,
  scanScope: ScanScope,
  baseArtifacts: BaseArtifactName[]
): Promise<CiArtifacts | null> {
  if (mode === "off") return null;

  await mkdir(outputDir, { recursive: true });

  const ciReport = buildCiReport(output, failOn, scanScope, baseArtifacts);
  const reportPath = join(outputDir, "euconform.ci.json");
  const summaryPath = join(outputDir, "euconform.ci-summary.md");

  await writeFile(reportPath, `${JSON.stringify(ciReport, null, 2)}\n`, "utf-8");
  await writeFile(summaryPath, renderCiSummaryMarkdown(output, ciReport), "utf-8");
  consola.success(`Written ${reportPath}`);
  consola.success(`Written ${summaryPath}`);

  let githubStepSummaryPath: string | undefined;
  if (mode === "github") {
    emitGitHubAnnotations(output);
    const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (stepSummaryPath) {
      await appendFile(stepSummaryPath, `\n${renderCiSummaryMarkdown(output, ciReport)}`, "utf-8");
      githubStepSummaryPath = stepSummaryPath;
      consola.info(`Appended GitHub step summary: ${stepSummaryPath}`);
    }
  }

  return { reportPath, summaryPath, githubStepSummaryPath, baseArtifacts };
}
