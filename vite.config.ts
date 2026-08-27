import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";

import pkg from "./package.json" with { type: "json" };

// Everything declared as a dependency or peer dependency stays external: a
// library should not ship its own copy of react, mermaid or the unified
// pipeline. Consumers resolve them once.
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  "react/jsx-runtime",
];

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["index.tsx", "lib"],
      exclude: ["**/*.test.*"],
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  build: {
    lib: {
      // The plugins are separate entries so importing the component never
      // pulls katex, highlight.js or mermaid into the consumer's bundle.
      entry: {
        hypermarkdown: resolve(__dirname, "index.tsx"),
        "plugins/math": resolve(__dirname, "lib/plugins/math.ts"),
        "plugins/code": resolve(__dirname, "lib/plugins/code.ts"),
        "plugins/mermaid": resolve(__dirname, "lib/plugins/mermaid.ts"),
        "plugins/cjk": resolve(__dirname, "lib/plugins/cjk.ts"),
      },
      name: "HyperMarkdown",
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        external.some((dep) => id === dep || id.startsWith(dep + "/")),
      output: {
        exports: "named",
        globals: { react: "React", "react-dom": "ReactDOM" },
      },
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/jsdom-storage.ts"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["index.tsx", "lib/**/*.{ts,tsx}"],
      exclude: [
        "lib/**/*.d.ts",
        "lib/plugin-types.ts",
        "lib/repair/types.ts",
        "lib/types.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage/all",
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
