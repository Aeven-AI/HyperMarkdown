import { patterns } from "../patterns";

import type { BlockType } from "../types";

export function detectBlockType(
  mdBuffer: string,
  finalize: boolean,
): BlockType {
  let blockType: BlockType | undefined;
  let trimmed;
  let hrPending;
  let lineBreakStart;
  let lineBreakPending;
  let codeBlockPending;
  let tableBlockPending;

  if (!mdBuffer || mdBuffer === "") {
    return "text";
  }

  hrPending = hrPendingCheck(mdBuffer);
  if (hrPending) {
    blockType = hrPending;
  }

  if (!blockType) {
    lineBreakStart = lineBreakStartCheck(mdBuffer);
    if (lineBreakStart) {
      blockType = lineBreakStart;
    }
  }

  if (!blockType) {
    lineBreakPending = lineBreakPendingCheck(mdBuffer);
    if (lineBreakPending) {
      blockType = lineBreakPending;
    }
  }

  if (!blockType) {
    codeBlockPending = codeBlockPendingCheck(mdBuffer);
    if (codeBlockPending) {
      blockType = codeBlockPending;
    }
  }

  if (!blockType) {
    tableBlockPending = tableBlockPendingCheck(mdBuffer);
    if (tableBlockPending) {
      blockType = tableBlockPending;
    }
  }

  if (!blockType) {
    blockType = "text";
  }

  if (blockType !== "pending") {
    return blockType;
  }

  trimmed = mdBuffer.trimEnd();

  if (
    patterns.inlineLinkCloseRegex &&
    patterns.inlineLinkCloseRegex.test(trimmed)
  ) {
    return "text";
  }

  // A table row need not end in a pipe, so a buffer held pending only by its
  // trailing newline still has to resolve to a table rather than a paragraph.
  if (tableBlockPendingCheck(trimmed) === "table") {
    return "table";
  }

  if (finalize === true) {
    return "text";
  }

  return blockType;

  function hrPendingCheck(mdBuffer: string): BlockType | undefined {
    const hrRegex = patterns.hrRegex;

    if (hrRegex.test(mdBuffer)) {
      return "pending";
    }

    return undefined;
  }

  function lineBreakStartCheck(mdBuffer: string): BlockType | undefined {
    if (mdBuffer.startsWith("\n")) {
      return "text";
    }

    return undefined;
  }

  function lineBreakPendingCheck(mdBuffer: string): BlockType | undefined {
    if (mdBuffer.endsWith("\n")) {
      if (
        mdBuffer.trimStart().startsWith("```") ||
        mdBuffer.trimStart().startsWith("~~~")
      ) {
        return "code";
      }

      if (
        mdBuffer.endsWith("|\n") !== true &&
        mdBuffer.endsWith("|\n\n") !== true
      ) {
        return "pending";
      }
    }

    return undefined;
  }

  function codeBlockPendingCheck(mdBuffer: string): BlockType | undefined {
    const incompleteFenceRegex = patterns.incompleteFenceRegex;
    if (incompleteFenceRegex.test(mdBuffer)) {
      return "pending";
    }

    const fencedCodeRegex = patterns.fencedCodeRegex;
    if (fencedCodeRegex.test(mdBuffer)) {
      return "code";
    }

    const indentedCodeRegex = patterns.indentedCodeRegex;
    if (indentedCodeRegex.test(mdBuffer)) {
      return "code";
    }

    return undefined;
  }

  function tableBlockPendingCheck(mdBuffer: string): BlockType | undefined {
    const pipeMatches = mdBuffer.match(patterns.pipeRegex);
    const pipeCount = pipeMatches ? pipeMatches.length : 0;

    if (pipeCount >= 2) {
      return "table";
    } else if (pipeCount === 1) {
      return "pending";
    }

    return undefined;
  }
}
