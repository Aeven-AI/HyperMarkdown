import { defineConfig } from "vitest/config";

const unitSources = [
  "lib/cache/utils.ts",
  "lib/config.ts",
  "lib/math-notation.ts",
  "lib/rehype/link-safety.ts",
  "lib/repair/code-spans.ts",
  "lib/repair/emphasis.ts",
  "lib/repair/entities.ts",
  "lib/repair/escapes.ts",
  "lib/repair/inline-tokens.ts",
  "lib/repair/links.ts",
  "lib/repair/list-markers.ts",
  "lib/repair/math.ts",
  "lib/repair/process-inline-syntax.ts",
  "lib/repair/setext.ts",
  "lib/repair/task-lists.ts",
  "lib/repair/utils.ts",
  "lib/sanitize.ts",
  "lib/stream/definitions.ts",
  "lib/stream/detect-block-type.ts",
  "lib/stream/list-structure.ts",
  "lib/stream/references.ts",
  "lib/table/shape.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{js,ts,tsx}"],
    coverage: {
      provider: "v8",
      include: unitSources,
      reporter: ["text", "json-summary", "json", "html", "lcov"],
      reportsDirectory: "coverage/unit",
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
