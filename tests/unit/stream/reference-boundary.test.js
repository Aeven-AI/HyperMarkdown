import { describe, expect, it } from "vitest";

import { findBlockBoundary } from "../../../lib/stream/find-block-boundary";

/**
 * A block boundary and the reference definitions that follow it.
 *
 * A block is handed to remark on its own, so a definition left on the other
 * side of the boundary renders its reference as literal text. These are the
 * shapes that decide whether the run of definitions after the boundary joins
 * the block, read straight off findBlockBoundary() so each one is exact.
 */
const refs = (finalize = true) => ({
  footnotes: new Map(),
  mdExtra: new Map(),
  finalize,
});

describe("findBlockBoundary: reference definitions", () => {
  it("carries a definition that follows a footnote definition", () => {
    const close = findBlockBoundary(
      "Reference [ref][1] and a note[^1].\n\n[^1]: The note.\n\n[1]: https://example.com/ref",
      "text",
      refs(),
    );

    expect(close.close).toBe(true);
    expect(close.md).toContain("[1]: https://example.com/ref");
    expect(close.mdNext).toBe("");
  });

  it("carries a run that holds a footnote definition after the link one", () => {
    const close = findBlockBoundary(
      "See [ref][1].\n\n[^9]: note\n\n[1]: https://example.com/ref\n[^2]: second",
      "text",
      refs(),
    );

    expect(close.md).toContain("[1]: https://example.com/ref");
    expect(close.md).toContain("[^2]: second");
  });

  it("leaves a definition the block does not refer to where it is", () => {
    const close = findBlockBoundary(
      "See [ref][1] and a note[^1].\n\n[^1]: note\n\n[2]: https://example.com/two",
      "text",
      refs(),
    );

    expect(close.md).not.toContain("[2]");
    expect(close.mdNext).toBe("[2]: https://example.com/two");
  });

  it("leaves a definition that is still arriving where it is", () => {
    const close = findBlockBoundary(
      "See [ref][1] and a note[^1].\n\n[^1]: note\n\n[1]: https://example.com/ref\n",
      "text",
      refs(false),
    );

    expect(close.md).not.toContain("[1]: https://example.com/ref");
    expect(close.mdNext).toContain("[1]: https://example.com/ref");
  });
});
