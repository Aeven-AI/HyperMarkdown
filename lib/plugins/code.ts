import rehypeHighlight from "rehype-highlight";

import type { CodeHighlighterPlugin } from "../plugin-types";

/**
 * Syntax highlighting through highlight.js. Requires `rehype-highlight`, and a
 * highlight.js theme stylesheet of your choosing.
 */
export function highlightPlugin(
  options: Record<string, unknown> = {},
): CodeHighlighterPlugin {
  return {
    type: "code-highlighter",
    name: "highlight.js",
    rehypePlugin: [rehypeHighlight, options],
  };
}

export default highlightPlugin;
