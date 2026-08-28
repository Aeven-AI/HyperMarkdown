import { visitParents } from "unist-util-visit-parents";

import type { Element, Root as HastRoot } from "hast";

/**
 * Tell a host's `code` component what kind of code it is rendering.
 *
 * One `<code>` element carries three different things: inline code, a fence
 * with a language, and a fence without one. The first and the third are
 * indistinguishable from the element alone — neither has a class — so a host
 * that treats inline code specially (linking a URL, resolving a file mention)
 * has to guess, and guesses wrong on a language-less fence.
 *
 * Ancestry answers it. `inline` is true for a `<code>` whose parent is not
 * `<pre>`; `insideLink` is true when an `<a>` encloses it, which is what keeps
 * a host from putting a button inside an anchor.
 *
 * Only added when the host actually replaced `code`: on the built-in element
 * these would render as stray DOM attributes.
 * @returns The rehype transform.
 */
export function rehypeCodeContext() {
  return (tree: HastRoot) => {
    visitParents(tree, "element", (node, ancestors) => {
      const element = node as Element;

      if (element.tagName !== "code") {
        return;
      }

      const parent = ancestors.at(-1);
      const inPre =
        parent !== undefined &&
        parent.type === "element" &&
        (parent as Element).tagName === "pre";

      element.properties = {
        ...element.properties,
        inline: !inPre,
        insideLink: ancestors.some(
          (ancestor) =>
            ancestor.type === "element" && (ancestor as Element).tagName === "a",
        ),
      };
    });
  };
}
