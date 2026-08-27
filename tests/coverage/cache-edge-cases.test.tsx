import { describe, expect, it, vi } from "vitest";

import { CodeCache } from "../../lib/cache/code";
import { ListCache } from "../../lib/cache/list";
import { TableCache } from "../../lib/cache/table";

const components = {};

function processorReturning(tree: any) {
  return {
    parse: vi.fn((value) => value),
    runSync: vi.fn(() => tree),
  } as any;
}

describe("cache defensive edges", () => {
  it("ignores duplicate and invalid code input and resets all state", () => {
    const cache = new CodeCache();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    cache.append("not a fence", false);
    expect(error).toHaveBeenCalled();
    cache.reset();
    cache.append("```\nword", true);
    cache.append("```\nword", true);
    (cache as any).render(99, "", false);
    expect(cache.data).toHaveLength(1);
    expect(cache.language).toBeNull();
  });

  it("covers code-cache match metadata and blank highlighted lines", () => {
    const cache: any = new CodeCache();
    const nativeMatch = String.prototype.match;
    let suppliedMatchWithoutIndex = false;
    const match = vi
      .spyOn(String.prototype, "match")
      .mockImplementation(function (this: string, expression: RegExp) {
        if (
          suppliedMatchWithoutIndex !== true &&
          String(this) === "line\n" &&
          expression.source === "\\r\\n?|\\n"
        ) {
          suppliedMatchWithoutIndex = true;
          return ["\n"] as RegExpMatchArray;
        }

        return nativeMatch.call(this, expression);
      });

    cache.fenceRead = true;
    cache.append("line\n", false);
    expect(cache.data.length).toBeGreaterThan(0);
    expect(cache.colour("\n", vi.fn())).toBeNull();
    match.mockRestore();
  });

  it("returns null when a list processor cannot produce an item", () => {
    const cache = new ListCache();
    const processor = processorReturning({ type: "root", children: [] });
    cache.append("- item", processor, components);
    expect(cache.data).toEqual([null]);
    cache.invalidate();
    cache.reset();
    expect(cache.signature).toBeNull();
  });

  it("waits for a table delimiter and handles processors with no rows", () => {
    const cache = new TableCache();
    const processor = processorReturning({ type: "root", children: [] });
    cache.append("header", processor, components);
    cache.append("header\ndelimiter", processor, components);
    cache.append("| A |\n|---|\n| value |", processor, components);
    expect((cache as any).renderRow(0, "", processor, components)).toBeNull();
    expect(cache.head).toBeNull();
    expect(cache.data).toEqual([]);
    cache.reset();
    expect(cache.head).toBeNull();
  });

  it("normalizes a defensive table body boundary", () => {
    const cache: any = new TableCache();
    const source = "| A |\n|---|\n";
    const nativeLastIndexOf = String.prototype.lastIndexOf;
    const lastIndexOf = vi
      .spyOn(String.prototype, "lastIndexOf")
      .mockImplementation(function (
        this: string,
        search: string,
        position?: number,
      ) {
        if (String(this) === source && search === "\n") {
          return -1;
        }

        return nativeLastIndexOf.call(this, search, position);
      });

    cache.renderHead = vi.fn(() => ({ type: "tr" }));
    cache.append(source, processorReturning({ type: "root", children: [] }), components);
    expect(cache.head).toEqual({ type: "tr" });
    lastIndexOf.mockRestore();
  });
});
