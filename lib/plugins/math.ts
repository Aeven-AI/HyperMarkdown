import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import type { MathPlugin } from "../plugin-types";

/**
 * Maths through KaTeX. Requires `katex`, `remark-math` and `rehype-katex`, and
 * KaTeX's own stylesheet — import `katex/dist/katex.min.css` yourself.
 */
export function katexPlugin(options: Record<string, unknown> = {}): MathPlugin {
  return {
    type: "math",
    name: "katex",
    remarkPlugin: remarkMath,
    rehypePlugin: [rehypeKatex, options],
  };
}

export default katexPlugin;
