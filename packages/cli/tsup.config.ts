import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { defineConfig } from "tsup";

const schemasSource = resolve(__dirname, "../../docs/spec/schemas");
const schemasDest = resolve(__dirname, "dist/schemas");

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  noExternal: ["@euconform/core"],
  external: ["sharp", "@xenova/transformers", "onnxruntime-node"],
  async onSuccess() {
    await mkdir(schemasDest, { recursive: true });
    const files = await readdir(schemasSource);
    for (const file of files) {
      if (file.endsWith(".json")) {
        await copyFile(join(schemasSource, file), join(schemasDest, file));
      }
    }
  },
});
