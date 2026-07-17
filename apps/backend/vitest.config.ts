import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Money/ledger tests hit a real Postgres and mutate shared rows — run serially.
    fileParallelism: false,
  },
});
