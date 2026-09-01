import { describe, expect, it, vi } from "vitest";

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

  it("covers absent regex metadata and split entries defensively", () => {
    // A line the table scanner finds nothing in is handed back untouched.
    expect(repairTableSyntax("row", "renderer", false)).toBe("row");

    const nativeSplit = String.prototype.split;
    let splitCount = 0;
    const split = vi
      .spyOn(String.prototype, "split")
      .mockImplementation(function (
        this: string,
        separator?: string | RegExp,
        limit?: number,
      ) {
        if (String(this) === "|" && separator === "\n" && splitCount++ === 1) {
          return [];
        }

        return nativeSplit.call(this, separator, limit);
      });
    expect(convertTable("|", false)).toBe("|");
    split.mockRestore();
  });

  it("handles missing leading-whitespace match metadata", () => {
    const headless = new String("a | b") as unknown as string;
    (headless as any).match = () => null;
    expect(convertTableHeadless(headless, ["a | b"])).toContain("| :--- |");

    const headed = new String("| A |") as unknown as string;
    (headed as any).match = () => null;
    expect(convertTableWithHeader(true, headed, "| A |", ["| A |"]))
      .toContain("| :--- |");
  });

  it("handles missing delimiter metadata in a renderer table run", () => {
    const nativeSplit = String.prototype.split;
    const split = vi
      .spyOn(String.prototype, "split")
      .mockImplementation(function (
        this: string,
        separator?: string | RegExp,
        limit?: number,
      ) {
        if (String(this) === "|\n|" && separator === "\n") {
          return ["|"];
        }

        return nativeSplit.call(this, separator, limit);
      });

    expect(() => repairTableSyntax("|\n|\n", "renderer", false)).not.toThrow();
    split.mockRestore();
  });
});
