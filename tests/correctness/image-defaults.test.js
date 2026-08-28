import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Renderer from "../../lib/renderer";
import { parseMarkup } from "../helpers/render";

function imageOf(source) {
  const renderer = new Renderer({ md: source, streaming: false });
  return parseMarkup(renderToStaticMarkup(renderer.render())).querySelector("img");
}

describe("remote image defaults", () => {
  it("defers loading, decodes off-thread, and sends no referrer", () => {
    const image = imageOf("![a dog](https://example.com/dog.png)");

    expect(image?.getAttribute("loading")).toBe("lazy");
    expect(image?.getAttribute("decoding")).toBe("async");
    expect(image?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("keeps the source, alt text, and title the document supplied", () => {
    const image = imageOf('![a dog](https://example.com/dog.png "Rex")');

    expect(image?.getAttribute("src")).toBe("https://example.com/dog.png");
    expect(image?.getAttribute("alt")).toBe("a dog");
    expect(image?.getAttribute("title")).toBe("Rex");
  });

  it("renders an empty alt for an image the document gave none", () => {
    expect(imageOf("![](https://example.com/dog.png)")?.getAttribute("alt")).toBe("");
  });
});
