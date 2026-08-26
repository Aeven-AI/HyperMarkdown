import { fixTasklist } from "./task-lists";
import { fixPartialEntity } from "./entities";
import { fixTrailingEscape } from "./escapes";
import { fixPartialMarker } from "./list-markers";
import { fixSetext } from "./setext";
import { fixLinkRefs } from "./links";
import { fixMath } from "./math";
import { fixInlineTokens, createInlineCaches } from "./inline-tokens";
import { fixPartialRow, fixTempTable, repairTableSyntax } from "./tables";

import type { InlineCaches } from "./inline-tokens";
import type { BlockType } from "../types";

/**
 * Repairing the inline syntax of a block that is still arriving.
 *
 * A chunk can cut a document anywhere: mid-emphasis, mid-link, mid-entity,
 * mid-formula. Rendering that as-is flashes raw markup at the reader, so the
 * text is either completed — a faux closing token is added, then dropped once
 * the real one lands — or withheld until it can be shown styled.
 */
export function processInlineSyntax(
  mdBuffer: string,
  blockType: BlockType,
  pending: boolean,
  // Omitting the caches costs a few rebuilt patterns, nothing more.
  caches: InlineCaches = createInlineCaches(),
): string {
  let baseBuffer;
  let processedBuffer;

  if (blockType === "code") {
    return mdBuffer;
  } else {
    processedBuffer = mdBuffer;

    processedBuffer = fixTasklist(processedBuffer);
    processedBuffer = fixPartialEntity(processedBuffer, pending);
    processedBuffer = fixTrailingEscape(processedBuffer, pending);
    processedBuffer = fixPartialMarker(processedBuffer, pending);
    processedBuffer = fixSetext(processedBuffer, pending);
    processedBuffer = fixLinkRefs(processedBuffer, pending);
    processedBuffer = fixMath(processedBuffer, pending);

    baseBuffer = processedBuffer;

    if (blockType !== "table") {
      processedBuffer = fixTempTable(processedBuffer);
      if (processedBuffer !== baseBuffer) {
        return processedBuffer;
      }
    } else {
      // Cell contents are inline markdown too, so balance them before the
      // table is reshaped — afterwards the row layout is settled and a
      // dangling backtick would be left sitting in a cell.
      processedBuffer = fixPartialRow(processedBuffer, pending);
      processedBuffer = fixInlineTokens(processedBuffer, caches);

      return repairTableSyntax(processedBuffer, blockType, pending);
    }

    processedBuffer = fixInlineTokens(processedBuffer, caches);

    // Dropping a dangling marker can expose what was sitting behind it — a
    // backslash, or a task marker that is now at the end of the line.
    processedBuffer = fixTrailingEscape(processedBuffer, pending);
    processedBuffer = fixTasklist(processedBuffer);
    processedBuffer = fixPartialMarker(processedBuffer, pending);

    return processedBuffer;
  }

  // A delimiter row is only a delimiter once its dashes arrive; until then
  // "| :" renders as a cell holding a colon.

  // "&copy;" is a symbol only once its semicolon lands; until then it reads
  // as a literal ampersand followed by letters.

  // A trailing backslash is either escaping the character that has not
  // arrived yet or is a hard line break. Either way it is markup, not text.

  // A list marker with nothing after it yet: "1." reads as the digit 1 until
  // its item text lands, and "- " as a stray dash.

  // A bare line of "-" or "=" under a line of text is a setext heading, so a
  // nested list marker turns its own parent into a heading for the instant
  // before the rest of the item arrives. Hold that line back until it says
  // what it is.

  // A link only becomes a link when its closing ")" lands. Until then hold it
  // back: streaming "[text](htt" shows raw markup, and GFM autolinks the
  // half-typed URL inside it, producing a live link to a truncated address.

  // Reference labels are case-insensitive, and an empty label ("[text][]")
  // refers back to the link text itself.

  // Link destinations may contain balanced parens, as in "/path(inner)".

  // Withhold a formula that is still arriving: an unclosed delimiter would
  // otherwise stream through as raw TeX and only snap into KaTeX on close.

  // Emphasis nests, so the marker that opened last must be closed first:
  // "**_bold" has to become "**_bold_**", never "**_bold**_". Collect every
  // unclosed marker with the offset it opened at, then close in reverse.

  // Every "*" / "_" run in the text, with the flanking flags that decide
  // whether it may open or close emphasis. Runs inside a code span, and a
  // "*" acting as a list bullet, are not delimiters at all.

  // CommonMark's "rule of three": when either side can both open and close,
  // the lengths may only sum to a multiple of three if both are.

  // Asterisks and underscores inside a code span are literal text, so the
  // emphasis balancing has to leave them alone. An opener with no closer yet
  // covers everything after it, since that is where the span will end up.

  // A run of three or more backticks at the start of a line opens a fenced
  // block, not a code span. Balancing it as a span would append a closer and
  // pull the fence marker into the code content.

  // Code spans are delimited by backtick *runs*, and a run of n only closes
  // on another run of exactly n. Counting lone backticks instead reports an
  // odd count for text like "\`this\`\`" and appends a stray backtick.
  // Pair backtick runs left to right: a run of n closes on the next run of
  // exactly n. Returns which runs got paired and the first that did not.

  // A marker is escaped only when an odd number of backslashes precedes it.

  // A "*" that opens a list item: line start, optional indent, then a space.
  // While the character after it is still unknown, assume a bullet — that
  // way a nascent list is never rewritten into emphasis.
}
