import { describe, expect, it } from "vitest";

import {
  listCacheable,
  listItems,
  listMarkerFamily,
} from "../../../lib/stream/list-structure";

describe.each([
  ["- item", "bullet-"],
  ["* item", "bullet*"],
  ["+ item", "bullet+"],
  ["1. item", "ordered."],
  ["27) item", "ordered)"],
  ["plain text", null],
])("listMarkerFamily(%j)", (input, expected) => {
  it("identifies the marker family", () => {
    expect(listMarkerFamily(input)).toBe(expected);
  });
});

describe.each([
  ["two bullets", "- one\n- two", true],
  ["ordered items", "1. one\n2. two", true],
  ["nested list", "- one\n  - nested\n- two", true],
  ["loose list", "- one\n\n- two", true],
  ["one item", "- one", false],
  ["mixed bullets", "- one\n* two", false],
  ["mixed ordered delimiters", "1. one\n2) two", false],
  ["prose before list", "intro\n- one\n- two", false],
  ["continuation at base indent", "- one\ncontinued\n- two", false],
])("listCacheable: %s", (_name, input, expected) => {
  it(`returns ${expected}`, () => {
    expect(listCacheable(input)).toBe(expected);
  });
});

describe("listItems", () => {
  it("keeps nested and continuation lines with their top-level item", () => {
    const markdown = "- one\n  continuation\n  - nested\n- two\n  tail";

    expect(listItems(markdown)).toEqual([
      "- one\n  continuation\n  - nested",
      "- two\n  tail",
    ]);
  });

  it("supports indented ordered lists", () => {
    expect(listItems("  1. one\n      - nested\n  2. two")).toEqual([
      "  1. one\n      - nested",
      "  2. two",
    ]);
  });

  it("returns no items for prose", () => {
    expect(listItems("not a list\nstill prose")).toEqual([]);
  });
});
