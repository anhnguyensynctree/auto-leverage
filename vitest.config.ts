import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [".claude/worktrees/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["app/api/**/*.ts", "lib/**/*.ts"],
      exclude: [
        // llm-classifier is a thin Anthropic SDK wrapper; tested via mock at
        // the classify route boundary — direct unit coverage requires live API
        "lib/llm-classifier.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
