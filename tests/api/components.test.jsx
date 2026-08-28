import { describe, expect, it } from "vitest";

import { renderStatic, renderStreamed, parseMarkup } from "../helpers/render.js";

/** Stands in for a host decorating inline code it recognises, e.g. a filename. */
function Mention(props) {
  return <code data-mention="yes">{props.children}</code>;
}

/** Stands in for a host replacing a tag the renderer already claims. */
function PlainLink(props) {
  return <a data-host-link="yes">{props.children}</a>;
}

const components = { code: Mention, a: PlainLink };

describe("component overrides", () => {
  it("claims a tag the renderer leaves alone, such as inline code", () => {
    const document = parseMarkup(renderStatic("Open `index.html` now.", { components }));

    expect(document.querySelector("code")?.getAttribute("data-mention")).toBe("yes");
    expect(document.querySelector("code")?.textContent).toBe("index.html");
  });

  it("wins over a tag the renderer already claims", () => {
    const markup = renderStatic("A [link](https://example.com).", { components });

    expect(parseMarkup(markup).querySelector("a")?.getAttribute("data-host-link")).toBe("yes");
  });

  it("reaches inline code inside a table cell", () => {
    const table = "| a | b |\n| --- | --- |\n| `one.txt` | plain |";
    const document = parseMarkup(renderStatic(table, { components }));

    expect(document.querySelector("td code")?.getAttribute("data-mention")).toBe("yes");
  });

  it("reaches inline code inside a list item", () => {
    const document = parseMarkup(renderStatic("- see `two.txt`\n- and more", { components }));

    expect(document.querySelector("li code")?.getAttribute("data-mention")).toBe("yes");
  });

  it("applies while streaming, through the cached row and item paths", () => {
    const source = "| a |\n| --- |\n| `three.txt` |\n\n- `four.txt`\n- tail\n";
    const document = parseMarkup(renderStreamed(source, 4, { components }));
    const decorated = [...document.querySelectorAll("code[data-mention]")];

    expect(decorated.map((node) => node.textContent)).toEqual(["three.txt", "four.txt"]);
  });

  it("leaves the built-in map in place when nothing is passed", () => {
    const document = parseMarkup(renderStatic("Open `index.html` now."));

    expect(document.querySelector("code")?.getAttribute("data-mention")).toBeNull();
    expect(document.querySelector("code")?.textContent).toBe("index.html");
  });
});
