import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Renderer from "../../lib/renderer";

/** Record what the replaced `code` component is told about each element. */
function contexts(md) {
  const seen = [];
  const renderer = new Renderer({
    md,
    streaming: false,
    components: {
      code: function Code(props) {
        seen.push({
          inline: props.inline,
          insideLink: props.insideLink,
          className: props.className,
          value: typeof props.children === "string" ? props.children : undefined,
        });
        return null;
      },
    },
  });

  renderToStaticMarkup(renderer.render());

  return seen;
}

describe("code component context", () => {
  it("separates inline code from a fence that names no language", () => {
    expect(contexts("`inline`\n\n```\nfenced\n```")).toEqual([
      { inline: true, insideLink: false, className: undefined, value: "inline" },
      { inline: false, insideLink: false, className: undefined, value: "fenced\n" },
    ]);
  });

  it("reports the language a fence named", () => {
    const [fence] = contexts("```ts\nconst a = 1\n```");

    expect(fence).toMatchObject({ inline: false, className: "language-ts" });
  });

  it("reports inline code enclosed by a link", () => {
    expect(contexts("[see `config.ts`](https://example.com)")).toEqual([
      { inline: true, insideLink: true, className: undefined, value: "config.ts" },
    ]);
  });

  it("reports inline code outside a link as outside one", () => {
    const [code] = contexts("see `config.ts` here");

    expect(code).toMatchObject({ inline: true, insideLink: false });
  });

  it("reports a fence nested in a link's list item", () => {
    // An `<a>` cannot contain a fence, so this only checks that ancestry is
    // read rather than assumed: the fence is not inside the link.
    const [fence] = contexts("- [text](https://example.com)\n\n  ```\n  body\n  ```");

    expect(fence).toMatchObject({ inline: false, insideLink: false });
  });
});
