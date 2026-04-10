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
  ComplianceSignalGroup,
  ConfidenceLevel,
  DetectedSignal,
  DetectorContext,
  FileProvenance,
  OpenQuestion,
  RepoProfile,
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
