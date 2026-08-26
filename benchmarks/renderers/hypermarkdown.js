import { MarkdownStream } from "../vendor/hypermarkdown/hypermarkdown.js";

/**
 * HyperMarkdown keeps the rendered blocks itself and hands back a React
 * element, so a chunk goes straight in through streamMd().
 *
 * Plugins are left empty so every renderer here is doing the same work:
 * markdown to DOM, no maths, no syntax highlighting.
 */
export const hypermarkdown = {
  name: "HyperMarkdown",
  strategy: "sub-block cache (per code line / table row / list item)",

  create() {
    const renderer = new MarkdownStream({
      streaming: true,
      animation: false,
      plugins: {},
    });

    return {
      write: (chunk) => renderer.streamMd(chunk, true, false, false),
      finish: () => renderer.streamMd("", true, false, true),
      element: () => renderer.render(),
    };
  },
};
