import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { katexPlugin } from "../../lib/plugins/math";
import Renderer from "../../lib/renderer";

// A half-arrived formula is withheld, and a placeholder stands where it will
// appear. That placeholder is renderer chrome, so it has to be an element in
// every HTML mode — including `literal`, which a host renders untrusted output
// with precisely so that author markup never becomes elements.
const PARTIAL = "$$\n\\frac{\\partial \\mathbf{u}}{\\partial";

function streamed(html) {
  const renderer = new Renderer({
    streaming: true,
    animation: false,
    plugins: { math: katexPlugin() },
    ...(html === undefined ? {} : { html }),
  });

  renderer.streamMd(PARTIAL, true, false, false);

  return renderToStaticMarkup(renderer.render());
}

describe("the withheld-maths placeholder", () => {
  for (const html of [undefined, "literal", "raw"]) {
    it(`is an element, not markup, with html=${String(html)}`, () => {
      const markup = streamed(html);

      expect(markup).toContain('class="math-pending"');
      // The characters of the tag must never reach the reader.
      expect(markup).not.toContain("&lt;span");
      expect(markup).not.toContain("math-pending&gt;");
    });

    it(`shows neither the raw formula nor KaTeX with html=${String(html)}`, () => {
      const markup = streamed(html);

      expect(markup).not.toContain("\\frac");
      expect(markup).not.toContain("katex");
    });
  }

  it("leaves the private-use marker out of the rendered text", () => {
    expect(streamed(undefined)).not.toContain("");
  });

  it("renders the formula once it completes", () => {
    const renderer = new Renderer({
      md: "$$\n\\frac{\\partial \\mathbf{u}}{\\partial t}\n$$",
      streaming: false,
      plugins: { math: katexPlugin() },
    });
    const markup = renderToStaticMarkup(renderer.render());

    expect(markup).toContain("katex");
    expect(markup).not.toContain("math-pending");
  });
});
