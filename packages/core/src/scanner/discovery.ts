/**
 * File discovery for the EuConform scanner.
 *
 * Walks a target directory, respects .gitignore, filters by extension
 * and named files, and returns file contents for pattern matching.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import ignore from "ignore";
import type { FileProvenance, ScanFile, ScanOptions, ScanScope } from "../evidence/types";

const DEFAULT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".yaml", ".yml"];

/** Named files to always include regardless of extension */
const NAMED_FILE_PATTERNS = [
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^\.env\.example$/,
  /^\.env\.sample$/,
  /^next\.config\./,
  /^vite\.config\./,
  /^docker-compose/,
  /^Dockerfile/,
  /^tsconfig.*\.json$/,
];

const ALWAYS_SKIP_DIRS = [
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
  "coverage",
  ".turbo",
  ".cache",
  ".euconform",
];

const DEFAULT_MAX_FILE_SIZE = 1_048_576; // 1 MB
const DEFAULT_MAX_FILES = 10_000;
const DEFAULT_SCOPE: ScanScope = "production";

const PRODUCTION_SKIP_PROVENANCE = new Set<FileProvenance>([
  "test",
  "fixture",
  "example",
  "generated",
]);

const TEST_SEGMENTS = new Set(["test", "tests", "__test__", "__tests__", "spec", "__spec__"]);
const FIXTURE_SEGMENTS = new Set([
  "fixture",
  "fixtures",
  "__fixture__",
  "__fixtures__",
  "mocks",
  "__mocks__",
  "mock-data",
]);
const EXAMPLE_SEGMENTS = new Set(["example", "examples", "sample", "samples", "demo", "demos"]);
const GENERATED_SEGMENTS = new Set(["generated", "__generated__", ".generated", "gen"]);
const TOOLING_SEGMENTS = new Set([".github", "scripts", "tools", "tooling", "bin"]);

const TEST_FILE_PATTERN = /(?:^|\.)(?:test|spec)\.[^.]+$/i;
const GENERATED_FILE_PATTERN = /(?:^|\.)(?:generated|min)\.[^.]+$/i;

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".zip",
  ".tar",
  ".gz",
  ".br",
  ".pdf",
  ".doc",
  ".docx",
  ".mp3",
  ".mp4",
  ".webm",
  ".ogg",
  ".wasm",
  ".node",
  ".dylib",
  ".so",
  ".lock", // bun.lockb is binary
]);

function isBinaryExtension(ext: string): boolean {
  return BINARY_EXTENSIONS.has(ext);
}

