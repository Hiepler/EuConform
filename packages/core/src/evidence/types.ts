/**
 * EuConform Evidence Engine — Type Definitions
 *
 * The scanner produces evidence, hints, and open questions — not legal verdicts.
 * Classification is done by the wizard from human input, not by the scanner.
 */

// ---------------------------------------------------------------------------
// Signal types
// ---------------------------------------------------------------------------

export type SignalCategory =
  | "framework"
  | "runtime"
  | "ai-provider"
  | "ai-framework"
  | "ai-model"
  | "local-inference"
  | "rag"
  | "training"
  | "compliance-disclosure"
  | "compliance-logging"
  | "compliance-oversight"
  | "compliance-bias"
  | "compliance-data"
  | "compliance-incident"
  | "compliance-reporting";

export type ConfidenceLevel = "high" | "medium" | "low";

export type ScanScope = "production" | "all";

export type FileProvenance =
  | "runtime"
  | "config"
  | "root-docs"
  | "docs"
  | "test"
  | "fixture"
  | "example"
  | "generated"
  | "tooling";

export interface SignalEvidence {
  file: string;
  line?: number;
  snippet: string;
  provenance?: FileProvenance;
}

export interface DetectedSignal {
  id: string;
  name: string;
  category: SignalCategory;
  confidence: ConfidenceLevel;
  evidence: SignalEvidence[];
}

// ---------------------------------------------------------------------------
// Open questions
// ---------------------------------------------------------------------------

export interface OpenQuestion {
  id: string;
  question: string;
  context: string;
  relatedSignalIds: string[];
  suggestedAction: string;
}

// ---------------------------------------------------------------------------
// Scanner result (raw output of scanRepository)
// ---------------------------------------------------------------------------

export interface ScanMeta {
  scannedAt: string;
  scanDurationMs: number;
  toolVersion: string;
  targetPath: string;
  scanScope: ScanScope;
  filesScanned: number;
  filesSkipped: number;
}

export interface RepoProfile {
  name: string;
  version?: string;
  description?: string;
  license?: string;
  isMonorepo: boolean;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  languages: string[];
}

export type AppType =
  | "web-app"
  | "api-server"
  | "cli-tool"
  | "library"
  | "chatbot"
  | "ml-pipeline"
  | "unknown";

export interface ScanResult {
  meta: ScanMeta;
  repo: RepoProfile;
  appTypes: AppType[];
  signals: DetectedSignal[];
  openQuestions: OpenQuestion[];
  signalSummary: {
    total: number;
    byCategory: Partial<Record<SignalCategory, number>>;
    byConfidence: Record<ConfidenceLevel, number>;
  };
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

export interface ScanOptions {
  targetPath: string;
  scope?: ScanScope;
  extensions?: string[];
  excludeGlobs?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
}

export interface ScanFile {
  relativePath: string;
  absolutePath: string;
  extension: string;
  content: string;
  sizeBytes: number;
  provenance: FileProvenance;
}

// ---------------------------------------------------------------------------
// Detector interface
// ---------------------------------------------------------------------------

export interface DetectorContext {
  file: ScanFile;
  /** Pre-split lines of file.content — avoids redundant .split("\n") in each detector */
  lines: string[];
  allFiles: ScanFile[];
  /** Pre-parsed root package.json, if available */
  rootPackageJson?: Record<string, unknown>;
}

export type SignalDetector = (ctx: DetectorContext) => DetectedSignal[];

// ---------------------------------------------------------------------------
// Scan report (euconform.report.v1)
// ---------------------------------------------------------------------------

export interface ComplianceSignalGroup {
  status: "present" | "partial" | "absent" | "unknown";
  confidence: ConfidenceLevel;
  evidence: SignalEvidence[];
}

export interface AssessmentHint {
  hint: string;
  articleRef?: string;
  confidence: ConfidenceLevel;
}

export interface ScanGap {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "missing" | "partial";
  basis: "scanner-rule";
  evidence: SignalEvidence[];
}

export interface ScanReport {
  schemaVersion: "euconform.report.v1";
  generatedAt: string;
  tool: { name: string; version: string };
  target: {
    rootPath: string;
    name: string;
    repoType: string;
    detectedStack: string[];
  };
  aiFootprint: {
    usesAI: boolean;
    inferenceModes: string[];
    providerHints: string[];
    ragHints: string[];
  };
  complianceSignals: {
    disclosure: ComplianceSignalGroup;
    biasTesting: ComplianceSignalGroup;
    reportingExports: ComplianceSignalGroup;
    loggingMonitoring: ComplianceSignalGroup;
    humanOversight: ComplianceSignalGroup;
    dataGovernance: ComplianceSignalGroup;
    incidentReporting: ComplianceSignalGroup;
  };
  assessmentHints: {
    possibleModes: string[];
    riskIndicators: AssessmentHint[];
    gpaiIndicators: AssessmentHint[];
    openQuestions: string[];
  };
  gaps: ScanGap[];
  recommendationSummary: string[];
}

// ---------------------------------------------------------------------------
// AI Bill of Materials (euconform.aibom.v1)
// ---------------------------------------------------------------------------

export type BomComponentKind =
  | "framework"
  | "runtime"
  | "inference-provider"
  | "ai-framework"
  | "model"
  | "vector-store"
  | "embedding"
  | "dataset"
  | "tool";

export interface BomComponent {
  id: string;
  kind: BomComponentKind;
  name: string;
  version?: string;
  source: "package.json" | "lock-file" | "code" | "config" | "docs";
}

export interface AiBillOfMaterials {
  schemaVersion: "euconform.aibom.v1";
  project: {
    name: string;
    rootPath: string;
  };
  components: BomComponent[];
  complianceCapabilities: {
    biasEvaluation: boolean;
    jsonExport: boolean;
    pdfExport: boolean;
    loggingInfrastructure: boolean;
    humanReviewFlow: boolean;
    incidentHandling: boolean;
  };
}

// ---------------------------------------------------------------------------
// CI report (euconform.ci.v1)
// ---------------------------------------------------------------------------

export type FailOnLevel = "none" | "critical" | "high" | "medium" | "low";

export interface GapCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
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

// ---------------------------------------------------------------------------
// Combined scan output
// ---------------------------------------------------------------------------

export interface ScanOutput {
  report: ScanReport;
  aibom: AiBillOfMaterials;
  summaryMarkdown: string;
}
