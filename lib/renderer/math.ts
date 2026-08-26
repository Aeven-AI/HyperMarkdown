import { patterns } from "./patterns";

/**
 * Normalise the notations models emit for maths onto the "$"/"$$" that
 * remark-math understands, leaving code, comments and raw HTML alone.
 */
export function convertMath(
  mdBuffer: string | null | undefined,
  blockType?: string
): string | null | undefined {
  const tokens = patterns.mathProtectedRegex;
  const mathSplitter = patterns.mathSplitterRegex;
  const looksLikeLeft = patterns.mathLooksLeftRegex;
  const looksLikeRight = patterns.mathLooksRightRegex;

  if (mdBuffer == null) {
    return mdBuffer;
  }

  if (!tokens) {
    return mdBuffer;
  } else {
    if (blockType === "code") {
      return mdBuffer;
    } else {
      if (tokens) {
        tokens.lastIndex = 0;
      }

      return mdBuffer
        .split(tokens)
        .map((chunk, i) => {
          const protectedRegion = i % 2 === 1;
          return protectedRegion ? chunk || "" : transformUnsafe(chunk || "");
        })
        .join("");
    }
  }

  function transformUnsafe(text: string): string {
    // TeX display "\[ … \]", only when the delimiters sit on their own lines
    text = text.replace(
      /(?<!\\)\\\[\s*\r?\n([\s\S]*?)\r?\n\s*\\\](?!\])/g,
      (_m, body) => `\n$$\n${(body || "").trim()}\n$$\n`
    );

    // TeX inline "\( … \)" → "$ … $"
    text = text.replace(
      /(?<!\\)\\\(([\s\S]*?)\\\)/g,
      (_m, body) => `$${(body || "").trim()}$`
    );

    // Bracketed block "[\n … \n]" → "$$ … $$"
    text = text.replace(
      /^[ \t]*\[\s*\r?\n([\s\S]*?)\r?\n[ \t]*\][ \t]*$/gm,
      (_m, body) => `\n$$\n${(body || "").trim()}\n$$\n`
    );

    return convertInlineOutsideMath(text);
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
            return `$${(body || "").trim()}$`;
          }
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
            return `$${(body || "").trim()}$`;
          }
        );

        return seg;
      })
      .join("");
  }
}
