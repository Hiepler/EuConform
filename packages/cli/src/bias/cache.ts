import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CapabilityCache } from "@euconform/core";

const CACHE_DIR = join(homedir(), ".euconform", "cache");
const CACHE_FILE = join(CACHE_DIR, "ollama-capabilities.json");

let _cache: Record<string, string> | null = null;

function loadCache(): Record<string, string> {
  if (_cache !== null) return _cache;
  try {
    _cache = JSON.parse(readFileSync(CACHE_FILE, "utf-8")) ?? {};
  } catch {
    _cache = {};
  }
  return _cache as Record<string, string>;
}

function persistCache(): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(_cache, null, 2));
}

export const fileCache: CapabilityCache = {
  get(key: string): string | null {
    return loadCache()[key] ?? null;
  },
  set(key: string, value: string): void {
    loadCache()[key] = value;
    persistCache();
  },
};
