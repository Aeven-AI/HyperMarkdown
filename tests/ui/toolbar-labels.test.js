import { describe, expect, it } from "vitest";

import { renderStatic, parseMarkup } from "../helpers/render.js";

const FENCE = "```ts\nconst a = 1;\n```";
const TABLE = "| a | b |\n| --- | --- |\n| 1 | 2 |";

/** Accessible names of every toolbar button in the rendered markup. */
function buttonNames(markup) {
  return [...parseMarkup(markup).querySelectorAll("button")].map((button) =>
    button.getAttribute("aria-label"),
  );
}

describe("toolbar button accessible names", () => {
  it("names every code-block button", () => {
    const names = buttonNames(renderStatic(FENCE));

    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain(null);
    expect(names).toContain("Copy code");
  });

  it("names every table button", () => {
    const names = buttonNames(renderStatic(TABLE));

    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain(null);
  });

  // Fullscreen is the outermost control on every block kind, so it sits last in
  // the toolbar and the reading order matches what the eye sees.
  it("puts copy before fullscreen on a code block", () => {
    const names = buttonNames(renderStatic(FENCE));

    expect(names).toContain("Copy code");
    expect(names).toContain("Full screen");
    expect(names.indexOf("Copy code")).toBeLessThan(names.indexOf("Full screen"));
    expect(names[names.length - 1]).toBe("Full screen");
  });

  it("puts copy before fullscreen on a table", () => {
    const names = buttonNames(renderStatic(TABLE));

    expect(names).toEqual(["Copy", "Full screen"]);
  });

  it("uses the host's translations for those names", () => {
    const names = buttonNames(
      renderStatic(FENCE, { translations: { copyCode: "Kopieren", fullScreen: "Vollbild" } }),
    );

    expect(names).toContain("Kopieren");
  });
});
