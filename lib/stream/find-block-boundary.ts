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

  if (blockType === "text") {
    mdBuffer = mapNotes(mdBuffer, blockType);

    refClose = getRefClose(mdBuffer, blockType);
    if (refClose) {
      return refClose;
    }

    lineClose = getLineClose(mdBuffer, blockType);
    if (lineClose) {
      return lineClose;
    }

    hrRuleClose = getHrRuleClose(mdBuffer, blockType, hrRegex);
    if (hrRuleClose) {
      return hrRuleClose;
    }

    doubleLineClose = getDoubleLineClose(mdBuffer, blockType, doubleLine);
    if (doubleLineClose) {
      return doubleLineClose;
    }

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
    mdBuffer = mapNotes(mdBuffer, blockType);
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

  function mapNotes(mdBuffer: string, blockType: BlockType): string {
    let id;
    let seen: Record<string, true>;

    let match;
    let matches;

    let definition;

    if (blockType === "code") {
      return mdBuffer;
    } else {
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
  }

  function getRefClose(
    mdBuffer: string,
    blockType: BlockType,
  ): BlockBoundary | undefined | null {
    if (blockType === "code") {
      return null;
    } else {
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
        if (mdBuffer[closeIndex + 2] === singleLine) {
          if (
            mdBuffer[closeIndex + singleLine.length + 1] === "-" ||
            mdBuffer[closeIndex + singleLine.length + 1] === "_" ||
            mdBuffer[closeIndex + singleLine.length + 1] === "*"
          ) {
            return {
              close: true,
              md: mdBuffer.substring(0, closeIndex + 1),
              mdNext: mdBuffer.substring(closeIndex + 1),
              mdClose: singleLine,
            };
          }
        }

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
    blockType: BlockType,
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

    if (blockType === "code") {
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

          if (remainder.startsWith("\n\n")) {
            const mdCloseEndIndex = matchFinal + 2;
            return {
              close: true,
              md: mdBuffer.substring(0, mdCloseEndIndex),
              mdNext: mdBuffer.substring(mdCloseEndIndex),
              mdClose: "\n\n",
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
        matchCount = match.length;
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
