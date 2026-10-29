import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The self-scan suite walks the whole monorepo, which takes ~10s on a large
    // working tree (local talk decks, build output). Keep the default 10s hook
    // timeout from turning that into a flaky failure.
    hookTimeout: 120_000,
  },
});
