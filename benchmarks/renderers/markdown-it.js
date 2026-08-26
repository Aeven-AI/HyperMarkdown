import { createElement } from "react";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, linkify: true, typographer: false });

/**
 * The floor for "how fast could this possibly be": parse to an HTML string and
 * hand it to the DOM, with no React elements in between.
 *
 * It is a baseline, not an alternative. Every frame replaces the whole
 * subtree via innerHTML, so nothing in the document keeps identity, state or
 * an event handler — no copy buttons, no fullscreen, no diagram components,
 * no per-row reconciliation. It also does no sanitisation here (`html: true`
 * passes raw HTML straight through), which the component renderers all do.
 *
 * Read its numbers as "parsing markdown is cheap; the cost is being a
 * component tree", not as a renderer you could swap in.
 */
export const markdownIt = {
  name: "markdown-it",
  strategy: "baseline — parse to HTML string, innerHTML, no components",

  create() {
    let text = "";

    return {
      write: (chunk) => {
        text += chunk;
      },
      finish: () => {},
      element: () =>
        createElement("div", {
          dangerouslySetInnerHTML: { __html: md.render(text) },
        }),
    };
  },
};
