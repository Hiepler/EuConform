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
  BiasReport,
  BiasReportV2,
  BiasReportV2Provenance,
  BiasReportV2Sampling,
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
export type {
  BiasStatisticsV2,
  CategoryPreferenceStatistics,
  Quartiles,
  WilsonInterval,
} from "./bias-statistics";
export type { BiasValidationResult } from "./validate";

export { generateScanOutput } from "./output";
export { generateSummaryMarkdown } from "./markdown";
export { buildBundleManifest } from "./bundle";
export { sha256Hex } from "./hash";
export { buildBiasStatistics, quartilesType7, wilson95, WILSON_Z95 } from "./bias-statistics";
export { validateBiasReportV2, isPartialRun } from "./validate-bias-v2";
export {
  getSchemaMajorVersion,
  validateAiBillOfMaterials,
  validateBiasArtifact,
  validateBiasReport,
  validateCiReport,
  validateEcefJsonDocument,
  validateScanBundle,
  validateScanReport,
} from "./validate";
