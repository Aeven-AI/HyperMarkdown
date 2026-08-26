import { patterns } from "../patterns";

export function fixSetext(text: string, pending: boolean): string {
  let lastLine;
  let lineStart;
  let previousLine;
  let previousStart;

  if (!text || text === "" || pending !== true) {
    return text;
  }

  lineStart = text.lastIndexOf("\n");

  if (lineStart === -1) {
    return text;
  }

  lastLine = text.substring(lineStart + 1);

  if (patterns.setextRegex.test(lastLine) !== true) {
    return text;
  }

  // Only underlines text: after a blank line the same characters are a
  // thematic break, which is not ambiguous and renders straight away.
  previousStart = text.lastIndexOf("\n", lineStart - 1);
  previousLine = text.substring(previousStart + 1, lineStart);

  if (previousLine.trim() === "") {
    return text;
  }

  return text.substring(0, lineStart + 1);
}
