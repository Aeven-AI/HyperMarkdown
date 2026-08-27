import { describe, expect, it } from "vitest";

import { cjkPlugin } from "../../lib/plugins/cjk";
import { katexPlugin } from "../../lib/plugins/math";
import {
  compactText,
  parseMarkup,
  renderStatic,
  renderStreamed,
  visibleText,
} from "../helpers/render";

describe("Streamdown-derived fence correctness", () => {
  it.each([
    ["long backtick fence", "``````text\ncode\n```\n```````", "```"],
    ["tilde fence with backticks", "~~~text\nline\n```\n~~~", "```"],
    [
      "three-space indentation",
      "   ```js\nconst value = 1;\n   ```",
      "const value = 1;",
    ],
  ])("renders %s without losing literal code", (_name, source, expected) => {
    const document = parseMarkup(renderStreamed(source, 2));

    expect(document.querySelector("pre code")?.textContent).toContain(expected);
    expect(compactText(document.body.innerHTML)).toBe(
      compactText(renderStatic(source)),
    );
  });

  it("does not recognize inline triple backticks as a fenced block", () => {
    const document = parseMarkup(
      renderStatic("Use ``` to start a fenced code block."),
    );

    expect(document.querySelector("pre")).toBeNull();
    expect(document.body.textContent).toContain("Use ``` to start");
  });

  it("keeps dollar delimiters in code separate from following math", () => {
    const source = "```bash\necho $$\n```\n\n$$\nx = y + z\n$$";
    const options = { plugins: { math: katexPlugin() } };
    const document = parseMarkup(renderStreamed(source, 3, options));

    expect(document.querySelector("pre code")?.textContent).toContain(
      "echo $$",
    );
    expect(document.querySelectorAll(".katex")).toHaveLength(1);
  });
});

describe("Streamdown-derived document data correctness", () => {
  it("does not create footnotes from regex character classes", () => {
    const source =
      "# Regex examples\n\n```js\nconst tag = /[^>]+/;\n```\n\n" +
      "| Pattern | Meaning |\n| --- | --- |\n| `[^\\s]` | non-space |\n\nTail.";
    const document = parseMarkup(renderStreamed(source, 3));

    expect(document.querySelector("section[data-footnotes]")).toBeNull();
    expect(document.querySelector("pre code")?.textContent).toContain("[^>]");
    expect(document.querySelector("table code")?.textContent).toBe("[^\\s]");
    expect(document.body.textContent).toContain("Tail.");
  });

  it("renders numeric, hyphenated, and underscored footnote identifiers", () => {
    const source =
      "Numbers[^1], names[^my-note], and underscores[^my_note].\n\n" +
      "[^1]: Numeric.\n[^my-note]: Hyphenated.\n[^my_note]: Underscored.";
    const document = parseMarkup(renderStatic(source));

    expect(document.querySelectorAll("[data-footnote-ref]")).toHaveLength(3);
    expect(
      document.querySelectorAll("section[data-footnotes] li"),
    ).toHaveLength(3);
    expect(
      document.querySelector('[id^="user-content-user-content-"]'),
    ).toBeNull();
  });

  it("preserves telephone, email, and web destinations", () => {
    const source =
      "[phone](tel:+44-1392-498505) " +
      "[email](mailto:foo@example.com) [web](https://example.com/path)";
    const document = parseMarkup(renderStatic(source));
    const links = Array.from(document.querySelectorAll("a"));

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "tel:+44-1392-498505",
      "mailto:foo@example.com",
      "https://example.com/path",
    ]);
  });

  it("keeps bare email addresses intact while streaming", () => {
    const source =
      "Contact user+test@example-domain.co.uk or support@example.com.";
    const markup = renderStreamed(source, 1);

    expect(visibleText(markup)).toBe(source);
    expect(compactText(markup)).toBe(compactText(renderStatic(source)));
  });

  // CommonMark's flanking rules leave `**` beside CJK punctuation unemphasised,
  // which is why this needs the CJK plugin. Streamdown and Markstream both gate
  // the same behaviour behind one; tests/plugins/cjk.test.js covers the gap it
  // closes, and the case here checks the rest renders either way.
  it("renders CJK punctuation inside and beside emphasis", () => {
    const source =
      "**日本語（説明）**続き、*中文【备注】*，~~한국어（이전）~~。";
    const document = parseMarkup(
      renderStreamed(source, 2, { plugins: { cjk: cjkPlugin() } }),
    );

    expect(document.querySelector("strong")?.textContent).toBe(
      "日本語（説明）",
    );
    expect(document.querySelector("em")?.textContent).toBe("中文【备注】");
    expect(document.querySelector("del")?.textContent).toBe("한국어（이전）");
    expect(document.body.textContent).toBe(
      "日本語（説明）続き、中文【备注】，한국어（이전）。",
    );
  });

  it("preserves nested same-name HTML elements and following siblings", () => {
    const source =
      "Before\n\n<details><summary>Outer</summary>" +
      "<details><summary>Inner</summary>Inner content</details>" +
      "Outer content</details>\n\nAfter";
    const document = parseMarkup(renderStreamed(source, 5));
    const details = document.querySelectorAll("details");

    expect(details).toHaveLength(2);
    expect(details[0]?.querySelector("details")).toBe(details[1]);
    expect(details[0]?.textContent).toContain("Outer content");
    expect(document.body.textContent).toContain("After");
  });
});
