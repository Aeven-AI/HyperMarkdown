import { patterns } from "../patterns";

import type { BlockType } from "../types";

export interface TextRange {
  start: number;
  end: number;
}

export function repairTableSyntax(
  mdBuffer: string,
  blocktype: BlockType | "renderer",
  pending: boolean,
): string {
  if (blocktype === "table") {
    return convertTable(mdBuffer, pending);
  }

  if (blocktype === "renderer") {
    let lines;
    let headed;

    let match;
    let matchIndex;

    let result;
    let pointer;

    let trimmed;

    let replacement;
    let bufferLength;
    let fencedRanges;

    let delimiterLine;

    const tableRegex = patterns.tableRendererInitRegex;

    result = "";

    pointer = 0;
    tableRegex.lastIndex = 0;

    bufferLength = mdBuffer.length;

    fencedRanges = collectFencedRanges(mdBuffer);

    while ((match = tableRegex.exec(mdBuffer))) {
      matchIndex = match.index;

      if (pointer < matchIndex) {
        result += mdBuffer.slice(pointer, matchIndex);
      }

      if (isInsideFenced(matchIndex, fencedRanges)) {
        result += match[0];
      } else {
        // Same cleaning as the streaming path, so a whole document renders
        // the table a stream would have rendered.
        const cleaned = match[0]
          .split("\n")
          .map(dropTrailingComment)
          .join("\n");

        trimmed = cleaned.trim();
        lines = trimmed.split("\n");

        delimiterLine = lines[1] || "";
        headed = checkHeaded(delimiterLine);

        if (headed !== true) {
          replacement = convertTableHeadless(cleaned, lines);
          replacement = replacement + "\n";
          result += replacement;
        } else {
          result += cleaned;
        }
      }

      pointer = matchIndex + match[0].length;
    }

    if (pointer < bufferLength) {
      result += mdBuffer.slice(pointer, bufferLength);
    }

    tableRegex.lastIndex = 0;

    mdBuffer = result;

    return mdBuffer;
  }

  return mdBuffer;
}

export function convertTable(mdBuffer: string, pending: boolean): string {
  let headed;

  let lines;
  let headerLine;
  let delimiterLine;

  // Cleaned on the buffer, not just on the split copy: what leaves this
  // function is the buffer, and the parser downstream sees that.
  mdBuffer = mdBuffer.split("\n").map(dropTrailingComment).join("\n");

  const trimmed = mdBuffer.trim();

  if (!patterns.closeRegex.test(trimmed)) {
    return mdBuffer;
  } else {
    lines = trimmed.split("\n");
    headerLine = lines[0] || "";
    delimiterLine = lines[1] || "";

    headed = checkHeaded(delimiterLine);

    if (headed !== true) {
      mdBuffer = convertTableHeadless(mdBuffer, lines);

      return mdBuffer;
    } else {
      mdBuffer = convertTableWithHeader(pending, mdBuffer, headerLine, lines);

      return mdBuffer;
    }
  }
}

/**
 * Drop an HTML comment sitting after a row's last pipe.
 *
 * GFM counts everything after the final pipe as one more cell, so a header
 * annotated with `| | | | | <!-- note -->` has five cells against the
 * delimiter's four, the counts disagree and the whole thing stops being a
 * table — it renders as literal pipes instead. The comment is invisible
 * either way, so removing it costs nothing and keeps the table.
 */
function dropTrailingComment(line: string): string {
  const trimmed = line.trimEnd();

  if (!trimmed.endsWith("-->")) {
    return line;
  }

  const start = trimmed.lastIndexOf("<!--");

  if (start === -1) {
    return line;
  }

  const before = trimmed.slice(0, start);

  // Only when the comment really is trailing, after the row's own last pipe.
  return before.trimEnd().endsWith("|") ? before.trimEnd() : line;
}

export function checkHeaded(delimiterLine: string): boolean {
  let cells;
  let normalized;

  normalized = delimiterLine.trim().replace(/^>\s?/, "").trim();

  if (normalized.includes("|") !== true) {
    return false;
  }

  cells = normalized
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(patterns.closeRegex)
    .map((cell) => cell.trim());

  return (
    cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell) === true)
  );
}

