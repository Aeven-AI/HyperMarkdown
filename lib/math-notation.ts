import { patterns } from "./patterns";

/**
 * Normalise the notations models emit for maths onto the "$"/"$$" that
 * remark-math understands, leaving code, comments and raw HTML alone.
 */
export function convertMath(
  mdBuffer: string | null | undefined,
  blockType?: string,
): string | null | undefined {
  const tokens = patterns.mathProtectedRegex;
  const mathSplitter = patterns.mathSplitterRegex;
  const looksLikeLeft = patterns.mathLooksLeftRegex;
  const looksLikeRight = patterns.mathLooksRightRegex;

  if (mdBuffer == null) {
    return mdBuffer;
  }

  if (blockType === "code") {
    return mdBuffer;
  } else {
    tokens.lastIndex = 0;

    return mdBuffer
      .split(tokens)
      .map((chunk, i) => {
        const protectedRegion = i % 2 === 1;
        return protectedRegion ? chunk : transformUnsafe(chunk);
      })
      .join("");
  }

  function transformUnsafe(text: string): string {
    // TeX display "\[ … \]", only when the delimiters sit on their own lines
    text = text.replace(
      /(?<!\\)\\\[\s*\r?\n([\s\S]*?)\r?\n\s*\\\](?!\])/g,
      (_m, body) => `\n$$\n${body.trim()}\n$$\n`,
    );

    // TeX display "\[ … \]" written on one line, which is how models most
    // often emit it. Only when the line holds nothing else and the body reads
    // as maths: "\[" is also markdown's escape for a literal bracket, so
    // "\[see notes\]" has to stay text.
    text = text.replace(
      /^[ \t]*(?<!\\)\\\[[ \t]*([^\r\n]*?)[ \t]*\\\][ \t]*$/gm,
      (match, body) =>
        looksLikeBracketMath(body) ? `\n$$\n${body.trim()}\n$$\n` : match,
    );

    // TeX inline "\( … \)" → "$ … $"
    text = text.replace(
      /(?<!\\)\\\(([\s\S]*?)\\\)/g,
      (_m, body) => `$${body.trim()}$`,
    );

    // Bracketed block "[\n … \n]" → "$$ … $$"
    text = text.replace(
      /^[ \t]*\[\s*\r?\n([\s\S]*?)\r?\n[ \t]*(?:\\\]|\])[ \t]*$/gm,
      (match, body) =>
        looksLikeBracketMath(body) ? `\n$$\n${body.trim()}\n$$\n` : match,
    );

    text = protectNonMathDollars(text);

    return convertInlineOutsideMath(text);
  }

  function protectNonMathDollars(text: string): string {
    return text.replace(/(?<![$\\])\$([^$\r\n]+)\$(?!\$)/g, (match, body) =>
      looksLikeDollarMath(body) ? match : `\\$${body}\\$`,
    );
  }

  function looksLikeDollarMath(body: string): boolean {
    let trimmed;

    trimmed = body.trim();

    return (
      trimmed !== "" &&
      /^(?:\.{3,}|…+)$/.test(trimmed) !== true &&
      trimmed.endsWith("~") !== true
    );
  }

  function convertInlineOutsideMath(text: string): string {
    if (mathSplitter) {
      mathSplitter.lastIndex = 0;
    }

    return text
      .split(mathSplitter)
      .map((seg, i) => {
        if (i % 2 === 1) return seg;

        // "(( … ))" → "$…$"
        seg = seg.replace(
          /(?<!\\)\(\(\s*([\s\S]*?)\s*\)\)/g,
          (m, body, offset, str) => {
            if (offset > 0 && str.charAt(offset - 1) === "]") return m;
            const before = str.slice(Math.max(0, offset - 12), offset);
            const after = str.slice(offset + m.length, offset + m.length + 12);
            if (looksLikeLeft.test(before) || looksLikeRight.test(after))
              return m;
            return `$${body.trim()}$`;
          },
        );

        // "( … )" with padding spaces → "$…$"
        seg = seg.replace(
          /(?<!\\)\(\s+([\s\S]*?)\s+\)/g,
          (m, body, offset, str) => {
            // a "]" before it makes this a link destination, not maths
            if (offset > 0 && str.charAt(offset - 1) === "]") return m;
            const before = str.slice(Math.max(0, offset - 12), offset);
            const after = str.slice(offset + m.length, offset + m.length + 12);
            if (looksLikeLeft.test(before) || looksLikeRight.test(after))
              return m;
            return `$${body.trim()}$`;
          },
        );

        return seg;
      })
      .join("");
  }

  function looksLikeBracketMath(body: string): boolean {
    let trimmed;

    const jsonValue = /^(?:\{|"|true\b|false\b|null\b)/;
    const mathSyntax =
      /\\[A-Za-z]+|[=^_]|[A-Za-z0-9})]\s*[+*/-]\s*[A-Za-z0-9({]/;

    trimmed = body.trim();

    if (trimmed === "" || jsonValue.test(trimmed)) {
      return false;
    }

    return mathSyntax.test(trimmed);
  }
}
