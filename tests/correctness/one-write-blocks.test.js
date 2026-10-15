import { describe, expect, it } from "vitest";

import {
  compactText,
  parseMarkup,
  renderOneWrite,
  renderStatic,
  renderStreamed,
} from "../helpers/render";

/**
 * A finished answer handed over in one write.
 *
 * A host that is not streaming — a re-opened conversation, a non-streaming
 * provider, a question echoed back into the transcript — calls write() once
 * with finalize, which is a different path through the block splitter than a
 * stream of small writes: the whole answer is in the buffer before any block is
 * typed, so a block is typed from the finished document rather than from the
 * first characters that arrived. These are the documents where the two
 * disagreed (Aeven-AI/HyperMarkdown#4).
 */
const table =
  "Intro paragraph.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\nOutro paragraph.";

const refWithFootnote =
  "Reference [ref][1] and a note[^1].\n\n[^1]: The note.\n\n[1]: https://example.com/ref";

describe("one write of a finished answer", () => {
  it("keeps the paragraph before a table, the table's header and its row", () => {
    for (const markup of [renderOneWrite(table), renderStreamed(table, 8)]) {
      const document = parseMarkup(markup);

      expect(
        Array.from(document.querySelectorAll("p")).map((p) => p.textContent),
      ).toEqual(["Intro paragraph.", "Outro paragraph."]);

      const rendered = document.querySelector("table");

      expect(rendered?.getAttribute("data-headless")).toBe("false");
      expect(
        Array.from(rendered?.querySelectorAll("thead th") ?? []).map(
          (th) => th.textContent,
        ),
      ).toEqual(["a", "b"]);
      expect(
        Array.from(rendered?.querySelectorAll("tbody td") ?? []).map(
          (td) => td.textContent,
        ),
      ).toEqual(["1", "2"]);
    }
  });

  it("keeps a thematic break that follows a table", () => {
    const documents = `${table}\n\n---\n\nAfter the rule.`;

    for (const markup of [
      renderOneWrite(documents),
      renderStreamed(documents, 8),
    ]) {
      expect(parseMarkup(markup).querySelectorAll("hr").length).toBe(1);
    }
  });

  it("resolves a reference-style link that shares its block with a footnote", () => {
    const hrefs = Array.from(
      parseMarkup(renderOneWrite(refWithFootnote)).querySelectorAll("a"),
    ).map((a) => a.getAttribute("href"));

    expect(hrefs).toContain("https://example.com/ref");
  });

  it("resolves a reference-style link with no footnote in the way", () => {
    const documents = "Reference [ref][1].\n\n[1]: https://example.com/ref";

    for (const markup of [
      renderOneWrite(documents),
      renderStreamed(documents, 8),
    ]) {
      expect(parseMarkup(markup).querySelector("a")?.getAttribute("href")).toBe(
        "https://example.com/ref",
      );
    }
  });

  it.each([
    ["a table", table],
    ["a table and a rule", `${table}\n\n---\n\nAfter the rule.`],
    ["prose before a table", "Prose.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n"],
    ["a reference beside a footnote", refWithFootnote],
  ])("renders %s as the whole-document renderer does", (_name, md) => {
    expect(compactText(renderOneWrite(md))).toBe(compactText(renderStatic(md)));
  });

  it("keeps one write and a stream of the same answer in step", () => {
    // A blank line between the items of one ordered list makes a loose list of
    // four rather than two lists: that is what remark parses, and the renderer
    // agrees with it in both paths.
    const documents = "1. one\n2. two\n\n3. three\n4. four\n";

    expect(compactText(renderOneWrite(documents))).toBe(
      compactText(renderStreamed(documents, 8)),
    );
  });
});