export function convertTableHeadless(
  mdBuffer: string,
  lines: string[],
): string {
  let white;

  let trimmed;
  let bodyRows;

  let tableContent;

  let columns;
  let dummyHeader;
  let dummyDelimiter;

  let columnsMax = 0;

  // Normalise the outer pipes first: a headless row may arrive as "a | b",
  // and counting columns before adding them reports one column too few.
  bodyRows = lines
    .map((line) => {
      trimmed = line.trim();
      if (trimmed && !trimmed.endsWith("|")) {
        trimmed += " |";
      }
      if (trimmed && !trimmed.startsWith("|")) {
        trimmed = "| " + trimmed;
      }
      return trimmed;
    })
    .filter((line) => line !== "");

  bodyRows.forEach((line) => {
    columns = line.split(patterns.closeRegex).length - 2;
    if (columns > columnsMax) {
      columnsMax = columns;
    }
  });

  if (columnsMax < 1) {
    return mdBuffer;
  } else {
    dummyHeader = "|" + " |".repeat(columnsMax);
    dummyDelimiter = "|" + " :--- |".repeat(columnsMax);

    white = mdBuffer.match(patterns.whiteRegex)?.[0] ?? "";

    tableContent = [dummyHeader, dummyDelimiter, ...bodyRows].join("\n");

    if (!mdBuffer.endsWith("|\n\n")) {
      return white + tableContent;
    } else {
      return white + tableContent + "\n\n";
    }
  }
}

export function collectFencedRanges(text: string): TextRange[] {
  let ranges: TextRange[];
  let fenceMatch;
  let rangeStart;
  let rangeEnd;
  const fencedBlockRegex =
    /(?:^|\n)([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?(?:\n\1\2[ \t]*(?=\n|$))/g;

  ranges = [];

  while ((fenceMatch = fencedBlockRegex.exec(text))) {
    rangeStart = fenceMatch.index;
    rangeEnd = rangeStart + fenceMatch[0].length;
    ranges.push({
      start: rangeStart,
      end: rangeEnd,
    });
  }

  return ranges;
}

export function isInsideFenced(index: number, ranges: TextRange[]): boolean {
  let i;
  let range;

  if (!ranges || ranges.length === 0) {
    return false;
  }

  for (i = 0; i < ranges.length; i++) {
    range = ranges[i];
    if (!range) {
      continue;
    }
    if (index >= range.start && index < range.end) {
      return true;
    }
  }

  return false;
}

export function convertTableWithHeader(
  pending: boolean,

  mdBuffer: string,
  headerLine: string,
  lines: string[],
): string {
  let white;

  let delimiter;
  let tableContent;

  const headerRow = headerLine;
  const bodyRows = lines.slice(2);

  const headerColumnCount = headerRow.split(patterns.closeRegex).length;

  // Stand-in delimiter and placeholder row so a table shows up while its
  // real delimiter is still arriving. Once closed the table is whatever it
  // is — a header with no rows stays that way, keeping its own alignment.
  if (pending === true && headerColumnCount > 0 && lines.length < 3) {
    white = mdBuffer.match(patterns.whiteRegex)?.[0] ?? "";
    delimiter = "|" + " :--- |".repeat(headerColumnCount - 2);
    tableContent = [headerRow, delimiter, ...bodyRows].join("\n");

    return white + tableContent + "\n|";
  } else {
    return mdBuffer;
  }
}

export function fixPartialRow(text: string, pending: boolean): string {
  let lastLine;
  let lineStart;

  if (!text || text === "" || pending !== true) {
    return text;
  }

  lineStart = text.lastIndexOf("\n");
  lastLine = text.substring(lineStart + 1);

  if (patterns.partialRowRegex.test(lastLine) !== true) {
    return text;
  }

  if (lastLine.indexOf("---") !== -1) {
    return text;
  }

  return text.substring(0, lineStart + 1);
}

export function fixTempTable(text: string): string {
  if (text.includes("\n\n")) {
    return text;
  }
  const pipeIndex = text.search(patterns.pipeRegex);
  if (pipeIndex === -1) {
    return text;
  }
  return text.substring(0, pipeIndex);
}
