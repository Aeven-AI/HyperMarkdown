import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "coverage",
    "dist",
    "tests/fixtures",
    "benchmarks",
    "website/build",
    "website/.docusaurus",
    "website/node_modules",
    "website/vendor",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // The port keeps the original code's shape; these are tightened as the
      // internals get annotated.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "prefer-const": "off",
    },
  },
  {
    // Docusaurus recommends loading browser-only modules inside BrowserOnly's
    // callback. Keeping these requires prevents them entering the SSR graph.
    files: ["website/src/pages/index.tsx", "website/src/pages/playground.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
