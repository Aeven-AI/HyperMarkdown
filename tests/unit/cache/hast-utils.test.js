import { describe, expect, it } from "vitest";

import { findListItem, findSectionRow } from "../../../lib/cache/utils";

function element(tagName, children = []) {
  return { type: "element", tagName, properties: {}, children };
}

function root(children) {
  return { type: "root", children };
}

describe("findSectionRow", () => {
  it("returns the first direct row in the requested table section", () => {
    const bodyRow = element("tr");
    const headRow = element("tr");
    const tree = root([
      element("table", [
        element("thead", [{ type: "text", value: "gap" }, headRow]),
        element("tbody", [bodyRow, element("tr")]),
      ]),
    ]);

    expect(findSectionRow(tree, "thead")).toBe(headRow);
    expect(findSectionRow(tree, "tbody")).toBe(bodyRow);
  });

  it("does not return a nested row that is not a direct section child", () => {
    const tree = root([element("tbody", [element("div", [element("tr")])])]);

    expect(findSectionRow(tree, "tbody")).toBeNull();
  });

  it("returns null when the requested section is absent", () => {
    expect(findSectionRow(root([element("p")]), "thead")).toBeNull();
  });
});

describe("findListItem", () => {
  it("returns the first direct item from the first list", () => {
    const first = element("li");
    const tree = root([element("div", [element("ul", [first, element("li")])])]);

    expect(findListItem(tree)).toBe(first);
  });

  it("supports ordered lists", () => {
    const item = element("li");

    expect(findListItem(root([element("ol", [item])]))).toBe(item);
  });

  it("ignores nested items that are not direct list children", () => {
    const tree = root([element("ul", [element("div", [element("li")])])]);

    expect(findListItem(tree)).toBeNull();
  });

  it("returns null when there is no list", () => {
    expect(findListItem(root([element("p")]))).toBeNull();
  });
});
