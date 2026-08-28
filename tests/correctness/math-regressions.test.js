import { describe, expect, it, vi } from "vitest";

import { katexPlugin } from "../../lib/plugins/math";
import {
  compactText,
  parseMarkup,
  renderStatic,
  renderStreamed,
} from "../helpers/render";

const options = { plugins: { math: katexPlugin() } };

describe("Markstream-derived math correctness", () => {
  it("renders bracket math but not JSON or numeric arrays", () => {
    let document;
    const formula = "[\ne^x = 1 + x + \\frac{x^2}{2}\n\\]";
    const json = '[\n  { "a": 1 },\n  { "b": 2 }\n]';
    const numbers = "[\n  1,\n  2\n]";

    document = parseMarkup(renderStatic(formula, options));
    expect(document.querySelectorAll(".katex")).toHaveLength(1);
    expect(document.body.textContent).not.toContain("\\]");

    document = parseMarkup(renderStatic(json, options));
    expect(document.querySelector(".katex")).toBeNull();
    expect(document.body.textContent).toContain('"a": 1');

    document = parseMarkup(renderStatic(numbers, options));
    expect(document.querySelector(".katex")).toBeNull();
    expect(document.body.textContent).toContain("1,");
  });

  it("keeps currency and placeholder dollars as prose", () => {
    const source =
      "**$2000~$5000 dollars**\n\nEquivalent to $...$, with `$...$` and `\\(...\\)` as code.";
    const document = parseMarkup(renderStatic(source, options));
    const codes = Array.from(document.querySelectorAll("code"));

    expect(document.querySelector(".katex")).toBeNull();
    expect(document.querySelector("strong")?.textContent).toContain(
      "$2000~$5000 dollars",
    );
    expect(codes.map((code) => code.textContent)).toEqual([
      "$...$",
      "\\(...\\)",
    ]);
  });

  it("protects dollar and parenthesis notation inside inline code", () => {
    const document = parseMarkup(renderStatic("`$...$`, `\\(...\\)`", options));
    const codes = Array.from(document.querySelectorAll("code"));

    expect(document.querySelector(".katex")).toBeNull();
    expect(codes.map((code) => code.textContent)).toEqual([
      "$...$",
      "\\(...\\)",
    ]);
  });

  it("renders inline single- and double-dollar formulas together", () => {
    const document = parseMarkup(
      renderStatic("Math: $$E=mc^2$$ and $1$.", options),
    );

    expect(document.querySelectorAll(".katex")).toHaveLength(2);
  });

  it("preserves unit formulas inside list items", () => {
    const source =
      "- Value: $c=0.75\\times10^3\\ \\text{J/(kg·℃)}$ and $m=1.1\\ \\text{kg}$\n" +
      "- Result: $Q_1=3.3\\times 10^{4}\\ \\text{J}$";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const document = parseMarkup(renderStatic(source, options));

    expect(document.querySelectorAll("li")).toHaveLength(2);
    expect(document.querySelectorAll(".katex")).toHaveLength(3);
    expect(document.querySelector(".katex-error")).toBeNull();
    expect(warning).not.toHaveBeenCalled();
  });

  it.each([1, 3, 11])(
    "matches finalized bracket math when streamed in chunks of %i",
    (size) => {
      const source = "Before\n\n[\ne^x = 1 + x + \\frac{x^2}{2}\n\\]\n\nAfter";

      expect(compactText(renderStreamed(source, size, options))).toBe(
        compactText(renderStatic(source, options)),
      );
    },
  );
});

describe("same-line display delimiters", () => {
  it("renders \\[ … \\] written on one line", () => {
    // The form models emit most often. remark-math wants the fences on their
    // own lines, so convertMath lifts the body onto one.
    const document = parseMarkup(
      renderStatic("Before\n\n\\[x^2 + y^2 = z^2\\]\n\nAfter", options),
    );

    expect(document.querySelector(".katex")).not.toBeNull();
  });

  it("still renders the multi-line form", () => {
    expect(
      parseMarkup(renderStatic("\\[\nx^2\n\\]", options)).querySelector(".katex"),
    ).not.toBeNull();
  });

  it("survives arriving one character at a time", () => {
    expect(
      parseMarkup(renderStreamed("\\[x^2 + y^2\\]", 1, options)).querySelector(".katex"),
    ).not.toBeNull();
  });

  it("leaves an escaped bracket that is not maths as text", () => {
    const document = parseMarkup(renderStatic("\\[see notes\\]", options));

    expect(document.querySelector(".katex")).toBeNull();
    expect(document.body.textContent).toContain("[see notes]");
  });
});
