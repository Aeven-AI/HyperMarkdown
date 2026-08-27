import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let Renderer;
let katexPlugin;
let highlightPlugin;
let mermaidPlugin;

beforeAll(async () => {
  Renderer = (await import("../lib/renderer")).default;
  katexPlugin = (await import("../lib/plugins/math")).katexPlugin;
  highlightPlugin = (await import("../lib/plugins/code")).highlightPlugin;
  mermaidPlugin = (await import("../lib/plugins/mermaid")).mermaidPlugin;
});

function html(md, plugins) {
  const renderer = new Renderer({ md, streaming: false, plugins });
  return renderToStaticMarkup(renderer.render());
}

describe("optional plugins", () => {
  const math = "Einstein said $E = mc^2$ and also:\n\n$$\n\\frac{a}{b}\n$$\n\n";
  const code = "```js\nconst a = 1;\n```\n\n";
  const diagram = "```mermaid\ngraph TD;\nA-->B;\n```\n\n";

  it("renders maths only when a maths plugin is supplied", () => {
    expect(html(math, { math: katexPlugin() })).toContain("katex");
    expect(html(math, {})).not.toContain("katex");
  });

  it("keeps the maths readable when there is no maths plugin", () => {
    const bare = html(math, {});

    expect(bare).toContain("E = mc^2");
    expect(bare).toContain("\\frac{a}{b}");
  });

  it("highlights code only when a code plugin is supplied", () => {
    expect(html(code, { code: highlightPlugin() })).toContain("hljs");
    expect(html(code, {})).not.toContain("hljs");
  });

  it("still renders the code block without a code plugin", () => {
    const bare = html(code, {});

    expect(bare).toContain("codeblock-wrapper");
    expect(bare).toContain("const a = 1;");
  });

  it("makes a diagram element only when a diagram plugin is supplied", () => {
    expect(html(diagram, { diagram: mermaidPlugin() })).toContain(
      "mermaid-wrapper",
    );
  });

  it("falls back to a code block when there is no diagram plugin", () => {
    const bare = html(diagram, {});

    expect(bare).not.toContain("mermaid-wrapper");
    expect(bare).toContain("codeblock-wrapper");
    expect(bare).toContain("graph TD;");
  });

  it("does not import mermaid until a diagram is rendered", () => {
    const plugin = mermaidPlugin();
    expect(plugin.loaded()).toBe(null);
  });

  it("renders everything with no plugins at all", () => {
    const out = html(
      math + code + diagram + "# Title\n\nSome **bold**.\n\n",
      {},
    );

    expect(out).toContain("Title");
    expect(out).toContain("<strong>bold</strong>");
  });
});
