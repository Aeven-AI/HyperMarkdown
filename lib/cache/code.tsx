import { Fragment, type ReactNode } from "react";

import { patterns } from "../patterns";

/**
 * A fenced code block, cached one line at a time.
 *
 * The buffer is append-only, so a committed line never changes: each is turned
 * into React once and kept. Only the line still being written is rebuilt on
 * every chunk. Without this a long block re-parses everything it has received
 * on each arriving chunk, which is what made large code blocks quadratic.
 */
export class CodeCache {
  /** One rendered line per key, ready to drop into a `<code>`. */
  data: ReactNode[] = [];

  /** The language the opening fence declared, if it declared one. */
  language: string | null = null;

  private buffer = "";
  private consumed = 0;
  private nextKey = 0;
  private fenceRead = false;

  reset(): void {
    this.data = [];
    this.language = null;
    this.buffer = "";
    this.consumed = 0;
    this.nextKey = 0;
    this.fenceRead = false;
  }

  /**
   * Take everything in `md` that has not been seen yet.
   *
   * No processor is involved: inside a fence every line is literal, so running
   * it through remark only to read the same text back costs a parse per chunk
   * — measurably the bulk of the time spent streaming a code block.
   */
  append(md: string, animation: boolean): void {
    const separator = /\r\n?|\n/;

    if (md.length <= this.consumed) {
      return;
    }

    this.buffer += md.substring(this.consumed);
    this.consumed = md.length;

    if (this.fenceRead !== true) {
      const opening = this.buffer.match(patterns.codeCachedInitRegex);

      if (!opening) {
        console.error("THIS SHOULD NEVER HAPPEN!", this.buffer);
        return;
      }

      this.fenceRead = true;
      this.language = opening[1] || null;
      this.buffer = this.buffer.substring(opening[0].length);
    }

    let match: RegExpMatchArray | null;

    while ((match = this.buffer.match(separator))) {
      const lineIndex = match.index ?? 0;
      const separatorLength = match[0].length;

      this.render(
        this.nextKey,
        this.buffer.substring(0, lineIndex + separatorLength),
        animation,
      );

      this.nextKey++;
      this.buffer = this.buffer.substring(lineIndex + separatorLength);
    }

    // One or two backticks alone on the last line are most likely the closing
    // fence arriving; showing them would put the fence marker into the code. A
    // line that really is just a backtick still appears once its newline lands
    // and the line is committed above.
    if (
      this.buffer.length > 0 &&
      patterns.partialFenceRegex.test(this.buffer) !== true
    ) {
      this.render(this.nextKey, this.buffer, animation);
    }
  }

  private render(key: number, line: string, animation: boolean): void {
    // A line holding nothing but a fence closes the block; it is not part of
    // the code. Parsing used to drop it as a side effect.
    if (patterns.fenceOnlyRegex.test(line)) {
      return;
    }

    if (!line) {
      return;
    }

    let content: ReactNode;

    if (animation !== true) {
      content = line;
    } else {
      content = line.split(patterns.emptyRegex).map((token, idx) => {
        if (token.trim() === "") {
          return token;
        }

        return (
          <span key={`${key}-w${idx}`} data-animate-word={true}>
            {token}
          </span>
        );
      });
    }

    this.data[key] = <Fragment key={key}>{content}</Fragment>;
  }
}
