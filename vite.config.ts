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
  },
});
