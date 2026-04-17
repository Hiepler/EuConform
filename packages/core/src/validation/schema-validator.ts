import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import addFormats from "ajv-formats";
import Ajv2020 from "ajv/dist/2020";

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  expected?: unknown;
  received?: unknown;
}

export type SchemaType = "report.v1" | "aibom.v1" | "ci.v1" | "bundle.v1";

export interface ValidationResult {
  valid: boolean;
  schemaType: SchemaType;
  errors: ValidationError[];
}

export interface ValidateOptions {
  strict?: boolean;
}

// Resolve schema directory relative to this file at runtime
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemasDir = resolve(__dirname, "../../../../docs/spec/schemas");

function loadSchema(filename: string): object {
  const content = readFileSync(resolve(schemasDir, filename), "utf-8");
  return JSON.parse(content) as object;
}

const SCHEMA_MAP: Record<string, { schemaFile: string; type: SchemaType }> = {
  "euconform.report.v1": { schemaFile: "report-v1.schema.json", type: "report.v1" },
  "euconform.aibom.v1": { schemaFile: "aibom-v1.schema.json", type: "aibom.v1" },
  "euconform.ci.v1": { schemaFile: "ci-v1.schema.json", type: "ci.v1" },
  "euconform.bundle.v1": { schemaFile: "bundle-v1.schema.json", type: "bundle.v1" },
};

let ajvInstance: Ajv2020 | null = null;

function getAjv(): Ajv2020 {
  if (!ajvInstance) {
    ajvInstance = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajvInstance);
  }
  return ajvInstance;
}

export function validate(data: unknown, _options?: ValidateOptions): ValidationResult {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      schemaType: "report.v1",
      errors: [
        {
          path: "",
          message: "Input must be a JSON object",
          keyword: "type",
          expected: "object",
          received: typeof data,
        },
      ],
    };
  }

  const record = data as Record<string, unknown>;
  const schemaVersion = record.schemaVersion;

  if (typeof schemaVersion !== "string") {
    return {
      valid: false,
      schemaType: "report.v1",
      errors: [
        {
          path: "",
          message: `Missing or invalid schemaVersion field. Expected one of: ${Object.keys(SCHEMA_MAP).join(", ")}`,
          keyword: "required",
        },
      ],
    };
  }

  const entry = SCHEMA_MAP[schemaVersion];
  if (!entry) {
    return {
      valid: false,
      schemaType: "report.v1",
      errors: [
        {
          path: "/schemaVersion",
          message: `Unknown schemaVersion "${schemaVersion}". Expected one of: ${Object.keys(SCHEMA_MAP).join(", ")}`,
          keyword: "const",
          expected: Object.keys(SCHEMA_MAP),
          received: schemaVersion,
        },
      ],
    };
  }

  const ajv = getAjv();
  let validateFn = ajv.getSchema(schemaVersion);
  if (!validateFn) {
    const schema = loadSchema(entry.schemaFile);
    validateFn = ajv.compile({ ...schema, $id: schemaVersion });
  }

  const valid = validateFn(data) as boolean;

  if (valid) {
    return { valid: true, schemaType: entry.type, errors: [] };
  }

  const errors: ValidationError[] = (validateFn.errors ?? []).map((err) => ({
    path: err.instancePath ?? "",
    message: err.message ?? "Validation error",
    keyword: err.keyword ?? "unknown",
    expected: err.params,
    received: undefined,
  }));

  return { valid: false, schemaType: entry.type, errors };
}
