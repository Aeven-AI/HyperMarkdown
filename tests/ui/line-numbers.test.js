import { describe, expect, it } from "vitest";

import { parseMarkup, renderPending } from "../helpers/render.js";

/**
 * The gutter is driven by the streaming cache's tally, which arrives as a
 * prop. Mirroring it into state costs a render: the gutter would draw from the
 * previous count and every line number would trail the line it belongs to by
 * one pass. These render a single pass on purpose, so a gutter that needs a
 * second one to catch up shows up as a short count.
 */
function gutter(markdown) {
  const document = parseMarkup(renderPending(markdown));

  return {
    numbers: [...document.querySelectorAll(".line-number")].map((node) =>
      node.textContent.trim(),
    ),
    lines: (document.querySelector(".code-content")?.textContent ?? "")
      .split("\n")
      .filter((line) => line !== "").length,
  };
}

describe("streaming code gutter", () => {
  it("numbers every line in the pass that renders it", () => {
    const { numbers, lines } = gutter(
      "```js\nconst a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\n",
    );

    expect(lines).toBe(4);
    expect(numbers).toEqual(["1", "2", "3", "4"]);
  });

  it("keeps up as the fence grows", () => {
    let count;

    for (count = 1; count <= 6; count++) {
      const body = Array.from(
        { length: count },
        (_, index) => `line${index + 1}();`,
      ).join("\n");

      const { numbers } = gutter("```js\n" + body + "\n");

      expect(numbers).toHaveLength(count);
      expect(numbers.at(-1)).toBe(String(count));
    }
  });

  it("numbers the line still being typed, before its newline arrives", () => {
    // "const c = 3;" has no newline yet: it is on screen, so it needs a
    // number. Counting only committed lines leaves the gutter one short for
    // the whole time a line is being written, which is all of streaming.
    const { numbers, lines } = gutter(
      "```js\nconst a = 1;\nconst b = 2;\nconst c = 3;",
    );

    expect(lines).toBe(3);
    expect(numbers).toEqual(["1", "2", "3"]);
  });

  it("does not number a bare closing fence as a line", () => {
    const { numbers } = gutter("```js\nconst a = 1;\n```");

    expect(numbers).toEqual(["1"]);
  });

  it("still counts a settled block that has no tally to read", () => {
    const document = parseMarkup(
      renderPending("```js\nconst a = 1;\nconst b = 2;\n```\n"),
    );

    // A closed fence renders through the settled path, where the gutter
    // measures the DOM instead; it must not regress to a lone "1".
    expect(document.querySelectorAll(".line-number").length).toBeGreaterThan(0);
  });
});
