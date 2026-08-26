import { patterns } from "../patterns";

/**
 * Reading the shape of a list out of its source.
 *
 * A streaming list is re-examined on every chunk, so these answer from the
 * buffer alone and never hold state of their own.
 */

export function listCacheable(md: string): boolean {
  let i;
  let line;
  let lines;
  let marker;
  let indent;
  let baseIndent;
  let itemCount;

  lines = md.split(patterns.lineSplitRegex);

  marker = null;
  baseIndent = null;
  itemCount = 0;

  for (i = 0; i < lines.length; i++) {
    line = lines[i]!;

    if (line.trim() === "") {
      continue;
    }

    indent = line.match(patterns.listIndentOnlyRegex)![0].length;

    if (baseIndent === null) {
      if (patterns.listItemRegex.test(line) !== true) {
        return false;
      }
      baseIndent = indent;
    }

    if (patterns.listItemRegex.test(line) === true && indent <= baseIndent) {
      if (marker === null) {
        marker = listMarkerFamily(line);
      } else if (listMarkerFamily(line) !== marker) {
        return false;
      }

      itemCount++;
    } else if (indent <= baseIndent) {
      return false;
    }
  }

  return itemCount > 1;
}

// "-" and "*" start different lists; "1." and "1)" likewise.

export function listMarkerFamily(line: string): string | null {
  let match;

  match = line.match(patterns.listMarkerRegex);

  if (!match) {
    return null;
  }

  if (/\d/.test(match[1]!) === true) {
    return "ordered" + match[1]!.slice(-1);
  }

  return "bullet" + match[1]!;
}

// Split a list block into its top-level items. A deeper marker is a nested
// list and stays with the item above it.

export function listItems(md: string): string[] {
  let i;
  let line;
  let lines;
  let items: string[];
  let indent;
  let current: string | null;
  let baseIndent;

  lines = md.split(patterns.lineSplitRegex);

  items = [];
  current = null;
  baseIndent = null;

  for (i = 0; i < lines.length; i++) {
    line = lines[i]!;
    indent = line.match(patterns.listIndentOnlyRegex)![0].length;

    if (patterns.listItemRegex.test(line) === true && baseIndent === null) {
      baseIndent = indent;
    }

    if (
      patterns.listItemRegex.test(line) === true &&
      baseIndent !== null &&
      indent <= baseIndent
    ) {
      if (current !== null) {
        items.push(current);
      }
      current = line;
    } else if (current !== null) {
      current += "\n" + line;
    }
  }

  if (current !== null) {
    items.push(current);
  }

  return items;
}

// Footnote definitions render nothing where they are written: the notes are
// gathered separately and emitted as one section at the end. A block holding
// only definitions therefore parses to an empty result, and on a long note
// list that same block is re-parsed on every chunk for no output at all.
