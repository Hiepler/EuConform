import { sha256Hex } from "./hash";
import type { BundleArtifactRef, BundleArtifactRole, ScanBundle } from "./types";

interface ArtifactInput {
  content: string;
  fileName: string;
}

interface BuildBundleOptions {
  report: ArtifactInput;
  aibom?: ArtifactInput;
  ci?: ArtifactInput;
  summary?: ArtifactInput;
  tool: { name: string; version: string };
  target: { name: string; rootPath: string };
  generatedAt: string;
}

function extractSchemaVersion(content: string): string | undefined {
  try {
    const parsed = JSON.parse(content) as { schemaVersion?: string };
    return typeof parsed.schemaVersion === "string" ? parsed.schemaVersion : undefined;
  } catch {
    return undefined;
  }
}

function makeArtifactRef(
  role: BundleArtifactRole,
  input: ArtifactInput,
  required: boolean
): BundleArtifactRef {
  const isJson = input.fileName.endsWith(".json");
  const ref: BundleArtifactRef = {
    role,
    fileName: input.fileName,
    sha256: sha256Hex(input.content),
    required,
  };

  if (isJson) {
    const sv = extractSchemaVersion(input.content);
    if (sv) ref.schemaVersion = sv;
  } else {
    ref.mimeType = "text/markdown";
  }

  return ref;
}

export function buildBundleManifest(opts: BuildBundleOptions): ScanBundle {
  const artifacts: BundleArtifactRef[] = [makeArtifactRef("report", opts.report, true)];

  if (opts.aibom) artifacts.push(makeArtifactRef("aibom", opts.aibom, false));
  if (opts.ci) artifacts.push(makeArtifactRef("ci", opts.ci, false));
  if (opts.summary) artifacts.push(makeArtifactRef("summary", opts.summary, false));

  return {
    schemaVersion: "euconform.bundle.v1",
    generatedAt: opts.generatedAt,
    tool: opts.tool,
    target: opts.target,
    artifacts,
  };
}
