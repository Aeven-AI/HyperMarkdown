import { describe, expect, it } from "vitest";

import { definitionsOnly } from "../../../lib/stream/definitions";
import { collectReferences } from "../../../lib/stream/references";

describe.each([
  ["single definition", "[^1]: first", true],
  ["multiple definitions", "[^1]: first\n[^2]: second", true],
  ["continued definition", "[^1]: first\n\n    second paragraph", true],
  ["indented label", "   [^note]: value", true],
  ["empty", "", false],
  ["prose", "paragraph", false],
  ["link definition", "[docs]: https://example.com", false],
  ["definition and prose", "[^1]: first\nparagraph", false],
])("definitionsOnly: %s", (_name, input, expected) => {
  it(`returns ${expected}`, () => {
    expect(definitionsOnly(input)).toBe(expected);
  });
});

describe("collectReferences", () => {
  it("returns null when the chunk has no footnote syntax", () => {
    expect(collectReferences("plain text", new Map())).toBeNull();
  });

  it("returns null for a reference whose definition has not arrived", () => {
    expect(collectReferences("claim[^later]", new Map())).toBeNull();
  });

  it("collects definitions and returns the accumulated reference block", () => {
    const footnotes = new Map();
    const result = collectReferences("claim[^a]\n\n[^a]: Note A.", footnotes);

    expect(footnotes.get("[^a]")?.trim()).toBe("[^a]: Note A.");
    expect(result?.replace(/\n{2,}/g, "\n").trim()).toBe("[^a]\n[^a]: Note A.");
  });

  it("preserves prior definitions when a later reference is processed", () => {
    const footnotes = new Map([["[^a]", "[^a]: Note A."]]);
    const result = collectReferences("second[^b]\n\n[^b]: Note B.", footnotes);

    expect(result?.replace(/\n{2,}/g, "\n")).toBe(
      "[^a] [^b]\n[^a]: Note A.\n[^b]: Note B.",
    );
  });

  it("returns accumulated definitions for a repeated reference", () => {
    const footnotes = new Map([["[^a]", "[^a]: Note A."]]);

    expect(collectReferences("again[^a]", footnotes)).toBe(
      "[^a]\n\n[^a]: Note A.",
    );
  });
});
