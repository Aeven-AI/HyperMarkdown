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

  it("uses the host's translations for those names", () => {
    const names = buttonNames(
      renderStatic(FENCE, { translations: { copyCode: "Kopieren", fullScreen: "Vollbild" } }),
    );

    expect(names).toContain("Kopieren");
  });
});
