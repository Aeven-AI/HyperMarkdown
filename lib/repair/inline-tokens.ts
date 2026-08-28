import { patterns } from "../patterns";

import { fixEmphasis } from "./emphasis";
import { fixCodeSpan, insideCodeSpan } from "./code-spans";
import { bulletMarker, escapedMarker } from "./utils";

import type { EmphasisResult } from "./emphasis";
import type { InlineTokenResult, PendingToken } from "./types";

/**
 * Memoised token patterns. They depend only on the token, but building them is
 * not free and a stream asks for the same handful over and over, so each
 * renderer keeps its own pair.
 */
export interface InlineCaches {
  token: Map<string, RegExp>;
  edge: Map<string, RegExp>;
}

export function createInlineCaches(): InlineCaches {
  return { token: new Map(), edge: new Map() };
}

export function fixInlineTokens(text: string, caches: InlineCaches): string {
  let i;
  let token;
  let passes;
  let result: InlineTokenResult | EmphasisResult;
  let pending: PendingToken[];
  let previous;

  // Dropping one dangling marker can leave the next one dangling, so let
  // the strips settle before deciding what still needs a closer. Deciding
  // too early appends to text that no longer ends the way it did — which
  // is how "**_" once became "****", a thematic break.
  passes = 0;

  do {
    previous = text;

    for (i = 0; i < patterns.inlineTokens.length; i++) {
      text = fixInlineToken(text, patterns.inlineTokens[i]!, caches).text;
    }

    // Emphasis strips belong in the same settling pass: dropping a
    // dangling "**" can leave a "~~" at the end that then has to be
    // dropped too, rather than closed into the fence "~~~~".
    text = fixEmphasis(text).text;

    passes++;
  } while (text !== previous && passes < patterns.inlineTokens.length + 2);

  pending = [];

  for (i = 0; i < patterns.inlineTokens.length; i++) {
    result = fixInlineToken(text, patterns.inlineTokens[i]!, caches);

    if (result.close === true) {
      pending.push(result);
    }
  }

  // "*" and "_" cannot be counted per token: in "**Bold *italic*** the
  // trailing "***" closes both the "*" and the "**" before it. They are
  // matched as delimiter runs instead, the way CommonMark does it.
  result = fixEmphasis(text);
  text = result.text;

  pending.push(...result.pending);

  if (pending.length === 0) {
    return text;
  }

  // An emphasis closer may not be preceded by whitespace, so "**mixed "
  // would close as "**mixed **" and render as literal asterisks. Dropping
  // the trailing blank costs nothing on screen and keeps it emphasis. Code
  // spans have no such rule, and their whitespace is content.
  if (pending.some((item) => patterns.emphasisTokenRegex.test(item.token))) {
    text = text.replace(patterns.trailingSpaceRegex, "");
  }

  pending.sort((a, b) => {
    return b.index - a.index;
  });

  for (i = 0; i < pending.length; i++) {
    token = pending[i]!.token;

    // Appending onto a run that was already there merges with it: "~" plus
    // "~~" is "~~~", which is a code fence, not strikethrough. That run is
    // dangling anyway, so drop it instead of closing onto it. Only the
    // first closer can hit this — the ones after it meet our own output,
    // where "*" followed by "**" is the intended "***".
    if (i === 0 && text.charAt(text.length - 1) === token.charAt(0)) {
      text = trimTrailingRun(text, token.charAt(0));
      continue;
    }

    text += token;
  }

  return text;
}

export function trimTrailingRun(text: string, char: string): string {
  let end;

  end = text.length;

  while (end > 0 && text.charAt(end - 1) === char) {
    end--;
  }

  return text.substring(0, end);
}

export function fixInlineToken(
  text: string,
  token: string,
  caches: InlineCaches,
): InlineTokenResult {
  let regex;
  let edgeRegex;
  let matches;
  let lastIndex;
  let tokenCount;
  let tokenLength;
  let inlineTokenRegexCache;
  let inlineTokenEdgeRegexCache;
  let char;
  let escapedChar;
  let escapedToken;

  if (token === "`") {
    return fixCodeSpan(text);
  }

  inlineTokenRegexCache = caches.token;
  inlineTokenEdgeRegexCache = caches.edge;

  regex = inlineTokenRegexCache.get(token);
  edgeRegex = inlineTokenEdgeRegexCache.get(token);

  if (!regex || !edgeRegex) {
    char = token.charAt(0);
    escapedChar = char.replace(patterns.escapedChar, "\\$&");
    escapedToken = token.replace(patterns.escapedChar, "\\$&");

    // Escaping is decided by escapedMarker below, which counts the
    // backslashes: in "\\\\~" the backslash is itself escaped, so the
    // tilde is not, and a lookbehind of one character gets that wrong.
    regex = new RegExp(
      `(?<!${escapedChar})${escapedToken}(?!${escapedChar})`,
      "g",
    );
    edgeRegex = new RegExp(`^${escapedToken}\\W*$`);

    inlineTokenRegexCache.set(token, regex);
    inlineTokenEdgeRegexCache.set(token, edgeRegex);
  }

  // Token expressions created above are global. Reset the shared expression
  // before every scan so a cached lastIndex never leaks between chunks.
  regex.lastIndex = 0;

  tokenCount = 0;
  lastIndex = -1;
  tokenLength = token.length;

  // "*" is also a list bullet, and asterisks inside a code span are text
  // rather than emphasis, so neither kind counts here.
  while ((matches = regex.exec(text))) {
    if (insideCodeSpan(text, matches.index) === true) {
      continue;
    }

    if (escapedMarker(text, matches.index) === true) {
      continue;
    }

    if (token !== "*" || bulletMarker(text, matches.index) !== true) {
      tokenCount++;
      lastIndex = matches.index;
    }
  }

  if (edgeRegex.test(text)) {
    if (token === "*" && bulletMarker(text, 0) === true) {
      return { text: text, token: token, close: false, index: -1 };
    }
    return {
      text: text.substring(tokenLength),
      token: token,
      close: false,
      index: -1,
    };
  }

  if (tokenCount % 2 !== 0) {
    if (text.endsWith(token)) {
      return {
        text: text.slice(0, -tokenLength),
        token: token,
        close: false,
        index: -1,
      };
    }

    return { text: text, token: token, close: true, index: lastIndex };
  }

  return { text: text, token: token, close: false, index: -1 };
}
