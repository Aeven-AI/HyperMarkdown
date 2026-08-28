import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { katexPlugin } from "../../lib/plugins/math";
import Renderer from "../../lib/renderer";

// What a delta shows must not depend on where its boundaries happened to fall.
// The same buffer, delivered whole or a character at a time, has to reach the
// same rendered state.
function streamed(source, size, options = {}) {
  const renderer = new Renderer({ streaming: true, animation: false, ...options });

  for (let index = 0; index < source.length; index += size) {
    renderer.streamMd(source.slice(index, index + size), true, false, false);
  }

  return renderToStaticMarkup(renderer.render());
}

const asText = (markup) => markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

describe("chunking does not change what a delta shows", () => {
  for (const [name, source, options] of [
    ["closed blocks then an open fence", "intro\n\n```\nfirst\n```\n\n```ts\nopen", {}],
    ["closed blocks then an open math fence", "intro\n\n```\nfirst\n```\n\n```math\n\\sqrt{2}", { plugins: { math: katexPlugin() } }],
    ["closed blocks then an open paragraph", "intro\n\n```\nfirst\n```\n\ntrailing prose", {}],
  ]) {
    it(name, () => {
      const whole = asText(streamed(source, source.length, options));

      for (const size of [1, 3, 7, 40]) {
        expect(asText(streamed(source, size, options))).toBe(whole);
      }
    });
  }

  it("keeps an indented code block's chrome however the delta is cut", () => {
    const source = "Intro line:\n\n    def indented():\n        pass\n\nAfter.\n\nend";

    for (const size of [1, 5, 13, source.length]) {
      expect(streamed(source, size)).toContain("codeblock-wrapper");
    }
  });
});
