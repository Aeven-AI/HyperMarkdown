import { patterns } from "../patterns";

import type { BlockBoundary, BlockType } from "../types";

/**
 * Where one block of streamed markdown ends and the next begins.
 *
 * The answer comes from the buffer alone, so a block can be re-examined as
 * often as the stream needs. The one exception is the footnote bookkeeping,
 * because a definition can arrive long after the block that refers to it.
 */

interface CodeRegexConfig {
  fencedCodeRegex: RegExp;
  indentedCodeRegex: RegExp;
}

export interface FootnoteRefs {
  footnotes: Map<string, string>;
  mdExtra: Map<string, string>;
}

/**
 * Where one block of streamed markdown ends and the next begins.
 *
 * Everything here works on the buffer alone: given the same text it gives the
 * same answer, so a block can be re-examined as often as the stream needs.
 * The one exception is the footnote bookkeeping findBlockBoundary() is handed,
 * because a definition can arrive long after the block that refers to it.
 */

/**
 * Where the fenced region containing `index` begins, or -1 when `index` is not
 * inside one.
 *
 * A fence closes only on a marker of the same character that is at least as
 * long as the one that opened it, which is what lets a ````markdown block hold
 * a ```js block inside it. A region that never closes runs to the end of the
 * buffer, so a still-open fence counts as containing everything after it.
 * @param mdBuffer - the buffer being examined.
 * @param index - offset of a candidate block boundary.
 * @returns offset where the containing region's opening marker starts, or -1.
 */
