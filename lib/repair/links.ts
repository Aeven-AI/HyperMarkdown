import { patterns } from "../patterns";

export function fixLinkRefs(text: string, pending: boolean): string {
  let i;

  let chunk;
  let chunks;

  let offset;
  let openIndex;
  let linkIndex;

  const tokens = patterns.mathProtectedRegex;

  if (!text || text === "" || pending !== true) {
    return text;
  }

  tokens.lastIndex = 0;
  chunks = text.split(tokens);

  offset = 0;
  openIndex = -1;

  for (i = 0; i < chunks.length; i++) {
    chunk = chunks[i] || "";

    if (i % 2 === 0) {
      linkIndex = findOpenLink(chunk, i === chunks.length - 1, text);

      if (linkIndex !== -1) {
        openIndex = offset + linkIndex;
      }
    }

    offset += chunk.length;
  }

  if (openIndex === -1) {
    return text;
  }

  return text.substring(0, openIndex);
}

export function findOpenLink(
  chunk: string,
  isTail: boolean,
  fullText: string,
): number {
  let i;
  let char;
  let next;
  let start;
  let label;
  let labelEnd;
  let closeIndex;

  i = 0;

  while (i < chunk.length) {
    char = chunk.charAt(i);

    if (char === "\\") {
      i += 2;
      continue;
    }

    // "<" opens either an angle autolink or raw HTML. Both read as stray
    // markup until the ">" lands, and GFM autolinks the half-typed URL
    // inside an unfinished one, so hold the whole construct back.
    if (char === "<") {
      next = chunk.charAt(i + 1);

      if (next !== "" && patterns.angleOpenRegex.test(next) !== true) {
        i++;
        continue;
      }

      closeIndex = findUnescaped(chunk, ">", i + 1);

      if (closeIndex === -1) {
        return isTail === true ? i : -1;
      }

      i = closeIndex + 1;
      continue;
    }

    if (char !== "[") {
      i++;
      continue;
    }

    start = i;

    if (i > 0 && chunk.charAt(i - 1) === "!") {
      start = i - 1;
    }

    closeIndex = findUnescaped(chunk, "]", i + 1);

    if (closeIndex === -1) {
      return start;
    }

    // What follows "]" decides whether these brackets are a link at all,
    // so one character past it is still undecided.
    if (closeIndex + 1 >= chunk.length) {
      return isTail === true ? start : -1;
    }

    char = chunk.charAt(closeIndex + 1);

    if (char === "(") {
      closeIndex = findClosingParen(chunk, closeIndex + 2);

      if (closeIndex === -1) {
        return start;
      }

      i = closeIndex + 1;
      continue;
    }

    if (char === "[") {
      labelEnd = findUnescaped(chunk, "]", closeIndex + 2);

      if (labelEnd === -1) {
        return start;
      }

      // A reference link is only a link once its definition has arrived;
      // until then it would stream as "[text][label]". Holding it back
      // also holds back what follows, so a reference whose definition
      // never comes keeps the rest of the block waiting until the block
      // closes — at which point everything renders.
      label = chunk.substring(closeIndex + 2, labelEnd);

      if (hasDefinition(fullText, label) !== true) {
        return start;
      }

      i = labelEnd + 1;
      continue;
    }

    i = closeIndex + 1;
  }

  return -1;
}

export function hasDefinition(fullText: string, label: string): boolean {
  let i;
  let line;
  let lines;
  let needle;

  needle = "[" + label.trim().toLowerCase() + "]:";
  lines = fullText.split("\n");

  for (i = 0; i < lines.length; i++) {
    line = (lines[i] ?? "").trim();

    // The destination has to be there too, or the link still has nowhere
    // to point and remark leaves the whole thing as text.
    if (line.toLowerCase().indexOf(needle) === 0) {
      // The last line is still being written; remark only resolves a
      // definition once the line that holds it has ended.
      if (i === lines.length - 1) {
        continue;
      }

      if (line.substring(needle.length).trim() !== "") {
        return true;
      }
    }
  }

  return false;
}

export function findUnescaped(
  chunk: string,
  target: string,
  from: number,
): number {
  let i;
  let char;

  for (i = from; i < chunk.length; i++) {
    char = chunk.charAt(i);

    if (char === "\\") {
      i++;
      continue;
    }

    if (char === target) {
      return i;
    }
  }

  return -1;
}

export function findClosingParen(chunk: string, from: number): number {
  let i;
  let char;
  let depth;

  depth = 1;

  for (i = from; i < chunk.length; i++) {
    char = chunk.charAt(i);

    if (char === "\\") {
      i++;
      continue;
    }

    if (char === "(") {
      depth++;
      continue;
    }

    if (char === ")") {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}
