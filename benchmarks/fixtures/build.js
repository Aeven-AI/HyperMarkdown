// Generates the benchmark documents. Deterministic, so runs compare.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** A large fenced code block: the case block-level freezing cannot help with. */
function largeCode(lines) {
  const out = ["Here is the implementation you asked for.", "", "```ts"];

  for (let i = 0; i < lines; i++) {
    out.push(
      `export function handler${i}(input: Request, ctx: Context): Response {`,
      `  const parsed = schema${i % 17}.parse(input.body); // validate first`,
      `  if (!parsed.ok) { return ctx.fail(${i}, "bad request"); }`,
      `  return ctx.json({ id: ${i}, value: parsed.value, at: Date.now() });`,
      `}`,
      ``
    );
  }

  out.push("```", "", "That covers every branch.", "");
  return out.join("\n");
}

/** A large GFM table: one block that keeps growing, row by row. */
function largeTable(rows) {
  const out = [
    "Results from the run:",
    "",
    "| # | Service | Region | Latency | Status | Notes |",
    "|---|---------|--------|---------|--------|-------|",
  ];

  const regions = ["eu-west-1", "us-east-1", "ap-south-1", "sa-east-1"];
  const states = ["healthy", "degraded", "recovering"];

  for (let i = 0; i < rows; i++) {
    out.push(
      `| ${i} | \`service-${i % 23}\` | ${regions[i % 4]} | ${8 + (i % 90)}ms | ` +
        `**${states[i % 3]}** | see [runbook](https://ops.example/${i}) |`
    );
  }

  out.push("", "All regions reported.", "");
  return out.join("\n");
}

/** Prose, lists, headings — many small blocks, where freezing does help. */
function mixedProse(sections) {
  const out = [];

  for (let i = 0; i < sections; i++) {
    out.push(
      `## Section ${i}`,
      "",
      `This paragraph explains **step ${i}** of the process, with \`inline code\`,`,
      `a [link](https://example.com/${i}) and some *emphasis* to parse.`,
      "",
      `- first point about ${i}`,
      `- second point, which is longer and wraps past the usual width`,
      `- third point with \`code\` inside it`,
      "",
      `> A quoted remark about section ${i}.`,
      ""
    );
  }

  return out.join("\n");
}

mkdirSync(here, { recursive: true });

const docs = {
  "code-large.md": largeCode(220),
  "table-large.md": largeTable(400),
  "prose-mixed.md": mixedProse(60),
};

for (const [name, text] of Object.entries(docs)) {
  writeFileSync(join(here, name), text);
  console.log(`${name.padEnd(18)} ${String(text.length).padStart(7)} chars`);
}
