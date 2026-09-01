import { indexLines, terminated, type Line } from "../line-index";
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

    let matchIndex;

    let result;
    let pointer;

    let trimmed;

    let replacement;
    let bufferLength;
    let fencedRanges;

    let delimiterLine;

    result = "";

    pointer = 0;

    bufferLength = mdBuffer.length;

    fencedRanges = collectFencedRanges(mdBuffer);

    for (const run of findTableRuns(mdBuffer)) {
      matchIndex = run.start;

      const runText = mdBuffer.slice(run.start, run.end);

      if (pointer < matchIndex) {
        result += mdBuffer.slice(pointer, matchIndex);
      }

      if (isInsideFenced(matchIndex, fencedRanges)) {
        result += runText;
      } else {
        // Same cleaning as the streaming path, so a whole document renders
        // the table a stream would have rendered.
        const cleaned = runText
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

      pointer = run.end;
    }

    if (pointer < bufferLength) {
      result += mdBuffer.slice(pointer, bufferLength);
    }

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

/**
 * The run of two or more pipe-carrying lines a table repair starts from.
 *
 * This is what `(?:[^\n]*\|[^\n]*\n)+` used to find, minus its cost: every
 * pipe on a line was another way for the engine to split that line, so a
 * pipe-dense row whose run came up short — the ordinary shape of a table only
 * half-arrived — was re-read once per pipe, and a pair of such rows once per
 * pair of pipes. Counting pipes per line instead reads each line once.
 */
function findTableRuns(text: string): TextRange[] {
  const runs: TextRange[] = [];
  const lines = indexLines(text);

  let runStart = -1;
  let runLength = 0;

  const close = (end: number) => {
    // The pattern needed one line for the leading `+` and one for the
    // alternation that follows it, whichever branch matched.
    if (runLength >= 2) {
      runs.push({ start: runStart, end });
    }

    runStart = -1;
    runLength = 0;
  };

  for (const line of lines) {
    // An unterminated line cannot be part of a run: every row in the pattern
    // carried its own "\n". It also ends the run it would have extended.
    if (!terminated(line) || !line.text.includes("|")) {
      close(line.start);
      continue;
    }

    if (runStart === -1) {
      runStart = line.start;
    }

    runLength++;
  }

  close(text.length);

  return runs;
}

/** How far a line is indented, counting only the spaces and tabs "[ \t]*" did. */
function indentWidth(text: string): number {
  let width = 0;

  while (text.charAt(width) === " " || text.charAt(width) === "\t") {
    width++;
  }

  return width;
}

/** A line that opens a fence: indentation, then "```" or "~~~", then anything. */
function fenceOpen(line: Line): string | null {
  const indent = indentWidth(line.text);
  const marker = line.text.slice(indent, indent + 3);

  if (marker !== "```" && marker !== "~~~") {
    return null;
  }

  // The pattern closed on a back-reference to both, so they are the identity
  // of the fence: an opener is only closed by its own indent and marker.
  return line.text.slice(0, indent) + "\u0000" + marker;
}

/** A line that closes one: the opener's exact indent and marker, nothing after. */
function fenceClose(line: Line): string | null {
  const key = fenceOpen(line);

  if (key === null) {
    return null;
  }

  const rest = line.text.slice(key.indexOf("\u0000") + 3);

  return indentWidth(rest) === rest.length ? key : null;
}

export function collectFencedRanges(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  const lines = indexLines(text);

  // Where each opener's closing line can be, gathered up front. The lazy
  // `[\s\S]*?` this replaces rescanned the whole tail for every fence that
  // never closed, so a buffer of unterminated fences cost one full pass each.
  const closers = new Map<string, number[]>();

  lines.forEach((line, index) => {
    // "[ \t]*(?=\n|$)" would not step over a carriage return, so a CRLF line
    // never closed a fence.
    const key = text.charAt(line.end) === "\r" ? null : fenceClose(line);

    if (key !== null) {
      const found = closers.get(key);

      if (found) {
        found.push(index);
      } else {
        closers.set(key, [index]);
      }
    }
  });

  // Openers are visited in order, so each key's list is only ever read
  // forward: the cursors together cost one pass over the closing lines.
  const cursors = new Map<string, number>();

  let index = 0;

  while (index < lines.length) {
    const line = lines[index]!;
    const key = terminated(line) ? fenceOpen(line) : null;

    if (key === null) {
      index++;
      continue;
    }

    const candidates = closers.get(key);

    if (!candidates) {
      index++;
      continue;
    }

    let cursor = cursors.get(key) ?? 0;

    // The opening line took its own newline with it and the closing line needs
    // one of its own in front, so the two are never adjacent: under the old
    // pattern an empty fence did not match at all, and the line below an
    // opener is read as content even when it looks like a closer.
    while (cursor < candidates.length && candidates[cursor]! <= index + 1) {
      cursor++;
    }

    cursors.set(key, cursor);

    if (cursor === candidates.length) {
      index++;
      continue;
    }

    const closing = candidates[cursor]!;

    ranges.push({
      // The pattern opened on "(?:^|\n)", so a fence below the first line
      // takes the newline above it with it.
      start: line.start === 0 ? 0 : line.start - 1,
      end: lines[closing]!.end,
    });

    index = closing + 1;
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
