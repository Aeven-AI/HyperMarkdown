import { describe, expect, it } from "vitest";

import {
  compactText,
  parseMarkup,
  renderStatic,
  visibleText,
} from "../helpers/render";

describe("portable Markdown correctness", () => {
  it("distinguishes headings from hash-prefixed prose", () => {
    const prose = parseMarkup(renderStatic("#not-a-heading"));
    const heading = parseMarkup(renderStatic("# A heading"));

    expect(prose.querySelector("h1")).toBeNull();
    expect(prose.body.textContent).toContain("#not-a-heading");
    expect(heading.querySelector("h1")?.textContent).toBe("A heading");
  });

  it("renders nested ordered and unordered lists without losing content", () => {
    const markdown =
      "1. First\n   - Nested **bold**\n     1. Deep item\n" +
      "2. Second\n\n- Top\n  1. Nested ordered\n";
    const document = parseMarkup(renderStatic(markdown));

    expect(document.querySelectorAll("ol").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll("ul").length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector("strong")?.textContent).toBe("bold");
    expect(compactText(document.body.innerHTML)).toContain("Deepitem");
  });

  it("keeps a GFM table nested inside a blockquote", () => {
    const markdown =
      "> Inventory:\n>\n> | Part | Name | Qty |\n" +
      "> | -- | -- | -- |\n> | A-42 | Sensor | 3 |";
    const document = parseMarkup(renderStatic(markdown));
    const quote = document.querySelector("blockquote");

    expect(quote?.querySelector("table")).not.toBeNull();
    expect(quote?.querySelectorAll("tbody td")).toHaveLength(3);
    expect(quote?.textContent).toContain("A-42");
  });

  it("renders task-list state and ordinary following content", () => {
    const markdown =
      "- [x] Complete\n- [ ] Pending\n\nOrdinary paragraph after the list.";
    const document = parseMarkup(renderStatic(markdown));
    const inputs = document.querySelectorAll('input[type="checkbox"]');

    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.hasAttribute("checked")).toBe(true);
    expect(inputs[1]?.hasAttribute("checked")).toBe(false);
    expect(document.body.textContent).toContain("Ordinary paragraph after");
  });

  it("preserves numeric-only and JSON documents", () => {
    const numeric = visibleText(renderStatic("1234567"));
    const json = compactText(
      renderStatic('{\n  "summary": "demo",\n  "questions": [\n    "one",\n    "two"\n  ]\n}'),
    );

    expect(numeric).toBe("1234567");
    expect(json).toContain('"summary":"demo"');
    expect(json).toContain('"questions":["one","two"]');
  });

  it("parses links containing parentheses and CJK brackets as one link", () => {
    const markdown =
      "[【名称】(sample).mp4](https://example.test/media) and " +
      "[*DR (Radio)*](https://example.test/news)";
    const document = parseMarkup(renderStatic(markdown));
    const links = document.querySelectorAll("a");

    expect(links).toHaveLength(2);
    expect(links[0]?.textContent).toBe("【名称】(sample).mp4");
    expect(links[0]?.getAttribute("href")).toBe("https://example.test/media");
    expect(links[1]?.querySelector("em")?.textContent).toBe("DR (Radio)");
  });

  it("keeps URL punctuation outside explicit links", () => {
    const document = parseMarkup(
      renderStatic("[Example](https://example.test/path)! Next"),
    );
    const link = document.querySelector("a");

    expect(link?.getAttribute("href")).toBe("https://example.test/path");
    expect(link?.textContent).toBe("Example");
    expect(document.body.textContent).toContain("! Next");
  });

  it("distinguishes one-space line wrapping from a hard break", () => {
    const soft = parseMarkup(renderStatic("line \nnext"));
    const hard = parseMarkup(renderStatic("line  \nnext"));

    expect(soft.querySelector("br")).toBeNull();
    expect(hard.querySelector("br")).not.toBeNull();
  });

  it("renders footnote references and definitions", () => {
    const document = parseMarkup(
      renderStatic("A claim.[^note]\n\n[^note]: Supporting detail."),
    );

    expect(document.querySelector("[data-footnote-ref]")).not.toBeNull();
    expect(document.body.textContent).toContain("Supporting detail");
  });
});

describe("portable HTML correctness", () => {
  it("keeps all adjacent standard HTML siblings", () => {
    const markdown =
      "<p>First paragraph</p><p><br></p>" +
      "<p>Second paragraph</p><p>Third paragraph</p>";
    const document = parseMarkup(renderStatic(markdown));
    const paragraphs = [...document.querySelectorAll("p")];

    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual([
      "First paragraph",
      "",
      "Second paragraph",
      "Third paragraph",
    ]);
  });

  it("removes unknown tags while preserving their content and surroundings", () => {
    const markdown =
      "Before list:\n\n- Item with <custom-tag>inline content</custom-tag> " +
      "and more text.\n- Another item.\n\nAfter list.";
    const markup = renderStatic(markdown);
    const text = visibleText(markup);

    expect(markup).not.toContain("<custom-tag");
    expect(text).toContain("Before list");
    expect(text).toContain("inline content");
    expect(text).toContain("and more text");
    expect(text).toContain("Another item");
    expect(text).toContain("After list");
  });

  it("allows an explicitly configured custom tag and attributes", () => {
    const markup = renderStatic('<mark data-id="7">important</mark>', {
      allowedTags: { mark: ["data-id"] },
    });

    expect(markup).toContain("<mark");
    expect(markup).toContain('data-id="7"');
    expect(markup).toContain("important");
  });
});