function isNamedFile(fileName: string): boolean {
  return NAMED_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function shouldIncludeFile(fileName: string, ext: string, extensions: string[]): boolean {
  if (isNamedFile(fileName)) return true;
  if (isBinaryExtension(ext)) return false;
  return extensions.includes(ext);
}

export function classifyFileProvenance(relativePath: string): FileProvenance {
  const normalized = relativePath.replace(/\\/g, "/");
  const rawSegments = normalized.split("/").filter(Boolean);
  const segments = rawSegments.map((segment) => segment.toLowerCase());
  const rawFileName = rawSegments[rawSegments.length - 1] ?? "";
  const fileName = segments[segments.length - 1] ?? "";
  const ext = extname(fileName);
  const isRootFile = segments.length === 1;

  if (segments.some((segment) => FIXTURE_SEGMENTS.has(segment))) return "fixture";
  if (segments.some((segment) => TEST_SEGMENTS.has(segment)) || TEST_FILE_PATTERN.test(fileName)) {
    return "test";
  }
  if (segments.some((segment) => EXAMPLE_SEGMENTS.has(segment))) return "example";
  if (
    segments.some((segment) => GENERATED_SEGMENTS.has(segment)) ||
    GENERATED_FILE_PATTERN.test(fileName)
  ) {
    return "generated";
  }
  if (segments.some((segment) => TOOLING_SEGMENTS.has(segment))) return "tooling";

  if (fileName.startsWith("readme") && isRootFile) return "root-docs";
  if (ext === ".md") return "docs";

  if (
    isNamedFile(rawFileName) ||
    ext === ".yaml" ||
    ext === ".yml" ||
    fileName.startsWith(".env") ||
    /\.config\.[^.]+$/i.test(rawFileName)
  ) {
    return "config";
  }

  return "runtime";
}

async function loadGitignore(targetPath: string): Promise<ReturnType<typeof ignore>> {
  const ig = ignore();
  try {
    const content = await readFile(join(targetPath, ".gitignore"), "utf-8");
    ig.add(content);
  } catch {
    // no .gitignore — that's fine
  }
  // Always ignore these regardless
  ig.add(ALWAYS_SKIP_DIRS.map((d) => `${d}/`));
  return ig;
}

export interface DiscoveryResult {
  files: ScanFile[];
  skippedCount: number;
}

interface FileFilterOptions {
  scope: ScanScope;
  extensions: string[];
  maxSize: number;
}

function shouldProcessEntry(
  entry: string,
  targetPath: string,
  filterOpts: FileFilterOptions
): { absolutePath: string; ext: string; provenance: FileProvenance } | "skip" | "ignore" {
  const absolutePath = join(targetPath, entry);
  const fileName = basename(entry);
  const ext = extname(fileName).toLowerCase();
  const provenance = classifyFileProvenance(entry);

  if (filterOpts.scope === "production" && PRODUCTION_SKIP_PROVENANCE.has(provenance)) {
    return "skip";
  }
  if (!shouldIncludeFile(fileName, ext, filterOpts.extensions)) return "ignore";

  return { absolutePath, ext, provenance };
}

async function tryReadFile(
  absolutePath: string,
  entry: string,
  ext: string,
  provenance: FileProvenance,
  maxSize: number
): Promise<ScanFile | "skip" | "ignore"> {
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile() || fileStat.size === 0) return "ignore";
    if (fileStat.size > maxSize) return "skip";

    const content = await readFile(absolutePath, "utf-8");
    return {
      relativePath: entry,
      absolutePath,
      extension: ext,
      content,
      sizeBytes: fileStat.size,
      provenance,
    };
  } catch {
    return "skip";
  }
}

function resolveOptions(options: ScanOptions) {
  return {
    targetPath: resolve(options.targetPath),
    scope: options.scope ?? DEFAULT_SCOPE,
    extensions: options.extensions ?? DEFAULT_EXTENSIONS,
    maxSize: options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE,
    maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
    excludeGlobs: options.excludeGlobs,
  };
}

async function readDirectoryEntries(targetPath: string): Promise<string[]> {
  try {
    return (await readdir(targetPath, { recursive: true, encoding: "utf-8" })) as string[];
  } catch (err) {
    throw new Error(`Cannot read directory: ${targetPath}: ${err}`);
  }
}

function processEntry(
  entry: string,
  ig: ReturnType<typeof ignore>,
  targetPath: string,
  filterOpts: FileFilterOptions
): "skip" | "ignore" | { absolutePath: string; ext: string; provenance: FileProvenance } {
  if (ig.ignores(entry)) return "ignore";
  return shouldProcessEntry(entry, targetPath, filterOpts);
}

export async function discoverFiles(options: ScanOptions): Promise<DiscoveryResult> {
  const { targetPath, scope, extensions, maxSize, maxFiles, excludeGlobs } =
    resolveOptions(options);

  const ig = await loadGitignore(targetPath);
  if (excludeGlobs?.length) ig.add(excludeGlobs);

  const entries = await readDirectoryEntries(targetPath);
  const filterOpts: FileFilterOptions = { scope, extensions, maxSize };
  const files: ScanFile[] = [];
  let skippedCount = 0;

  for (const entry of entries) {
    if (files.length >= maxFiles) {
      skippedCount++;
      continue;
    }

    const processed = processEntry(entry, ig, targetPath, filterOpts);
    if (processed === "skip") {
      skippedCount++;
      continue;
    }
    if (processed === "ignore") continue;

    const result = await tryReadFile(
      processed.absolutePath,
      entry,
      processed.ext,
      processed.provenance,
      maxSize
    );
    if (result === "skip") {
      skippedCount++;
      continue;
    }
    if (result === "ignore") continue;

    files.push(result);
  }

  return { files, skippedCount };
}
