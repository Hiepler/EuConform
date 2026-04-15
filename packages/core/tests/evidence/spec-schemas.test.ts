import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type JsonSchema = {
  $defs?: Record<string, JsonSchema>;
  $ref?: string;
  const?: unknown;
  enum?: unknown[];
  type?: "object" | "array" | "string" | "boolean" | "integer";
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  format?: string;
  pattern?: string;
  minItems?: number;
};

const ROOT = resolve(__dirname, "../../../..");
const SCHEMAS_DIR = resolve(ROOT, "docs/spec/schemas");
const EXAMPLES_DIR = resolve(ROOT, "docs/spec/examples");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function resolveRef(rootSchema: JsonSchema, ref: string): JsonSchema {
  if (!ref.startsWith("#/")) {
    throw new Error(`Unsupported schema ref: ${ref}`);
  }

  const pathSegments = ref.slice(2).split("/");
  let current: unknown = rootSchema;

  for (const segment of pathSegments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      throw new Error(`Unable to resolve schema ref: ${ref}`);
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current as JsonSchema;
}

function checkAdditionalProperties(
  schema: JsonSchema,
  objectValue: Record<string, unknown>,
  path: string
): string[] {
  if (schema.additionalProperties !== false || !schema.properties) return [];
  const allowed = new Set(Object.keys(schema.properties));
  return Object.keys(objectValue)
    .filter((key) => !allowed.has(key))
    .map((key) => `${path}.${key} is not allowed (additionalProperties: false)`);
}

function validateObjectSchema(
  rootSchema: JsonSchema,
  schema: JsonSchema,
  value: unknown,
  path: string
): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${path} must be an object`];
  }

  const errors: string[] = [];
  const objectValue = value as Record<string, unknown>;

  for (const field of schema.required ?? []) {
    if (!(field in objectValue)) {
      errors.push(`${path}.${field} is required`);
    }
  }

  errors.push(...checkAdditionalProperties(schema, objectValue, path));

  for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (key in objectValue) {
      errors.push(
        ...validateAgainstSchema(rootSchema, propertySchema, objectValue[key], `${path}.${key}`)
      );
    }
  }

  return errors;
}

function validateArraySchema(
  rootSchema: JsonSchema,
  schema: JsonSchema,
  value: unknown,
  path: string
): string[] {
  if (!Array.isArray(value)) {
    return [`${path} must be an array`];
  }

  const errors: string[] = [];

  if (schema.minItems !== undefined && value.length < schema.minItems) {
    errors.push(`${path} must have at least ${schema.minItems} item(s)`);
  }

  if (!schema.items) return errors;

  for (let i = 0; i < value.length; i++) {
    errors.push(...validateAgainstSchema(rootSchema, schema.items, value[i], `${path}[${i}]`));
  }
  return errors;
}

function validatePrimitive(schema: JsonSchema, value: unknown, path: string): string[] {
  if (schema.type === "string") {
    if (typeof value !== "string") return [`${path} must be a string`];
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      return [`${path} must match pattern ${schema.pattern}`];
    }
    return [];
  }
  if (schema.type === "boolean" && typeof value !== "boolean") {
    return [`${path} must be a boolean`];
  }
  if (schema.type === "integer" && !Number.isInteger(value)) {
    return [`${path} must be an integer`];
  }
  return [];
}

function validateAgainstSchema(
  rootSchema: JsonSchema,
  schema: JsonSchema,
  value: unknown,
  path = "$"
): string[] {
  if (schema.$ref) {
    return validateAgainstSchema(rootSchema, resolveRef(rootSchema, schema.$ref), value, path);
  }

  if ("const" in schema && value !== schema.const) {
    return [`${path} must equal ${JSON.stringify(schema.const)}`];
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return [
      `${path} must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")}`,
    ];
  }

  if (schema.type === "object") return validateObjectSchema(rootSchema, schema, value, path);
  if (schema.type === "array") return validateArraySchema(rootSchema, schema, value, path);

  return validatePrimitive(schema, value, path);
}

const SCHEMA_FILES = {
  report: resolve(SCHEMAS_DIR, "report-v1.schema.json"),
  aibom: resolve(SCHEMAS_DIR, "aibom-v1.schema.json"),
  ci: resolve(SCHEMAS_DIR, "ci-v1.schema.json"),
  bundle: resolve(SCHEMAS_DIR, "bundle-v1.schema.json"),
} as const;

const EXAMPLE_FILES = {
  report: "euconform.report.json",
  aibom: "euconform.aibom.json",
  ci: "euconform.ci.json",
  bundle: "euconform.bundle.json",
} as const;

