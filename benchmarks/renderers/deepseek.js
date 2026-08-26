import { createElement, Fragment } from "react";

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeReact from "rehype-react";
import { jsx, jsxs } from "react/jsx-runtime";

import { IncrementalMarkdownParser } from "../vendor/deepseek-incremental.js";

const parse = (text) =>
  fromMarkdown(text, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });

const toReact = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeReact, { jsx, jsxs, Fragment, createElement });

const toSource = { extensions: [gfmToMarkdown()] };

/**
 * The deepseek-harness incremental strategy.
 *
 * IMPORTANT: this is their `incremental.ts`, vendored verbatim, paired with a
 * plain unified pipeline — not their shipped renderer, which needs components
 * and CSS modules from inside their repo. What this measures is how much work
 * their freeze-the-prefix strategy leaves per chunk. Their real renderer walks
 * the mdast directly and would spend less than the round-trip below; read this
 * row as an upper bound on their strategy's cost, not as their product.
 */
export const deepseek = {
  name: "deepseek-harness",
  strategy: "freeze all but the trailing 2 blocks",

  create() {
    const incremental = new IncrementalMarkdownParser(parse);
    const rendered = new Map();

    let text = "";

    return {
      write: (chunk) => {
        text += chunk;
      },
      finish: () => {},
      element: () => {
        const { frozen, tail, generation } = incremental.update(text);

        if (rendered.generation !== generation) {
          rendered.generation = generation;
        }

        const children = [];

        // Frozen blocks are rendered once and kept — the whole point of the
        // strategy. The tail is re-rendered on every chunk.
        for (const block of frozen) {
          let element = rendered.get(block.key);

          if (element === undefined) {
            element = render(block, block.key);
            rendered.set(block.key, element);
          }

          children.push(element);
        }

        for (const block of tail) {
          children.push(render(block, block.key));
        }

        return createElement(Fragment, null, children);
      },
    };
  },
};

function render(block, key) {
  const source = toMarkdown({ type: "root", children: [block.node] }, toSource);
  return createElement(
    Fragment,
    { key },
    toReact.processSync(source).result
  );
}
