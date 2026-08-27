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

  /**
   * Committed lines, i.e. those that arrived with their newline. This is the
   * number the gutter needs, and counting here is free: the alternative is
   * reading `textContent` off the rendered block, which re-serialises the
   * whole fence on every chunk and makes streaming a long block quadratic.
   */
  lineCount = 0;

  private buffer = "";
  private consumed = 0;
  private nextKey = 0;
  private fenceRead = false;
  private fenceMarker: string | null = null;

  reset(): void {
    this.data = [];
    this.language = null;
    this.lineCount = 0;
    this.buffer = "";
    this.consumed = 0;
    this.nextKey = 0;
    this.fenceRead = false;
    this.fenceMarker = null;
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
      this.fenceMarker = opening[1] || null;
      this.language = opening[2] || null;
      this.buffer = this.buffer.substring(opening[0].length);
    }

    let match: RegExpMatchArray | null;

    while ((match = this.buffer.match(separator))) {
      /* v8 ignore next -- a successful String.match always carries an index */
      const lineIndex = match.index ?? 0;
      const separatorLength = match[0].length;

      if (
        this.render(
          this.nextKey,
          this.buffer.substring(0, lineIndex + separatorLength),
          animation,
        )
      ) {
        this.lineCount++;
      }

      this.nextKey++;
      this.buffer = this.buffer.substring(lineIndex + separatorLength);
    }

    // A shorter run of the opening marker on the last line is most likely the
    // closing fence arriving; showing it would expose a partial fence. A line
    // that really contains that marker appears once its newline is committed.
    if (this.buffer.length > 0 && this.pendingFence(this.buffer) !== true) {
      this.render(this.nextKey, this.buffer, animation);
    }
  }

  /** Renders one line into the cache; false when the line is not code. */
  private render(key: number, line: string, animation: boolean): boolean {
    // A line holding nothing but a fence closes the block; it is not part of
    // the code. Parsing used to drop it as a side effect.
    if (this.closingFence(line) === true) {
      return false;
    }

    if (!line) {
      return false;
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

    return true;
  }

  private closingFence(line: string): boolean {
    let trimmed;

    if (!this.fenceMarker) {
      return false;
    }

    trimmed = line.trim();

    return (
      trimmed.length >= this.fenceMarker.length &&
      trimmed.split("").every((char) => char === this.fenceMarker?.charAt(0))
    );
  }

  private pendingFence(line: string): boolean {
    let trimmed;

    if (!this.fenceMarker) {
      return false;
    }

    trimmed = line.trim();

    return (
      trimmed.length > 0 &&
      trimmed.length < this.fenceMarker.length &&
      trimmed.split("").every((char) => char === this.fenceMarker?.charAt(0))
    );
  }
}
