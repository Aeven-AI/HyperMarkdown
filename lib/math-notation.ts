import { indexLines, terminated } from "./line-index";
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
    // The TeX delimiters themselves are not rewritten here. `\(…\)`, `\[…\]`
    // and a same-line `$$…$$` are recognised while parsing, by the math
    // plugin's micromark extension, which can tell an escape from a delimiter
    // and knows whether it is inside a table cell or interrupting a paragraph.
    // What stays below is the part no tokenizer covers: notations that are not
    // TeX at all, and the dollars that must be kept away from maths.

    // Bracketed block "[\n … \n]" → "$$ … $$"
    text = convertBracketBlocks(text);

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
    mathSplitter.lastIndex = 0;

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

  /**
   * Rewrite each "[" / "]" pair that sits alone on its own line.
   *
   * The pattern this replaces led with "\\[\\s*\\r?\\n" — an ambiguous split,
   * since "\\s*" and "\\r?\\n" both match a newline — and then hunted for the
   * closing line with a lazy "[\\s\\S]*?". A run of blank lines under an
   * unclosed bracket was therefore re-read once per line. Walking the lines
   * settles both: the whitespace run is skipped once, and once no closing line
   * is left, no later bracket can find one either, so the scan is over.
   */
  function convertBracketBlocks(source: string): string {
    const lines = indexLines(source);

    let result = "";
    let pointer = 0;
    let index = 0;

    while (index < lines.length) {
      const open = lines[index]!;

      if (!terminated(open) || !opensBracket(open.text)) {
        index++;
        continue;
      }

      // "\\s*" ran to the last newline of the whitespace after "[", so the
      // body starts at the first line that carries something.
      let bodyStart = index + 1;

      while (bodyStart < lines.length && lines[bodyStart]!.text.trim() === "") {
        bodyStart++;
      }

      let closing = bodyStart + 1;

      while (closing < lines.length && !closesBracket(lines[closing]!.text)) {
        closing++;
      }

      if (closing >= lines.length) {
        break;
      }

      const body = source.slice(lines[bodyStart]!.start, lines[closing - 1]!.end);

      result += source.slice(pointer, open.start);
      result += looksLikeBracketMath(body)
        ? `\n$$\n${body.trim()}\n$$\n`
        : source.slice(open.start, lines[closing]!.end);

      pointer = lines[closing]!.end;
      index = closing + 1;
    }

    return result + source.slice(pointer);
  }

  /** "[" alone on its line, with only spaces or tabs around it. */
  function opensBracket(line: string): boolean {
    return /^[ \t]*\[[ \t]*$/.test(line);
  }

  /** The matching "]" or "\\]", likewise alone. */
  function closesBracket(line: string): boolean {
    return /^[ \t]*\\?\][ \t]*$/.test(line);
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
