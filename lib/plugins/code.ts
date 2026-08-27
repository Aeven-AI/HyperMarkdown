import rehypeHighlight from "rehype-highlight";

import type {
  Element as HastElement,
  Root as HastRoot,
  Text as HastText,
} from "hast";
import type { CodeHighlighterPlugin } from "../plugin-types";

/** The tree rehype-highlight understands: one fenced block, one line of code. */
function lineTree(text: HastText, language: string): HastRoot {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-" + language] },
            children: [text],
          },
        ],
      },
    ],
  };
}

/**
 * rehype-highlight reports an unregistered language through the vfile rather
 * than by throwing, and that is the only thing it asks of the file. Collecting
 * the message is not useful for a single line — the block is simply left
 * plain — so it is swallowed.
 */
const quietFile = { message: () => {} };

/**
 * Syntax highlighting through highlight.js. Requires `rehype-highlight`, and a
 * highlight.js theme stylesheet of your choosing.
 */
export function highlightPlugin(
  options: Record<string, unknown> = {},
): CodeHighlighterPlugin {
  /*
   * The same transformer colours streamed lines and settled blocks, so the
   * options above apply to both and a line cannot change colour when its
   * fence closes. rehype-highlight exports no "highlight this string" entry
   * point, so a line is wrapped in the tree it does understand.
   */
  const transform = rehypeHighlight(options) as (
    tree: HastRoot,
    file: unknown,
  ) => void;

  return {
    type: "code-highlighter",
    name: "highlight.js",
    rehypePlugin: [rehypeHighlight, options],

    highlightLine(code, language) {
      /*
       * Only a declared language is highlighted. rehype-highlight can detect
       * one for a finished block, but detecting per line is worse than
       * leaving it plain: each line is guessed on its own, so the colours
       * shift from line to line as the block arrives.
       */
      if (!language) {
        return null;
      }

      const text: HastText = { type: "text", value: code };
      const tree = lineTree(text, language);

      transform(tree, quietFile);

      const pre = tree.children[0] as HastElement;
      const element = pre.children[0] as HastElement;

      /*
       * Nothing replaced the children, so nothing highlighted them. The `hljs`
       * class is not the test: rehype-highlight adds it before it tries, and
       * leaves it in place when the language turns out to be unregistered.
       */
      if (element.children.length === 1 && element.children[0] === text) {
        return null;
      }

      return { type: "root", children: element.children };
    },
  };
}

export default highlightPlugin;
