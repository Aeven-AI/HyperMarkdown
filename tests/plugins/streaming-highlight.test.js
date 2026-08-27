import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Renderer from "../../lib/renderer";
import { highlightPlugin } from "../../lib/plugins/code";
import { parseMarkup } from "../helpers/render.js";

const plugins = { code: highlightPlugin() };

/** A fence that is still open, so it renders through the streaming cache. */
const open = "```js\nconst a = 1;\nlet b = 2;";

/*
 * The animation flag is an argument to streamMd, not only a constructor
 * option, and it is the argument the highlighter is gated on -- so it is
 * passed in both places here rather than through the shared helpers, which
 * always stream with the animation off.
 */
function stream(md, animation, options = {}) {
  const renderer = new Renderer({
    streaming: true,
    animation,
    plugins,
    ...options,
  });

  renderer.streamMd(md, true, animation, false);

  return parseMarkup(renderToStaticMarkup(renderer.render()));
}

function streamed({ animation }) {
  return stream(open, animation);
}

describe("highlighting while code streams", () => {
  it("colours an open fence when the animation is off", () => {
    const document = streamed({ animation: false });

    expect(
      document.querySelectorAll(".code-content .hljs-keyword").length,
    ).toBeGreaterThan(0);
  });

  it("leaves it plain while the animation owns the words", () => {
    const document = streamed({ animation: true });

    expect(document.querySelectorAll(".code-content .hljs-keyword").length).toBe(
      0,
    );
    expect(
      document.querySelectorAll(".code-content [data-animate-word]").length,
    ).toBeGreaterThan(0);
  });

  it("colours the line still being typed, not just committed ones", () => {
    // "let b = 2;" has no newline yet, so it comes from the pending branch.
    const document = streamed({ animation: false });
    const text = document.querySelector(".code-content")?.textContent ?? "";

    expect(text).toContain("let b = 2;");

    const keywords = [...document.querySelectorAll(".code-content .hljs-keyword")]
      .map((node) => node.textContent);

    expect(keywords).toContain("let");
  });

  it("carries the hljs class so the block does not restyle when it closes", () => {
    const document = streamed({ animation: false });

    expect(
      document.querySelector(".code-content code")?.className ?? "",
    ).toContain("hljs");
  });

  it("stays plain, and unclassed, for a language nothing can highlight", () => {
    const document = stream("```notalanguage\nconst a = 1;", false);

    expect(document.querySelectorAll(".code-content .hljs-keyword").length).toBe(
      0,
    );
    expect(
      document.querySelector(".code-content code")?.className ?? "",
    ).not.toContain("hljs");
  });

  it("stays plain when a fence declares no language", () => {
    const document = stream("```\nconst a = 1;", false);

    expect(document.querySelectorAll(".code-content .hljs-keyword").length).toBe(
      0,
    );
  });

  it("renders the same code text with highlighting on as without", () => {
    const withPlugin = streamed({ animation: false });
    const without = stream(open, false, { plugins: {} });

    expect(withPlugin.querySelector(".code-content")?.textContent).toBe(
      without.querySelector(".code-content")?.textContent,
    );
  });
});
