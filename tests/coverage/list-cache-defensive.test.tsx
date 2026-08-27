import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/stream/list-structure", async () => {
  const actual = await vi.importActual<typeof import("../../lib/stream/list-structure")>(
    "../../lib/stream/list-structure",
  );

  return { ...actual, listItems: vi.fn() };
});

import { ListCache } from "../../lib/cache/list";
import { listItems } from "../../lib/stream/list-structure";

const mockedListItems = vi.mocked(listItems);
const processor = {
  parse: vi.fn((value) => value),
  runSync: vi.fn(() => ({ type: "root", children: [] })),
} as any;

describe("list cache defensive inputs", () => {
  it("handles missing, blank, and markerless items", () => {
    const cache = new ListCache();

    mockedListItems.mockReturnValueOnce([undefined as any]);
    cache.append("- item", processor, {});
    expect(cache.data).toEqual([null]);

    mockedListItems.mockReturnValueOnce(["   "]);
    cache.append("- item", processor, {});
    expect(cache.data).toEqual([null]);

    mockedListItems.mockReturnValueOnce(["markerless item"]);
    cache.append("- item\n\ncontinued", processor, {});
    expect(processor.parse).toHaveBeenLastCalledWith(
      "markerless item\n\n- x",
    );
  });
});
