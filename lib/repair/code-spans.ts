import { patterns } from "../patterns";

import type { InlineTokenResult } from "./types";
import type { TextRange } from "./tables";

export interface BacktickRun {
  index: number;
  length: number;
}

export interface BacktickPairs {
  paired: boolean[];
  unmatched: number;
}

export function fixCodeSpan(text: string): InlineTokenResult {
  let last;
  let runs;
  let result;
  let opener;

  runs = backtickRuns(text);
  result = pairBacktickRuns(runs);

  // A trailing run that closes nothing is the start of content still on
  // its way. Drop it, or the closer appended below would merge into it and
  // "`` `" would become five backticks instead of an empty code span.
  if (runs.length > 0) {
    last = runs[runs.length - 1];

    if (
      last &&
      last.index + last.length === text.length &&
      result.paired[runs.length - 1] !== true
    ) {
      text = text.substring(0, last.index);
      runs = backtickRuns(text);
      result = pairBacktickRuns(runs);
    }
  }

  if (result.unmatched === -1) {
    return { text: text, token: "`", close: false, index: -1 };
  }

  opener = runs[result.unmatched]!;

  return {
    text: text,
    token: "`".repeat(opener.length),
    close: true,
    index: opener.index,
  };
}

/**
 * The code spans in a text, as half-open [start, end) offsets.
 *
 * Memoised on the text itself. Every caller asking "is this offset inside a
 * code span?" is asking about the same text — once per emphasis run, once per
 * inline token — and recomputing the runs for each of them turned one pass
 * over a document into a quadratic one. Within a pass the same string object
 * is handed back, so the equality check is a pointer comparison.
 */
let spanText: string | null = null;
let spanRanges: TextRange[] = [];

function codeSpans(text: string): TextRange[] {
  if (text === spanText) {
    return spanRanges;
  }

  const runs = backtickRuns(text);
  const ranges: TextRange[] = [];

  let i = 0;

  while (i < runs.length) {
    const opener = runs[i]!;

    let closer = -1;

    for (let j = i + 1; j < runs.length; j++) {
      const candidate = runs[j];

      if (candidate!.length === opener.length) {
        closer = j;
        break;
      }
    }

    if (closer === -1) {
      // An unclosed run: everything after it reads as code so far.
      ranges.push({ start: opener.index, end: Number.MAX_SAFE_INTEGER });
      break;
    }

    const closerRun = runs[closer]!;

    ranges.push({ start: opener.index, end: closerRun.index });

    i = closer + 1;
  }

  spanText = text;
  spanRanges = ranges;

  return ranges;
}

export function insideCodeSpan(text: string, index: number): boolean {
  const ranges = codeSpans(text);

  // Sorted and non-overlapping by construction, so a binary search settles it.
  let low = 0;
  let high = ranges.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const range = ranges[mid]!;

    if (index <= range.start) {
      high = mid - 1;
    } else if (index >= range.end) {
      low = mid + 1;
    } else {
      return true;
    }
  }

  return false;
}

export function backtickRuns(text: string): BacktickRun[] {
  let i;
  let runs;
  let start;

  if (patterns.fenceLineRegex.test(text)) {
    return [];
  }

  runs = [];
  i = 0;

  while (i < text.length) {
    if (text.charAt(i) !== "`") {
      i++;
      continue;
    }

    start = i;

    while (i < text.length && text.charAt(i) === "`") {
      i++;
    }

    runs.push({ index: start, length: i - start });
  }

  return runs;
}

export function pairBacktickRuns(runs: BacktickRun[]): BacktickPairs {
  let i;
  let j;
  let paired;
  let closerIndex;
  let opener;
  let candidate;

  paired = [];
  i = 0;

  while (i < runs.length) {
    opener = runs[i]!;

    closerIndex = -1;

    for (j = i + 1; j < runs.length; j++) {
      candidate = runs[j]!;

      if (candidate.length === opener.length) {
        closerIndex = j;
        break;
      }
    }

    if (closerIndex === -1) {
      return { paired: paired, unmatched: i };
    }

    paired[i] = true;
    paired[closerIndex] = true;

    i = closerIndex + 1;
  }

  return { paired: paired, unmatched: -1 };
}
