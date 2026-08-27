import React from "react";
import { describe, expect, it } from "vitest";

import { readTableShape } from "../../../lib/table/shape";

function cell(type, content) {
  return React.createElement(type, null, content);
}

function row(cells) {
  return React.createElement("tr", null, ...cells);
}

function section(type, rows) {
  return React.createElement(type, null, ...rows);
}

function refs() {
  return [{ current: false }, { current: false }];
}

describe("readTableShape", () => {
  it("detects a headed table and settles both latches", () => {
    const shape = { headless: true, headerColumns: 0 };
    const [headlessSettled, columnsSettled] = refs();
    const children = [
      section("thead", [row([cell("th", "A"), cell("th", "B")])]),
      section("tbody", [row([cell("td", "1"), cell("td", "2")])]),
    ];

    readTableShape(children, shape, headlessSettled, columnsSettled);

    expect(shape).toEqual({ headless: false, headerColumns: 2 });
    expect(headlessSettled.current).toBe(true);
    expect(columnsSettled.current).toBe(true);
  });

  it("counts a single unwrapped header row and cell", () => {
    const shape = { headless: true, headerColumns: 0 };
    const [headlessSettled, columnsSettled] = refs();
    const children = section("thead", [row([cell("th", "Only")])]);

    readTableShape(children, shape, headlessSettled, columnsSettled);

    expect(shape).toEqual({ headless: false, headerColumns: 1 });
  });

  it("grows the provisional column count monotonically", () => {
    const shape = { headless: true, headerColumns: 3 };
    const [headlessSettled, columnsSettled] = refs();
    const children = section("thead", [row([cell("th"), cell("th")])]);

    readTableShape(children, shape, headlessSettled, columnsSettled);

    expect(shape.headerColumns).toBe(3);
    expect(headlessSettled.current).toBe(false);
  });

  it("handles an empty header section", () => {
    const shape = { headless: false, headerColumns: 0 };
    const [headlessSettled, columnsSettled] = refs();

    readTableShape(
      section("thead", []),
      shape,
      headlessSettled,
      columnsSettled,
    );

    expect(shape).toEqual({ headless: true, headerColumns: 0 });
  });

  it("settles a headless table after more than two body rows", () => {
    const shape = { headless: false, headerColumns: 0 };
    const [headlessSettled, columnsSettled] = refs();
    const children = section("tbody", [row([]), row([]), row([])]);

    readTableShape(children, shape, headlessSettled, columnsSettled);

    expect(shape.headless).toBe(true);
    expect(headlessSettled.current).toBe(true);
    expect(columnsSettled.current).toBe(true);
  });

  it("does no work after both values have settled", () => {
    const shape = { headless: true, headerColumns: 7 };
    const headlessSettled = { current: true };
    const columnsSettled = { current: true };
    const children = section("thead", [row([cell("th", "New")])]);

    readTableShape(children, shape, headlessSettled, columnsSettled);

    expect(shape).toEqual({ headless: true, headerColumns: 7 });
  });
});
