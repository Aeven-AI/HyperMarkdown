import { patterns } from "../patterns";

export function fixPartialMarker(text: string, pending: boolean): string {
  let lastLine;
  let lineStart;

  if (!text || text === "" || pending !== true) {
    return text;
  }

  lineStart = text.lastIndexOf("\n");
  lastLine = text.substring(lineStart + 1);

  if (patterns.markerOnlyRegex.test(lastLine) === true) {
    return text.substring(0, lineStart + 1);
  }

  // A nested marker opening inside an item — "-   -" — is equally a marker
  // with no item text behind it yet.
  return text.replace(patterns.nestedMarkerRegex, "$1");
}
