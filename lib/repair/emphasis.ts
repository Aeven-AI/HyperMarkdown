import { patterns } from "../patterns";

import { insideCodeSpan } from "./code-spans";
import { bulletMarker } from "./utils";

import type { PendingToken } from "./types";

export interface EmphasisRun {
  char: "*" | "_";
  index: number;
  length: number;
  remaining: number;
  canOpen: boolean;
  canClose: boolean;
  canBoth: boolean;
}

export interface EmphasisOpener {
  char: "*" | "_";
  index: number;
  length: number;
  remaining: number;
  canBoth: boolean;
}

export interface EmphasisResult {
  text: string;
  pending: PendingToken[];
}

export function fixEmphasis(text: string): EmphasisResult {
  let i;
  let j;
  let use;
  let run;
  let runs;
  let last;
  let stack: EmphasisOpener[];
  let opener;
  let pending: PendingToken[];
  let remaining: number;

  // A line that is nothing but a tag opens an HTML block, and everything
  // up to the next blank line belongs to it as raw text — emphasis markers
  // in there are literal.
  if (insideHtmlBlock(text) === true) {
    return { text: text, pending: [] };
  }

  runs = emphasisRuns(text);

  // Runs sitting at the very end have nothing to emphasise yet. Dropping
  // one can expose another, as in "**_", so keep going until the text no
  // longer ends in a delimiter.
  while (runs.length > 0) {
    last = runs[runs.length - 1];

    if (!last) {
      break;
    }

    if (last.index + last.length !== text.length) {
      break;
    }

    text = text.substring(0, last.index);
    runs = emphasisRuns(text);
  }

  stack = [];
  pending = [];

  for (i = 0; i < runs.length; i++) {
    run = runs[i];

    if (!run) {
      continue;
    }

    remaining = run.length;

    if (run.canClose === true) {
      j = stack.length - 1;

      while (j >= 0 && remaining > 0) {
        opener = stack[j];

        if (!opener) {
          j--;
          continue;
        }

        if (opener.char !== run.char || emphasisPairs(opener, run) !== true) {
          j--;
          continue;
        }

        use = opener.remaining >= 2 && remaining >= 2 ? 2 : 1;

        opener.remaining -= use;
        remaining -= use;

        // Delimiters between the pair are discarded, as CommonMark does.
        stack.length = j + 1;

        if (opener.remaining === 0) {
          stack.pop();
          j = stack.length - 1;
        }
      }
    }

    if (run.canOpen === true && remaining > 0) {
      stack.push({
        char: run.char,
        index: run.index,
        length: run.length,
        canBoth: run.canBoth,
        remaining: remaining,
      });
    }
  }

  for (i = 0; i < stack.length; i++) {
    opener = stack[i];

    if (opener && opener.remaining > 0) {
      pending.push({
        close: true,
        index: opener.index,
        token: opener.char.repeat(opener.remaining),
      });
    }
  }

  return { text: text, pending: pending };
}

export function emphasisRuns(text: string): EmphasisRun[] {
  let i;
  let run: EmphasisRun;
  let runs: EmphasisRun[];
  let char: "*" | "_";
  let current;
  let start;
  let after;
  let before;
  let leftFlanking;
  let rightFlanking;
  let canOpen;
  let canClose;

  runs = [];
  i = 0;

  while (i < text.length) {
    current = text.charAt(i);

    if (current === "\\") {
      i += 2;
      continue;
    }

    if (current !== "*" && current !== "_") {
      i++;
      continue;
    }

    char = current;

    start = i;

    while (i < text.length && text.charAt(i) === char) {
      i++;
    }

    if (insideCodeSpan(text, start) === true) {
      continue;
    }

    if (char === "*" && bulletMarker(text, start) === true) {
      continue;
    }

    // Text boundaries count as whitespace for flanking purposes.
    before = start === 0 ? " " : text.charAt(start - 1);
    after = i >= text.length ? " " : text.charAt(i);

    leftFlanking =
      patterns.blankCharRegex.test(after) !== true &&
      (patterns.punctuationRegex.test(after) !== true ||
        patterns.blankCharRegex.test(before) === true ||
        patterns.punctuationRegex.test(before) === true);

    rightFlanking =
      patterns.blankCharRegex.test(before) !== true &&
      (patterns.punctuationRegex.test(before) !== true ||
        patterns.blankCharRegex.test(after) === true ||
        patterns.punctuationRegex.test(after) === true);

    if (char === "*") {
      canOpen = leftFlanking;
      canClose = rightFlanking;
    } else {
      canOpen =
        leftFlanking &&
        (rightFlanking !== true || patterns.punctuationRegex.test(before));
      canClose =
        rightFlanking &&
        (leftFlanking !== true || patterns.punctuationRegex.test(after));
    }

    run = {
      char,
      index: start,
      length: i - start,
      remaining: i - start,
      canOpen,
      canClose,
      canBoth: canOpen === true && canClose === true,
    };

    runs.push(run);
  }

  return runs;
}

export function emphasisPairs(
  opener: EmphasisRun | EmphasisOpener,
  closer: EmphasisRun,
): boolean {
  if (opener.canBoth !== true && closer.canBoth !== true) {
    return true;
  }

  if ((opener.length + closer.length) % 3 !== 0) {
    return true;
  }

  return opener.length % 3 === 0 && closer.length % 3 === 0;
}

export function insideHtmlBlock(text: string): boolean {
  let start;
  let lineEnd;
  let firstLine;

  start = text.lastIndexOf("\n\n");
  start = start === -1 ? 0 : start + 2;

  lineEnd = text.indexOf("\n", start);
  firstLine =
    lineEnd === -1 ? text.substring(start) : text.substring(start, lineEnd);

  return (
    patterns.htmlBlockStartRegex.test(firstLine) ||
    patterns.htmlBlockTagRegex.test(firstLine)
  );
}
