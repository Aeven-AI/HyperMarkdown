import { visit } from "unist-util-visit";

import type { Root as HastRoot } from "hast";

import type { ResolvedLinkSafety } from "../sanitize";

/**
 * Keep links and images pointing somewhere the host is willing to send people.
 *
 * Sanitization already removes scripting attributes; this is the separate
 * question of *where* a URL may point. A disallowed link keeps its text and
 * loses its destination rather than disappearing, so nothing silently vanishes
 * from what the reader was sent.
 */
export function rehypeLinkSafety(config: ResolvedLinkSafety) {
  return (tree: HastRoot) => {
    visit(tree, "element", (node) => {
      if (node.tagName === "a") {
        const href = node.properties?.["href"];

        if (typeof href === "string" && !allowed(href, false)) {
          delete node.properties["href"];
        }
      }

      if (node.tagName === "img") {
        const src = node.properties?.["src"];

        if (typeof src === "string" && !allowed(src, true)) {
          delete node.properties["src"];
        }
      }
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
