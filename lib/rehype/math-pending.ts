import { visit } from "unist-util-visit";

import type { Element, Root as HastRoot, Text } from "hast";
import { patterns } from "../patterns";

/**
 * Turn the withheld-maths marker into the element hosts style.
 *
 * A half-arrived formula is held back rather than rendered, and something has
 * to stand where it will appear. That placeholder is renderer chrome, not
 * author content, so it is built here — after sanitization, as a node — rather
 * than spliced into the markdown as HTML. Spliced markup only becomes an
 * element where raw HTML is parsed, and a host rendering untrusted output sets
 * `html: "literal"` precisely so that it is not: the marker would then reach
 * the reader as the characters `<span class="math-pending"></span>`.
 *
 * The marker travels as a Private Use Area code point, which survives every
 * HTML mode because it is ordinary text the whole way here.
 */
export function rehypeMathPending() {
  return (tree: HastRoot) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (
        parent === undefined ||
        index === undefined ||
        !node.value.includes(patterns.mathPendingMarker)
      ) {
        return;
      }

      const parts = node.value.split(patterns.mathPendingMarker);
      const replacement: (Element | Text)[] = [];

      parts.forEach((part, at) => {
        if (part !== "") {
          replacement.push({ type: "text", value: part });
        }

        // One placeholder between each pair of parts, none after the last.
        if (at < parts.length - 1) {
          replacement.push({
            type: "element",
            tagName: "span",
            properties: { className: ["math-pending"] },
            children: [],
          });
        }
      });

      parent.children.splice(index, 1, ...replacement);

      return index + replacement.length;
    });
  };
}
