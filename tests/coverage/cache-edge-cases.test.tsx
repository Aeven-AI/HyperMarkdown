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
});
