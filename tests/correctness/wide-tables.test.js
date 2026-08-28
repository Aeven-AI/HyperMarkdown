import { describe, expect, it } from "vitest";

import {
  parseMarkup,
  renderPending,
  renderStatic,
  renderStreamed,
} from "../helpers/render";

const narrow = "| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |";
const wide =
  "| A | B | C | D |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |";

function tableScroll(markup) {
  return parseMarkup(markup).querySelector(".table-scroll");
}

describe("wide table presentation hook", () => {
  it.each([
    ["static", renderStatic],
    ["streamed", (markdown) => renderStreamed(markdown, 3)],
    ["pending stream", renderPending],
  ])("marks a four-column table in a %s render", (_name, render) => {
    const scroll = tableScroll(render(wide));

    expect(scroll).not.toBeNull();
    expect(scroll?.classList.contains("md-table-wide")).toBe(true);
    expect(scroll?.querySelector("table")?.classList.contains("md-table-wide"))
      .toBe(false);
  });

  it.each([
    ["static", renderStatic],
    ["streamed", (markdown) => renderStreamed(markdown, 3)],
    ["pending stream", renderPending],
  ])("leaves a three-column table unmarked in a %s render", (_name, render) => {
    const scroll = tableScroll(render(narrow));

    expect(scroll).not.toBeNull();
    expect(scroll?.classList.contains("md-table-wide")).toBe(false);
  });
});
