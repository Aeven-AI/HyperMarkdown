import { patterns } from "../patterns";

import type { InlineTokenResult } from "./types";

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

  opener = runs[result.unmatched];

  if (!opener) {
    return { text: text, token: "`", close: false, index: -1 };
  }

  return {
    text: text,
    token: "`".repeat(opener.length),
    close: true,
    index: opener.index,
  };
}

export function insideCodeSpan(text: string, index: number): boolean {
  let i;
  let j;
  let runs;
  let opener;
  let closer;
  let candidate;
  let closerRun;

  runs = backtickRuns(text);
  i = 0;

  while (i < runs.length) {
    opener = runs[i];

    if (!opener) {
      break;
    }

    closer = -1;

    for (j = i + 1; j < runs.length; j++) {
      candidate = runs[j];

      if (candidate && candidate.length === opener.length) {
        closer = j;
        break;
      }
    }

    if (closer === -1) {
      return index > opener.index;
    }

    closerRun = runs[closer];

    if (closerRun && index > opener.index && index < closerRun.index) {
      return true;
    }

    i = closer + 1;
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
    opener = runs[i];

    if (!opener) {
      break;
    }

    closerIndex = -1;

    for (j = i + 1; j < runs.length; j++) {
      candidate = runs[j];

      if (candidate && candidate.length === opener.length) {
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
