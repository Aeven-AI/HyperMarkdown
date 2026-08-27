import React, { type ReactNode } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";

import type { Root as HastRoot } from "hast";

import { patterns } from "../patterns";
import { listItems, listMarkerFamily } from "../stream/list-structure";

import {
  findListItem,
  type CacheProcessor,
  type CellComponents,
} from "./utils";

/**
 * A list, cached one item at a time.
 *
 * Items are matched by their text, so only the item still being written is
 * re-rendered as chunks arrive. Looseness is a property of the whole list
 * rather than of an item, so a change to it invalidates every item: their
 * contents gain or lose a wrapping paragraph.
 */
export class ListCache {
  /** One rendered `<li>` per key, ready to drop into a `<ul>` or `<ol>`. */
  data: ReactNode[] = [];

  /** The source text of each cached item, in order. */
  itemText: string[] = [];

  /** Marker family and looseness, as one value: a change rebuilds the list. */
  signature: string | null = null;

  reset(): void {
    this.data = [];
    this.itemText = [];
    this.signature = null;
  }

  /** Drop the signature so the next append() rebuilds from scratch. */
  invalidate(): void {
    this.signature = null;
  }

  append(
    md: string,
    processor: CacheProcessor,
    components: CellComponents,
  ): void {
    const items = listItems(md);
    const loose = patterns.listLooseRegex.test(md);

    const signature =
      listMarkerFamily(items[0] ?? "") + (loose ? ":loose" : ":tight");

    if (this.signature !== signature) {
      this.signature = signature;
      this.data = [];
      this.itemText = [];
    }

    // The last item is still being written; everything before it is settled.
    for (let lineIndex = 0; lineIndex < items.length; lineIndex++) {
      const itemBuffer = items[lineIndex] ?? "";

      if (this.itemText[lineIndex] !== itemBuffer) {
        this.itemText[lineIndex] = itemBuffer;
        this.data[lineIndex] = renderItem(
          lineIndex,
          itemBuffer,
          loose,
          processor,
          components,
        );
      }
    }

    this.itemText.length = items.length;
    this.data.length = items.length;
  }
}

function renderItem(
  key: number,
  itemBuffer: string,
  loose: boolean,
  processor: CacheProcessor,
  components: CellComponents,
): ReactNode {
  if (!itemBuffer || itemBuffer.trim() === "") {
    return null;
  }

  let block = itemBuffer;

  // A lone item parses tight. Give a loose list a second item so the parser
  // marks it loose and the contents keep their paragraph.
  if (loose === true) {
    const marker = itemBuffer.match(patterns.listMarkerRegex);
    block = itemBuffer + "\n\n" + (marker ? marker[1] : "-") + " x";
  }

  const hastData = processor.runSync(processor.parse(block));
  const itemNode = findListItem(hastData as HastRoot);

  if (!itemNode) {
    return null;
  }

  return React.cloneElement(
    toJsxRuntime(itemNode, {
      jsx: jsx,
      jsxs: jsxs,
      Fragment: React.Fragment,
      components,
    }),
    { key: key },
  );
}
