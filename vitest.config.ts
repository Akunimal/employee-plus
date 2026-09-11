import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["packages/contracts/src/**/*.ts", "packages/domain/src/**/*.ts", "packages/adapters/src/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 80,
        functions: 65,
        statements: 80,
        branches: 60,
      },
    },
  },
});
