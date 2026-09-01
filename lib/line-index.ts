// One pass over a buffer's lines, so scanners that used to be written as
// backtracking regexes can walk the document instead.
//
// The regexes these replace all shared a shape: a per-line pattern under a
// quantifier, or a lazy `[\s\S]*?` hunting for a terminator. Both make the
// engine re-read the same characters once per candidate start, which is the
// polynomial blow-up CodeQL reports. A line index is built once, in linear
// time, and every scan below reads it forward only.

export interface Line {
  /** Index of the line's first character. */
  start: number;
  /** Index just past the line's last character, before "\r" or "\n". */
  end: number;
  /** Index just past the line's terminator, or the buffer length. */
  next: number;
  /** The line itself, without its terminator. */
  text: string;
}

export function indexLines(text: string): Line[] {
  const lines: Line[] = [];

  let start = 0;

  for (;;) {
    const newline = text.indexOf("\n", start);
    const terminated = newline !== -1;
    const stop = terminated ? newline : text.length;
    const end = stop > start && text.charAt(stop - 1) === "\r" ? stop - 1 : stop;

    lines.push({
      start,
      end,
      next: terminated ? newline + 1 : text.length,
      text: text.slice(start, end),
    });

    if (!terminated) {
      return lines;
    }

    start = newline + 1;
  }
}

/** Whether the line carries a terminator, as `[^\n]*\n` in a pattern demands. */
export function terminated(line: Line): boolean {
  return line.next > line.end;
}