function fenceStartCovering(mdBuffer: string, index: number): number {
  let offset = 0;
  let openIndex = -1;
  let openChar = "";
  let openLength = 0;

  for (const line of mdBuffer.split("\n")) {
    const fence = /^[ \t]*(?:`{3,}|~{3,})/.exec(line);
    const lineEnd = offset + line.length + 1;

    if (fence) {
      const marker = fence[0].trim();
      const char = marker.charAt(0);

      if (openIndex === -1) {
        openIndex = offset;
        openChar = char;
        openLength = marker.length;
      } else if (char === openChar && marker.length >= openLength) {
        // The boundary sits between this region's markers, so it is content.
        if (index > openIndex && index < lineEnd) {
          return openIndex;
        }

        openIndex = -1;
        openChar = "";
        openLength = 0;
      }
    }

    offset = lineEnd;
  }

  // An unclosed region runs to the end of the buffer.
  return openIndex !== -1 && index > openIndex ? openIndex : -1;
}

export function findBlockBoundary(
  mdBuffer: string,
  blockType: BlockType,
  refs: FootnoteRefs,
): BlockBoundary {
  let refClose;
  let lineClose;
  let hrRuleClose;
  let codeBlockClose;
  let doubleLineClose;

  const doubleLine = "\n\n";

  const hrRegex = patterns.hrCloseRegex;
  const fencedCodeRegex = patterns.fencedCloseRegex;
  const indentedCodeRegex = patterns.indentedCodeRegex;

  // Blank lines, rules and fences inside reasoning are its own content, so the
  // only thing that ends the block is the closing tag.
  if (blockType === "reasoning") {
    const closing = patterns.reasoningCloseRegex.exec(mdBuffer);

    if (!closing) {
      return { close: false, md: mdBuffer, mdClose: "", mdNext: "" };
    }

    const end = closing.index + closing[0].length;

    return {
      close: true,
      md: mdBuffer.slice(0, end),
      mdClose: closing[0],
      mdNext: mdBuffer.slice(end).replace(/^\r?\n/, ""),
    };
  }

  if (blockType === "text") {
    mdBuffer = mapNotes(mdBuffer);

    // Blank lines, rules and headings separate prose and are content inside a
    // fence. A boundary taken from within one consumes the opening marker into
    // the text block, which leaves the closing marker to be read as an opener
    // and renders the rest of the document as code.
    const beforeFence = <T extends BlockBoundary | undefined | null>(close: T): T | BlockBoundary => {
      if (close === undefined || close === null || close.close !== true) {
        return close;
      }

      const fenceAt = fenceStartCovering(mdBuffer, close.md.length);

      if (fenceAt === -1) {
        return close;
      }

      // The fence opens this buffer, so there is no prose to close first: the
      // whole buffer belongs to the block the fence starts.
      if (fenceAt === 0) {
        return { close: false, md: mdBuffer, mdClose: "", mdNext: "" };
      }

      return {
        close: true,
        md: mdBuffer.substring(0, fenceAt),
        mdClose: "",
        mdNext: mdBuffer.substring(fenceAt),
      };
    };

    refClose = beforeFence(getRefClose(mdBuffer));
    if (refClose) {
      return refClose;
    }

    lineClose = beforeFence(getLineClose(mdBuffer, blockType));
    if (lineClose) {
      return lineClose;
    }

    hrRuleClose = beforeFence(getHrRuleClose(mdBuffer, blockType, hrRegex));
    if (hrRuleClose) {
      return hrRuleClose;
    }

    doubleLineClose = beforeFence(getDoubleLineClose(mdBuffer, blockType, doubleLine));
    if (doubleLineClose) {
      return doubleLineClose;
    }

    codeBlockClose = getCodeBlockClose(mdBuffer, blockType, {
      fencedCodeRegex,
      indentedCodeRegex,
    });
    return beforeFence(codeBlockClose);
  }

  if (blockType === "code") {
    codeBlockClose = getCodeBlockClose(mdBuffer, blockType, {
      fencedCodeRegex,
      indentedCodeRegex,
    });

    if (codeBlockClose) {
      return codeBlockClose;
    }

    return {
      close: false,
      md: mdBuffer,
      mdClose: "",
      mdNext: "",
    };
  }

  if (blockType === "table") {
    mdBuffer = mapNotes(mdBuffer);
    doubleLineClose = getDoubleLineClose(mdBuffer, blockType, doubleLine);
    if (doubleLineClose) {
      return doubleLineClose;
    }

    return {
      close: false,
      md: mdBuffer,
      mdClose: "",
      mdNext: "",
    };
  }

  return {
    close: false,
    md: mdBuffer,
    mdClose: "",
    mdNext: "",
  };

  function mapNotes(mdBuffer: string): string {
    let id;
    let seen: Record<string, true>;

    let match;
    let matches;

    let definition;

    matches = mdBuffer.match(patterns.footnoteRegex);
    if (!matches) {
      return mdBuffer;
    } else {
      seen = {};
      for (match of matches) {
        if (!seen[match]) {
          seen[match] = true;
          if (!refs.footnotes.has(match)) {
            id = match.substring(2, match.length - 1);
            definition = `${match}: ${id}`;
            refs.mdExtra.set(match, definition);
          }
        }
      }

      return mdBuffer;
    }
  }

  function getRefClose(mdBuffer: string): BlockBoundary | undefined {
    const usageMatch = mdBuffer.match(patterns.refRegex);
    const definitionMatch = mdBuffer.match(patterns.definitionRegex);

    const hasUsage = Array.isArray(usageMatch) && usageMatch.length > 0;
    const hasDefinition =
      Array.isArray(definitionMatch) && definitionMatch.length > 0;

    if (hasUsage === true && hasDefinition !== true) {
      return {
        close: false,
        md: mdBuffer,
        mdClose: "",
        mdNext: "",
      };
    }

    return undefined;
  }

  function getLineClose(
    mdBuffer: string,
    _blockType: BlockType,
  ): BlockBoundary | undefined {
    let closeIndex;

    const singleLine = "\n";
    const doubleLine = "\n\n";

    if (mdBuffer.startsWith(singleLine)) {
      // if the next character is not is a hr character [-_*]
      if (mdBuffer[2] !== "-" && mdBuffer[2] !== "_" && mdBuffer[2] !== "*") {
        if (mdBuffer.startsWith(doubleLine) !== true) {
          return {
            close: true,
            md: mdBuffer.substring(0, singleLine.length),
            mdNext: mdBuffer.substring(singleLine.length),
            mdClose: singleLine,
          };
        }
      }
    } else {
      closeIndex = mdBuffer.indexOf(singleLine);
      if (closeIndex !== -1) {
        // A new bullet used to close the block here, which rendered every
        // item of a tight list as its own <ul>. The list stays in one block
        // now; its settled items are cached so that costs nothing.
      }
    }

    return undefined;
  }

  function getHrRuleClose(
    mdBuffer: string,
    _blockType: BlockType,
    hrRegex: RegExp,
  ): BlockBoundary | null {
    const match = mdBuffer.match(hrRegex);
    if (match) {
      const hrString = match[0];
      const startIndex = match.index ?? 0;
      const endIndex = startIndex + hrString.length;

      return {
        close: true,
        md: mdBuffer.substring(0, endIndex),
        mdNext: mdBuffer.substring(endIndex),
        mdClose: hrString,
      };
    }
    return null;
  }

  function getDoubleLineClose(
    mdBuffer: string,
    _blockType: BlockType,
    doubleLine: string,
  ): BlockBoundary | undefined {
    let closeTag;
    let closeIndex;
    let closeEndIndex;

    // A blank line does not end a loose list, so the block has to stay open
    // across it — for ordered markers as much as for bullets. It must still
    // end where the list does, though: holding it open unconditionally makes
    // one block swallow the rest of the document.
    if (patterns.listItemRegex.test(mdBuffer) === true) {
      closeIndex = mdBuffer.indexOf(doubleLine);

      while (closeIndex !== -1) {
        closeEndIndex = closeIndex + doubleLine.length;

        if (listContinues(mdBuffer.substring(closeEndIndex)) !== true) {
          return {
            close: true,
            md: mdBuffer.substring(0, closeEndIndex),
            mdNext: mdBuffer.substring(closeEndIndex),
            mdClose: doubleLine,
          };
        }

        closeIndex = mdBuffer.indexOf(doubleLine, closeIndex + 1);
      }

      // No blank line ends this list, but something else still might — a
      // fence opening on the next line, say. Fall through rather than
      // declaring the block open, or that check never runs.
      return undefined;
    }

    closeTag = doubleLine;
    closeIndex = mdBuffer.lastIndexOf(closeTag);
    closeEndIndex = closeIndex + closeTag.length;
    if (closeIndex !== -1) {
      // An indented block after a definition is that definition's second
      // paragraph, not a code block, so the two must stay together.
      if (definitionContinues(mdBuffer, closeIndex, closeEndIndex) === true) {
        return {
          close: false,
          md: mdBuffer,
          mdClose: "",
          mdNext: "",
        };
      }

      return {
        close: true,
        md: mdBuffer.substring(0, closeEndIndex),
        mdNext: mdBuffer.substring(closeEndIndex),
        mdClose: closeTag,
      };
    }

    return undefined;
  }

  function definitionContinues(
    mdBuffer: string,
    closeIndex: number,
    closeEndIndex: number,
  ): boolean {
    let rest;
    let lineStart;
    let lastLine;

    rest = mdBuffer.substring(closeEndIndex);

    // Whitespace alone is undecided: the indent may still be arriving.
    if (
      patterns.indentedRegex.test(rest) !== true &&
      patterns.blankOnlyRegex.test(rest) !== true
    ) {
      return false;
    }

    lineStart = mdBuffer.lastIndexOf("\n", closeIndex - 1);
    lastLine = mdBuffer.substring(lineStart + 1, closeIndex);

    return patterns.definitionLineRegex.test(lastLine);
  }

  // After a blank line a list carries on only if what follows is another
  // item or an indented continuation. A marker that is still arriving counts
  // as carrying on, so the list is never cut in half mid-bullet.
  function listContinues(rest: string): boolean {
    if (rest === "") {
      return true;
    }

    if (patterns.listPartialRegex.test(rest)) {
      return true;
    }

    // A fenced block indented under an item opens its own block, the way it
    // did before lists were held open across blank lines. Swallowing it here
    // leaves the fence sitting inside a paragraph.
    if (patterns.indentedFenceRegex.test(rest) === true) {
      return false;
    }

    return (
      patterns.listItemRegex.test(rest) || patterns.listIndentRegex.test(rest)
    );
  }

  function getCodeBlockClose(
    mdBuffer: string,
    blockType: "text",
    codeRegexConfig: CodeRegexConfig,
  ): BlockBoundary;
  function getCodeBlockClose(
    mdBuffer: string,
    blockType: "code",
    codeRegexConfig: CodeRegexConfig,
  ): BlockBoundary | undefined;
  function getCodeBlockClose(
    mdBuffer: string,
    blockType: "text" | "code",
    codeRegexConfig: CodeRegexConfig,
  ): BlockBoundary | undefined {
    let match;
    let ended;

    let matchIndex;
    let matchCount;
    let matchStart;
    let matchFinal;

    const fencedCodeRegex = codeRegexConfig.fencedCodeRegex;
    const indentedCodeRegex = codeRegexConfig.indentedCodeRegex;

    if (blockType === "text") {
      const interruptionMatch = mdBuffer.match(patterns.interuptRegex);

      if (interruptionMatch) {
        const mdCloseEndIndex = (interruptionMatch.index ?? 0) + 1; // End at \n
        return {
          close: true,
          md: mdBuffer.substring(0, mdCloseEndIndex),
          mdNext: mdBuffer.substring(mdCloseEndIndex),
          mdClose: "\n",
        };
      }

      match = mdBuffer.match(indentedCodeRegex);
      if (match) {
        matchStart = match.index ?? 0;
        matchFinal = matchStart + match[0].length;
        return {
          close: true,
          md: mdBuffer.substring(0, matchFinal),
          mdNext: mdBuffer.substring(matchFinal),
          mdClose: mdBuffer.substring(matchStart, matchFinal),
        };
      }

      return {
        close: false,
        md: mdBuffer,
        mdClose: "",
        mdNext: "",
      };
    }

    // The text case returned above, and this helper is only called for text or
    // code blocks, so the remaining path is necessarily code.
    match = mdBuffer.match(fencedCodeRegex);
    if (match) {
      matchCount = match.length;
      if (matchCount === 1) {
        return {
          close: false,
          md: mdBuffer,
          mdClose: "",
          mdNext: "",
        };
      } else {
        matchStart = match.index ?? 0;
        matchFinal = matchStart + match[0].length;

        const remainder = mdBuffer.substring(matchFinal);

        if (remainder.startsWith("\n")) {
          const mdCloseEndIndex = matchFinal + 1;
          return {
            close: true,
            md: mdBuffer.substring(0, mdCloseEndIndex),
            mdNext: mdBuffer.substring(mdCloseEndIndex),
            mdClose: "\n",
          };
        }

        return {
          close: false,
          md: mdBuffer,
          mdClose: "",
          mdNext: "",
        };
      }
    }

    match = mdBuffer.match(indentedCodeRegex);
    if (match) {
      matchIndex = mdBuffer.indexOf(doubleLine);
      if (matchIndex !== -1) {
        return {
          close: true,
          md: mdBuffer.substring(0, matchIndex),
          mdNext: mdBuffer.substring(matchIndex),
          mdClose: mdBuffer.substring(matchIndex),
        };
      }

      ended = indentedCodeBlockEnd(mdBuffer);
      if (ended.close) {
        return {
          close: true,
          md: ended.md,
          mdClose: ended.mdClose,
          mdNext: ended.mdNext,
        };
      }
    }

    return undefined;
  }

  function indentedCodeBlockEnd(mdBuffer: string): BlockBoundary {
    const lines = mdBuffer.split("\n");
    let blockLineCount = 0;

    for (const line of lines) {
      const isBlank = patterns.blankRegex.test(line);
      const isIndented = patterns.indentedRegex.test(line);

      if (isBlank || isIndented) {
        blockLineCount++;
      } else {
        break;
      }
    }

    if (blockLineCount === lines.length) {
      return {
        close: false,
        md: mdBuffer,
        mdClose: "",
        mdNext: "",
      };
    }

    const blockContent = lines.slice(0, blockLineCount).join("\n");
    const mdCloseEndIndex = blockContent.length;

    return {
      close: true,
      md: mdBuffer.substring(0, mdCloseEndIndex),

      mdClose: "\n",
      mdNext: mdBuffer.substring(mdCloseEndIndex),
    };
  }
}

/** One piece of a document: either reasoning, or everything between it. */
export interface DocumentPart {
  md: string;
  reasoning: boolean;
}

/** The tags a model wraps its reasoning in, longest form checked on its own. */
const reasoningTags = ["think", "thinking", "reasoning"];

interface TagSpan {
  start: number;
  end: number;
}

/** Where a reasoning tag's name ends, or -1 if no name sits at `at`. */
function reasoningTagName(md: string, at: number, closing: boolean): number {
  for (const name of reasoningTags) {
    const end = at + name.length;

    if (md.slice(at, end).toLowerCase() !== name) {
      continue;
    }

    const after = md.charAt(end);

    // "think" must not swallow the start of "thinking": the name only ends
    // here if the tag does too, or if attributes follow it.
    if (after === ">" || (closing ? after === " " || after === "\t" : /\s/.test(after))) {
      return end;
    }
  }

  return -1;
}

/**
 * Find the next reasoning tag at or after `from`.
 *
 * The patterns this replaces ended in "(?:\\s[^>]*)?>", which reads ahead to
 * the first ">" — so a buffer of half-written "<think " openers and no ">" at
 * all had every one of them scan the whole remaining buffer. The ">" is found
 * once here and only ever moves forward, and its absence ends the search
 * outright, since nothing after it could close a tag either.
 */
function findReasoningTag(
  md: string,
  from: number,
  closing: boolean,
): TagSpan | null {
  let gt = md.indexOf(">", from);

  for (
    let start = md.indexOf("<", from);
    start !== -1;
    start = md.indexOf("<", start + 1)
  ) {
    if (gt !== -1 && gt < start) {
      gt = md.indexOf(">", start);
    }

    if (gt === -1) {
      return null;
    }

    let cursor = start + 1;

    if (closing) {
      if (md.charAt(cursor) !== "/") {
        continue;
      }

      cursor++;
    }

    const nameEnd = reasoningTagName(md, cursor, closing);

    if (nameEnd === -1) {
      continue;
    }

    if (md.charAt(nameEnd) === ">") {
      return { start, end: nameEnd + 1 };
    }

    if (!closing) {
      return { start, end: gt + 1 };
    }

    // A closing tag allows only spaces and tabs before its ">".
    let padded = nameEnd;

    while (md.charAt(padded) === " " || md.charAt(padded) === "\t") {
      padded++;
    }

    if (md.charAt(padded) === ">") {
      return { start, end: padded + 1 };
    }
  }

  return null;
}

/**
 * Split a finished document on its reasoning blocks.
 *
 * The streaming path gets this for free from block detection; a document
 * handed over whole has to be cut up the same way so both render alike.
 */
export function splitReasoning(md: string): DocumentPart[] {
  const parts: DocumentPart[] = [];

  let pointer = 0;

  for (;;) {
    const open = findReasoningTag(md, pointer, false);

    if (!open) {
      break;
    }

    const closing = findReasoningTag(md, open.end, true);

    if (!closing) {
      break;
    }

    const before = md.slice(pointer, open.start);

    if (before.trim() !== "") {
      parts.push({ md: before, reasoning: false });
    }

    parts.push({ md: md.slice(open.end, closing.start), reasoning: true });
    pointer = closing.end;
  }

  const rest = md.slice(pointer);

  if (rest.trim() !== "") {
    parts.push({ md: rest, reasoning: false });
  }

  return parts.length > 0 ? parts : [{ md, reasoning: false }];
}
