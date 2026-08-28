import { describe, expect, it } from "vitest";

import { renderStatic, visibleText, parseMarkup } from "../helpers/render.js";

const MARKUP = 'Text <b>bold</b> and <img src="x" onerror="boom()"> end.';
const SCRIPT = "Before <script>alert(1)</script> after.";

describe("html mode", () => {
  it("sanitize (the default) parses the markup into elements", () => {
    const document = parseMarkup(renderStatic(MARKUP));

    expect(document.querySelector("b")).not.toBeNull();
    expect(visibleText(renderStatic(MARKUP))).toContain("bold");
  });

  it("literal renders the markup as text and puts no element in the DOM", () => {
    const markup = renderStatic(MARKUP, { html: "literal" });
    const document = parseMarkup(markup);

    // Nothing the author wrote became an element.
    expect(document.querySelector("b")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    // It is all still readable, exactly as written.
    expect(visibleText(markup)).toContain("<b>bold</b>");
    expect(visibleText(markup)).toContain('<img src="x" onerror="boom()">');
  });

  it("literal does not let a script through in any form", () => {
    const markup = renderStatic(SCRIPT, { html: "literal" });
    const document = parseMarkup(markup);

    expect(document.querySelector("script")).toBeNull();
    expect(visibleText(markup)).toContain("<script>alert(1)</script>");
  });

  it("literal leaves ordinary markdown untouched", () => {
    const markup = renderStatic("# Head\n\n**bold** and `code`.", {
      html: "literal",
    });
    const document = parseMarkup(markup);

    expect(document.querySelector("h1")?.textContent).toBe("Head");
    expect(document.querySelector("strong")?.textContent).toBe("bold");
    expect(document.querySelector("code")?.textContent).toBe("code");
  });

  it("raw is still selected by the older sanitize: false", () => {
    // The mode shows in which elements survive. React never renders a string
    // event handler, so onerror is not the thing to assert on.
    const framed = 'Text <iframe src="https://example.com"></iframe> end.';
    const raw = parseMarkup(renderStatic(framed, { sanitize: false }));
    const sanitized = parseMarkup(renderStatic(framed));
    const literal = parseMarkup(renderStatic(framed, { html: "literal" }));

    // An <iframe> is not in the schema: raw keeps it, sanitize drops the
    // element, and literal never creates one in the first place.
    expect(raw.querySelector("iframe")).not.toBeNull();
    expect(sanitized.querySelector("iframe")).toBeNull();
    expect(literal.querySelector("iframe")).toBeNull();
  });
});
