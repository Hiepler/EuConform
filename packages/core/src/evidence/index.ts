/**
 * @euconform/core/evidence — Evidence model and output generation
 *
 * This module defines the evidence types produced by the scanner
 * and transforms raw scan results into structured output artifacts.
 */

export type {
  AiBillOfMaterials,
  AppType,
  AssessmentHint,
  BomComponent,
  BomComponentKind,
  BundleArtifactRef,
  BundleArtifactRole,
  CiReport,
  ComplianceSignalGroup,
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  FailOnLevel,
  FileProvenance,
  GapCounts,
  OpenQuestion,
  RepoProfile,
  ScanBundle,
  ScanFile,
  ScanGap,
  ScanMeta,
  ScanOptions,
  ScanOutput,
  ScanReport,
  ScanResult,
  ScanScope,
  SignalCategory,
  SignalDetector,
  SignalEvidence,
} from "./types";

export { generateScanOutput } from "./output";
export { generateSummaryMarkdown } from "./markdown";
export { buildBundleManifest } from "./bundle";
export { sha256Hex } from "./hash";
