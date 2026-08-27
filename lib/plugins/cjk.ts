import remarkCjkFriendly from "remark-cjk-friendly";

import type { CjkPlugin } from "../plugin-types";

/**
 * CJK-friendly emphasis, through remark-cjk-friendly. Requires that package.
 *
 * CommonMark's flanking rules were written for scripts that separate words
 * with spaces. `**日本語（説明）**続き` leaves the closing `**` sitting between
 * a full-width bracket and a letter, which fails the right-flanking test, so
 * stock remark renders the asterisks literally. This restores the reading a
 * CJK author expects.
 */
export function cjkPlugin(): CjkPlugin {
  return {
    type: "cjk",
    name: "remark-cjk-friendly",
    // Must run before remark-gfm: it changes how emphasis is tokenised, and
    // gfm's strikethrough builds on the same delimiter machinery.
    remarkPluginsBefore: [remarkCjkFriendly],
  };
}

export default cjkPlugin;
