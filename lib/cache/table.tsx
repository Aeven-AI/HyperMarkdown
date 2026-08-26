import React, { type ReactNode } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";

import type { Root as HastRoot } from "hast";

import {
  findSectionRow,
  type CacheProcessor,
  type CellComponents,
} from "./utils";

/**
 * A table, cached one row at a time.
 *
 * Unlike a code fence the buffer is not append-only: processInlineSyntax()
 * rewrites its tail on every chunk (math placeholders, token balancing), so
 * rows are matched by their text rather than by a consumed-length offset.
 * Splitting the whole body every chunk is what made a long table quadratic, so
 * the committed region is compared first and only what is new gets split.
 */
export class TableCache {
  /** One rendered `<tr>` per key, ready to drop into a `<tbody>`. */
  data: ReactNode[] = [];

  /** The rendered header row, or null while the table has no usable header. */
  head: ReactNode = null;

  private signature: string | null = null;
  private rowText: string[] = [];
  private committedText = "";

  reset(): void {
    this.data = [];
    this.head = null;
    this.signature = null;
    this.rowText = [];
    this.committedText = "";
  }

  append(
    md: string,
    processor: CacheProcessor,
    components: CellComponents,
  ): void {
    const separator = /\r\n?|\n/;

    const headIndex = md.indexOf("\n");

    if (headIndex === -1) {
      return;
    }

    const delimiterIndex = md.indexOf("\n", headIndex + 1);

    if (delimiterIndex === -1) {
      return;
    }

    const signature = md.substring(0, delimiterIndex);

    // A headless table synthesises its header from the widest row so far, so a
    // wider row arriving later rewrites it. Rebuild from scratch then.
    if (this.signature !== signature) {
      this.signature = signature;
      this.head = this.renderHead(processor, components);

      this.data = [];
      this.rowText = [];
      this.committedText = "";
    }

    if (!this.head) {
      return;
    }

    const bodyStart = delimiterIndex + 1;
    let tailStart = md.lastIndexOf("\n") + 1;

    if (tailStart < bodyStart) {
      tailStart = bodyStart;
    }

    const committedText = md.substring(bodyStart, tailStart);

    if (committedText !== this.committedText) {
      let bodyLines: string[];
      let lineIndex: number;

      if (
        this.committedText !== "" &&
        committedText.startsWith(this.committedText) === true
      ) {
        bodyLines = committedText
          .substring(this.committedText.length)
          .split(separator);

        bodyLines.pop();
        lineIndex = this.rowText.length;
      } else {
        bodyLines = committedText.split(separator);

        bodyLines.pop();
        lineIndex = 0;

        this.rowText.length = 0;
        this.data.length = 0;
      }

      bodyLines.forEach((row) => {
        if (this.rowText[lineIndex] !== row) {
          this.rowText[lineIndex] = row;
          this.data[lineIndex] = this.renderRow(
            lineIndex,
            row,
            processor,
            components,
          );
        }

        lineIndex++;
      });

      this.rowText.length = lineIndex;
      this.data.length = lineIndex;
      this.committedText = committedText;
    }

    // The last line has no newline yet, so it is still being written and is
    // re-rendered on every chunk instead of being cached.
    const committedCount = this.rowText.length;
    const tail = md.substring(tailStart);

    if (tail && tail.trim() !== "") {
      this.data[committedCount] = this.renderRow(
        committedCount,
        tail,
        processor,
        components,
      );
    }
  }

  private renderHead(
    processor: CacheProcessor,
    components: CellComponents,
  ): ReactNode {
    const hastData = processor.runSync(processor.parse(this.signature + "\n"));
    const rowNode = findSectionRow(hastData as HastRoot, "thead");

    if (!rowNode) {
      return null;
    }

    return toJsxRuntime(rowNode, {
      jsx: jsx,
      jsxs: jsxs,
      Fragment: React.Fragment,
      components,
    });
  }

  private renderRow(
    key: number,
    rowBuffer: string,
    processor: CacheProcessor,
    components: CellComponents,
  ): ReactNode {
    if (!rowBuffer || rowBuffer.trim() === "") {
      return null;
    }

    const tableBlock = this.signature + "\n" + rowBuffer + "\n";
    const hastData = processor.runSync(processor.parse(tableBlock));
    const rowNode = findSectionRow(hastData as HastRoot, "tbody");

    if (!rowNode) {
      return null;
    }

    // toJsxRuntime has no key option, so the row lands in <tbody> unkeyed.
    return React.cloneElement(
      toJsxRuntime(rowNode, {
        jsx: jsx,
        jsxs: jsxs,
        Fragment: React.Fragment,
        components,
      }),
      { key: key },
    );
  }
}
