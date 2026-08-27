import { describe, expect, it } from "vitest";

import { parseMarkup, renderStatic, renderStreamed } from "../helpers/render";

/**
 * A GFM table whose header cells are all empty renders headless: the header
 * row is kept for column sizing and hidden by the stylesheet. These are the
 * shapes that stopped being tables at all when the delimiter check was
 * tightened, because a trailing HTML comment pushed the header's cell count
 * one past the delimiter's and GFM then refuses the whole block.
 */
const documents = {
  "empty header": "| | | | |\n| - | - | - | - |\n|   |   |   |   |\n\n",
  "empty header, trailing comment":
    "| | | | | <!-- Empty headers and cells -->\n| - | - | - | - |\n|   |   |   |   |\n\n",
  "empty header, one column": "| |\n|---|\n| a |\n| b |\n\n",
  "empty header, spaced delimiter": "| | |\n| - | - |\n| a | b |\n\n",
};

describe("headless tables", () => {
  it.each(Object.entries(documents))("renders %s as a table", (_name, md) => {
    for (const markup of [renderStatic(md), renderStreamed(md, 3)]) {
      const table = parseMarkup(markup).querySelector("table");

      expect(table).not.toBe(null);
      expect(table?.getAttribute("data-headless")).toBe("true");
    }
  });

  it.each(Object.entries(documents))(
    "renders %s the same streamed as whole (%#)",
    (_name, md) => {
      const streamed = parseMarkup(renderStreamed(md, 3)).querySelector(
        "table",
      );
      const whole = parseMarkup(renderStatic(md)).querySelector("table");

      expect(streamed?.getAttribute("data-header-columns")).toBe(
        whole?.getAttribute("data-header-columns"),
      );
      expect(streamed?.querySelectorAll("tbody tr").length).toBe(
        whole?.querySelectorAll("tbody tr").length,
      );
    },
  );

  it("keeps a header that has content, comment or not", () => {
    for (const md of [
      "| A | B |\n|---|---|\n| a | b |\n\n",
      "| A | B | <!-- note -->\n|---|---|\n| a | b |\n\n",
    ]) {
      const table = parseMarkup(renderStreamed(md, 3)).querySelector("table");

      expect(table?.getAttribute("data-headless")).toBe("false");
      expect(
        [...table.querySelectorAll("th")].map((n) => n.textContent),
      ).toEqual(["A", "B"]);
    }
  });

  it("leaves a comment inside a cell alone", () => {
    const md = "| A | <!-- x --> B |\n|---|---|\n| a | b |\n\n";
    const table = parseMarkup(renderStreamed(md, 3)).querySelector("table");

    expect(table?.querySelectorAll("th")).toHaveLength(2);
  });
});
