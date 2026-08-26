import { patterns } from "../patterns";

export function fixTrailingEscape(text: string, pending: boolean): string {
  let i;
  let count;

  if (!text || text === "" || pending !== true) {
    return text;
  }

  // Look past any trailing blank line: a backslash at the end of the last
  // line is the hard-break form, and equally not text.
  i = text.length - 1;

  while (i >= 0 && patterns.blankCharRegex.test(text.charAt(i))) {
    i--;
  }

  count = 0;

  while (i >= 0 && text.charAt(i) === "\\") {
    count++;
    i--;
  }

  if (count % 2 === 0) {
    return text;
  }

  return text.substring(0, i + count) + text.substring(i + count + 1);
}
