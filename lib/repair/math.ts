import { patterns } from "../patterns";

export function fixMath(text: string, pending: boolean): string {
  let i;

  let chunk;
  let chunks;

  let offset;
  let openIndex;
  let mathIndex;

  const tokens = patterns.mathProtectedRegex;

  if (!text || text === "" || pending !== true) {
    return text;
  }

  tokens.lastIndex = 0;
  chunks = text.split(tokens);

  offset = 0;
  openIndex = -1;

  for (i = 0; i < chunks.length; i++) {
    chunk = chunks[i]!;

    if (i % 2 === 0) {
      mathIndex = findOpenMath(chunk);

      if (mathIndex !== -1) {
        openIndex = offset + mathIndex;
      }
    }

    offset += chunk.length;
  }

  if (openIndex === -1) {
    return text;
  }

  return text.substring(0, openIndex) + patterns.mathPendingTag;
}

export function findOpenMath(chunk: string): number {
  let i;

  let char;
  let next;

  let closeIndex;
  let closeToken;

  i = 0;

  while (i < chunk.length) {
    char = chunk.charAt(i);

    if (char === "\\") {
      next = chunk.charAt(i + 1);

      if (next === "(" || next === "[") {
        closeToken = next === "(" ? "\\)" : "\\]";
        closeIndex = chunk.indexOf(closeToken, i + 2);

        if (closeIndex === -1) {
          return i;
        }

        i = closeIndex + closeToken.length;
        continue;
      }

      i += 2;
      continue;
    }

    if (char === "$") {
      if (chunk.charAt(i + 1) === "$") {
        closeIndex = chunk.indexOf("$$", i + 2);

        if (closeIndex === -1) {
          return i;
        }

        i = closeIndex + 2;
        continue;
      }

      next = chunk.charAt(i + 1);

      // remark-math never opens on "$ " — leave prose dollars alone.
      if (next !== "" && patterns.mathSpaceRegex.test(next)) {
        i++;
        continue;
      }

      closeIndex = findInlineClose(chunk, i + 1);

      if (closeIndex === -1) {
        return i;
      }

      i = closeIndex + 1;
      continue;
    }

    i++;
  }

  return -1;
}

export function findInlineClose(chunk: string, from: number): number {
  let i;
  let char;

  for (i = from; i < chunk.length; i++) {
    char = chunk.charAt(i);

    if (char === "\\") {
      i++;
      continue;
    }

    if (char === "$") {
      return i;
    }
  }

  return -1;
}
