import { describe, expect, it } from "vitest";

import {
  compactText,
  documentText,
  parseMarkup,
  renderPending,
  renderStatic,
  renderStreamed,
  visibleText,
} from "../helpers/render";

const equivalenceCases = [
  ["headings", "# Heading\n\nParagraph with **strong** and *emphasis*.\n\n"],
  ["nested lists", "1. One\n   - Nested\n     1. Deep\n2. Two\n\n"],
  ["table", "| A | B |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |\n\nTail.\n\n"],
  ["task list", "- [x] Complete\n- [ ] Pending\n\n"],
  ["footnote", "Claim.[^1]\n\n[^1]: Detail.\n\n"],
  ["escaped brackets", "Escaped: \\[not a link\\] and \\\\ slash.\n\n"],
  ["unmatched brackets", "Opening [ bracket and [link](https://exa\n\n"],
  ["tilde fence", "~~~text\n`inline` and **literal**\n~~~\n\nTail.\n\n"],
  ["fence metadata", "```diff js\n-old\n+new\n```\n\n"],
  ["numeric", "1234567"],
  ["JSON array", '[\n  { "a": 1 },\n  { "b": 2 }\n]\n'],
  ["adjacent HTML", "<p>First</p><p><br></p><p>Second</p>\n\n"],
];

describe.each(equivalenceCases)(
  "Markstream-derived corpus: %s",
  (_name, source) => {
    it.each([1, 3, 11])(
      "matches final visible text at chunk size %i",
      (size) => {
        expect(documentText(renderStreamed(source, size))).toBe(
          documentText(renderStatic(source)),
        );
      },
    );
  },
);

describe("incremental Markdown states", () => {
  it("does not promote incomplete headings to heading elements", () => {
    const incomplete = parseMarkup(renderPending("##x"));
    const complete = parseMarkup(renderPending("## x"));

    expect(incomplete.querySelector("h2")).toBeNull();
    expect(incomplete.body.textContent).toContain("##x");
    expect(complete.querySelector("h2")?.textContent).toBe("x");
  });

  it("withholds incomplete links and produces the finalized destination", () => {
    const pending = renderPending("Before [label](https://exa");
    const final = parseMarkup(
      renderStreamed("Before [label](https://example.test)", 2),
    );

    expect(visibleText(pending)).toBe("Before");
    expect(final.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.test",
    );
  });

  it("handles incomplete images without exposing link markup", () => {
    const pending = renderPending("Before ![alt](https://image.test/im");
    const final = parseMarkup(
      renderStreamed("Before ![alt](https://image.test/image.png)", 2),
    );

    expect(visibleText(pending)).toBe("Before");
    expect(final.querySelector("img")?.getAttribute("src")).toBe(
      "https://image.test/image.png",
    );
  });

  it("does not expose incomplete task markers", () => {
    expect(visibleText(renderPending("- ["))).toBe("");
    expect(visibleText(renderPending("- [x] "))).toBe("");
    expect(visibleText(renderPending("- [x] Done"))).toContain("Done");
  });

  it("keeps unclosed fenced content in a code block when finalized", () => {
    const source = "```js\nconst answer = 42;\n# still code";
    const document = parseMarkup(renderStreamed(source, 4));

    expect(document.querySelector("pre code")?.textContent).toContain(
      "const answer = 42;",
    );
    expect(document.querySelector("h1")).toBeNull();
  });

  it("keeps shorter backtick runs inside a longer closed fence", () => {
    const source = "````text\n```\nline\n```\n````";
    const document = parseMarkup(renderStreamed(source, 3));

    expect(document.querySelector("pre code")?.textContent).toContain(
      "```\nline\n```",
    );
  });

  it("does not turn escaped pipes into a table", () => {
    const escaped = parseMarkup(renderStatic("a \\| b \\| c"));
    const table = parseMarkup(
      renderStatic("| a | b |\n| --- | --- |\n| c | d |"),
    );

    expect(escaped.querySelector("table")).toBeNull();
    expect(table.querySelector("table")).not.toBeNull();
  });

  it("keeps numeric content visible before and after finalization", () => {
    expect(visibleText(renderPending("1234567"))).toBe("1234567");
    expect(visibleText(renderStreamed("1234567", 1))).toBe("1234567");
  });
});