describe("EuConform Evidence Format schemas", () => {
  const schemaEntries = Object.entries(SCHEMA_FILES).map(([kind, path]) => [
    kind,
    readJson<JsonSchema>(path),
  ]) as Array<[keyof typeof SCHEMA_FILES, JsonSchema]>;

  it("validates every documented example artifact set", () => {
    const exampleDirs = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(exampleDirs).toEqual(["local-ollama", "non-ai", "rag", "web-app"]);

    for (const exampleDir of exampleDirs) {
      for (const [kind, schema] of schemaEntries) {
        const artifactPath = resolve(EXAMPLES_DIR, exampleDir, EXAMPLE_FILES[kind]);
        const artifact = readJson<unknown>(artifactPath);
        const errors = validateAgainstSchema(schema, schema, artifact);

        expect(errors, `${exampleDir}/${EXAMPLE_FILES[kind]}\n${errors.join("\n")}`).toEqual([]);
      }
    }
  });

  it("rejects documents with missing required fields", () => {
    for (const [kind, schema] of schemaEntries) {
      const minimal: Record<string, unknown> = {};
      const errors = validateAgainstSchema(schema, schema, minimal);
      expect(errors.length, `${kind}: empty object should fail validation`).toBeGreaterThan(0);
    }
  });

  it("rejects documents with wrong types", () => {
    const reportSchema = schemaEntries.find(([kind]) => kind === "report")?.[1];
    if (!reportSchema) throw new Error("report schema not found");

    const badReport = {
      schemaVersion: "euconform.report.v1",
      generatedAt: 12345,
      tool: "not-an-object",
      target: null,
      aiFootprint: [],
      complianceSignals: "wrong",
      assessmentHints: false,
      gaps: "not-array",
      recommendationSummary: {},
    };
    const errors = validateAgainstSchema(reportSchema, reportSchema, badReport);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects documents with additional properties", () => {
    const artifactPath = resolve(EXAMPLES_DIR, "web-app", EXAMPLE_FILES.report);
    const artifact = readJson<Record<string, unknown>>(artifactPath);
    const extraProps = { ...artifact, unknownField: "should-fail" };

    const reportSchema = schemaEntries.find(([kind]) => kind === "report")?.[1];
    if (!reportSchema) throw new Error("report schema not found");

    const errors = validateAgainstSchema(reportSchema, reportSchema, extraProps);
    expect(errors.some((e) => e.includes("unknownField"))).toBe(true);
  });

  it("rejects invalid enum values", () => {
    const ciSchema = schemaEntries.find(([kind]) => kind === "ci")?.[1];
    if (!ciSchema) throw new Error("ci schema not found");

    const artifactPath = resolve(EXAMPLES_DIR, "web-app", EXAMPLE_FILES.ci);
    const artifact = readJson<Record<string, unknown>>(artifactPath);
    const badCi = {
      ...artifact,
      scanScope: "invalid-scope",
    };
    const errors = validateAgainstSchema(ciSchema, ciSchema, badCi);
    expect(errors.some((e) => e.includes("scanScope"))).toBe(true);
  });

  it("keeps schemaVersion aligned with the documented file family", () => {
    const expectedVersions = {
      report: "euconform.report.v1",
      aibom: "euconform.aibom.v1",
      ci: "euconform.ci.v1",
      bundle: "euconform.bundle.v1",
    } as const;

    const exampleDirs = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const exampleDir of exampleDirs) {
      for (const [kind, filename] of Object.entries(EXAMPLE_FILES) as Array<
        [keyof typeof EXAMPLE_FILES, string]
      >) {
        const artifact = readJson<{ schemaVersion?: string }>(
          resolve(EXAMPLES_DIR, exampleDir, filename)
        );
        expect(artifact.schemaVersion).toBe(expectedVersions[kind]);
      }
    }
  });

  it("rejects bundle with invalid sha256 format", () => {
    const bundleSchema = schemaEntries.find(([kind]) => kind === "bundle")?.[1];
    if (!bundleSchema) throw new Error("bundle schema not found");

    const badBundle = {
      schemaVersion: "euconform.bundle.v1",
      generatedAt: "2026-01-01T00:00:00Z",
      tool: { name: "euconform", version: "1.0.0" },
      target: { name: "test", rootPath: "/test" },
      artifacts: [
        {
          role: "report",
          fileName: "euconform.report.json",
          sha256: "not-a-valid-hash",
          required: true,
        },
      ],
    };
    const errors = validateAgainstSchema(bundleSchema, bundleSchema, badBundle);
    expect(errors.some((e) => e.includes("sha256"))).toBe(true);
  });

  it("rejects bundle with invalid artifact role", () => {
    const bundleSchema = schemaEntries.find(([kind]) => kind === "bundle")?.[1];
    if (!bundleSchema) throw new Error("bundle schema not found");

    const badBundle = {
      schemaVersion: "euconform.bundle.v1",
      generatedAt: "2026-01-01T00:00:00Z",
      tool: { name: "euconform", version: "1.0.0" },
      target: { name: "test", rootPath: "/test" },
      artifacts: [
        {
          role: "unknown-role",
          fileName: "test.json",
          sha256: "a".repeat(64),
          required: true,
        },
      ],
    };
    const errors = validateAgainstSchema(bundleSchema, bundleSchema, badBundle);
    expect(errors.some((e) => e.includes("role"))).toBe(true);
  });
});
