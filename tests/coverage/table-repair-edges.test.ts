import { describe, expect, it } from "vitest";

import {
  checkHeaded,
  collectFencedRanges,
  convertTable,
  convertTableHeadless,
  convertTableWithHeader,
  isInsideFenced,
  repairTableSyntax,
} from "../../lib/repair/tables";

describe("table repair edge cases", () => {
  it("leaves unrelated blocks unchanged", () => {
    expect(repairTableSyntax("plain", "text", true)).toBe("plain");
    expect(checkHeaded("no pipes")).toBe(false);
    expect(convertTableHeadless("plain", [""])).toBe("plain");
  });

  it("does not rewrite pipe-shaped text inside fences", () => {
    const markdown = "before\n```txt\na | b\nc | d\n```\nafter";
    expect(repairTableSyntax(markdown, "renderer", false)).toContain("a | b\nc | d");
    const ranges = collectFencedRanges(markdown);
    expect(ranges).toHaveLength(1);
    expect(isInsideFenced(ranges[0]!.start, ranges)).toBe(true);
    expect(isInsideFenced(markdown.length, ranges)).toBe(false);
    expect(isInsideFenced(0, [])).toBe(false);
    expect(isInsideFenced(0, [undefined as any])).toBe(false);
  });

  it("preserves leading whitespace in pending headed tables", () => {
    const source = "  | A | B |";
    const converted = convertTableWithHeader(true, source, "| A | B |", ["| A | B |"]);
    expect(converted.startsWith("  | A | B |")).toBe(true);
    expect(convertTableWithHeader(false, source, "| A | B |", ["| A | B |"]))
      .toBe(source);
  });

  it("keeps trailing arrow text that is not an HTML comment", () => {
    const markdown = "| A | -->\n| --- |";

    expect(convertTable(markdown, false)).toBe(markdown);
  });

  it("keeps a comment that is part of the final cell", () => {
    const markdown = "| A <!-- note -->\n| --- |";

    expect(convertTable(markdown, false)).toBe(markdown);
  });
});
