import { resolve } from "node:path";
import { defineCommand } from "citty";
import consola from "consola";
import { printVerifySummary } from "../output/verify";
import { type VerifyFailOn, shouldFailVerifyReport, verifyBundleInput } from "../verify/verify";

const VALID_FAIL_ON = new Set<VerifyFailOn>(["warnings", "errors"]);

export default defineCommand({
  meta: {
    name: "verify",
    description: "Verify a EuConform bundle manifest, directory, or ZIP archive",
  },
  args: {
    path: {
      type: "positional",
      required: true,
      description: "Path to euconform.bundle.json, a bundle directory, or euconform.bundle.zip",
    },
    strict: {
      type: "boolean",
      default: false,
      description: "Escalate hash and metadata mismatches from warnings to errors",
    },
    json: {
      type: "boolean",
      default: false,
      description: "Print the verify report as JSON",
    },
    "fail-on": {
      type: "string",
      default: "errors",
      description: 'Exit non-zero on "errors" or on "warnings" and errors',
    },
  },
  async run({ args }) {
    const inputPath = resolve(args.path as string);
    const failOn = ((args["fail-on"] as string) ?? "errors") as VerifyFailOn;

    if (!VALID_FAIL_ON.has(failOn)) {
      consola.error(`Invalid fail-on level: ${failOn}. Use one of: warnings, errors.`);
      process.exit(1);
    }

    try {
      const report = await verifyBundleInput(inputPath, { strict: Boolean(args.strict) });

      if (args.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        printVerifySummary(report);
      }

      if (shouldFailVerifyReport(report, failOn)) {
        process.exit(1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (args.json) {
        process.stdout.write(
          `${JSON.stringify(
            {
              bundlePath: inputPath,
              inputType: "bundle-json",
              bundle: null,
              artifacts: [],
              warnings: [],
              errors: [{ severity: "error", code: "verify.load", message }],
              status: "errors",
            },
            null,
            2
          )}\n`
        );
      } else {
        consola.error(message);
      }
      process.exit(1);
    }
  },
});
