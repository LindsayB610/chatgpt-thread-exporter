import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: {
        branches: 70,
        functions: 90,
        lines: 80,
        statements: 80
      }
    }
  }
});
