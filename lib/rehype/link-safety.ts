import { visit } from "unist-util-visit";

import type { Root as HastRoot } from "hast";

import type { ResolvedLinkSafety } from "../sanitize";

/**
 * Keep links and images pointing somewhere the host is willing to send people.
 *
 * Sanitization already removes scripting attributes; this is the separate
 * question of *where* a URL may point. Nothing silently vanishes from what the
 * reader was sent: a disallowed link keeps its text and loses its destination,
 * and a disallowed image becomes its alt text — an `<img>` stripped of `src`
 * would render as a broken-image placeholder carrying nothing at all.
 */
export function rehypeLinkSafety(config: ResolvedLinkSafety) {
  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "a") {
        const href = node.properties?.["href"];

        if (typeof href === "string" && !allowed(href, false)) {
          delete node.properties["href"];
        }
      }

      if (node.tagName === "img") {
        const src = node.properties?.["src"];
        // A non-string src means sanitization already removed a disallowed
        // scheme upstream of this stage, which is the same verdict.
        const rejected = typeof src === "string" ? !allowed(src, true) : true;

        if (rejected) {
          if (parent === undefined || index === undefined) {
            // No parent to splice into (a root-level image is not something
            // remark produces); dropping the destination is all that is left.
            delete node.properties["src"];
            return;
          }

          const alt = node.properties?.["alt"];

          parent.children.splice(index, 1, {
            type: "text",
            value: typeof alt === "string" ? alt : "",
          });

          return index;
        }
      }

      return undefined;
    });
  };

  function allowed(url: string, isImage: boolean): boolean {
    const trimmed = url.trim();

    if (isImage && config.allowDataImages && /^data:image\//i.test(trimmed)) {
      return true;
    }

    // A scheme-less URL is relative, so it inherits the page's own origin.
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);

    if (scheme) {
      const protocol = scheme[1]!.toLowerCase();

      if (!config.allowedProtocols.includes(protocol)) {
        return false;
      }
    }

    const prefixes = isImage
      ? config.allowedImagePrefixes
      : config.allowedLinkPrefixes;

    if (prefixes.includes("*")) {
      return true;
    }

    return prefixes.some((prefix) => trimmed.startsWith(prefix));
  }
}
