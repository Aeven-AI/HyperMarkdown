import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const source = JSON.parse(
  readFileSync(resolve(root, "benchmarks/results/latest.json"), "utf8"),
);

const names = [
  "HyperMarkdown",
  "markstream-react",
  "streamdown",
  "deepseek-harness",
  "react-markdown",
];

const labels = {
  "code-large.md": "Large code block",
  "prose-mixed.md": "Mixed prose",
  "real-code-os.md": "Captured AI code",
  "real-table-head.md": "Captured AI table",
  "table-large.md": "Large table",
};

const fixtures = Object.keys(labels).map((fixture) => {
  const rows = source.results.filter((row) => row.fixture === fixture);
  const values = Object.fromEntries(
    names.map((name) => {
      const row = rows.find((candidate) => candidate.renderer === name);
      if (!row || row.failed) {
        throw new Error(`Missing benchmark row for ${fixture} / ${name}`);
      }
      return [name, Math.round(row.total)];
    }),
  );

  const hyper = values.HyperMarkdown;
  const nearest = Math.min(...names.slice(1).map((name) => values[name]));

  return {
    fixture,
    label: labels[fixture],
    values,
    speedup: Number((nearest / hyper).toFixed(1)),
  };
});

const payload = {
  completedAt: source.completedAt,
  environment: source.environment,
  renderers: names,
  fixtures,
};

writeFileSync(
  resolve(root, "website/src/data/benchmark.generated.ts"),
  `// Generated from benchmarks/results/latest.json. Do not edit by hand.\n` +
    `export const benchmark = ${JSON.stringify(payload, null, 2)} as const;\n`,
);

console.log("generated website benchmark data");
