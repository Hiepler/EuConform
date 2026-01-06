import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Work around rare worker-pool teardown issues (tinypool) on some Node/tooling combos.
    // Core tests are lightweight; single-thread execution improves stability and reproducibility.
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
