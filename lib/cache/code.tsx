import { Fragment, type ReactNode } from "react";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment as JsxFragment, jsx, jsxs } from "react/jsx-runtime";

import { patterns } from "../patterns";

import type { Root as HastRoot } from "hast";

/** A line separator at the very end of a line. */
const trailingSeparator = /(\r\n?|\n)$/;

/** Colours one line of code, or returns null when it cannot. */
export type LineHighlighter = (
  code: string,
  language: string | null,
) => HastRoot | null;

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
   * Whether any line came back coloured. The `hljs` class carries the theme's
   * background, so it belongs on the block only once something is actually
   * highlighted — an unknown language leaves every line plain.
   */
  highlighted = false;

  /**
   * How many lines the gutter should number: the committed ones plus the line
   * still being typed, which is rendered as soon as it has any text. Counting
   * only committed lines leaves the line in progress without a number until
   * its newline arrives, so the gutter trails the code by one line.
   *
   * Counting here is free; the alternative is reading `textContent` off the
   * rendered block, which re-serialises the whole fence on every chunk and
   * makes streaming a long block quadratic.
   */
  get lineCount(): number {
    return this.committed + (this.pending ? 1 : 0);
  }

  /** Lines that arrived with their newline. */
  private committed = 0;

  /** Whether the tail of the buffer is currently rendered as a line. */
  private pending = false;

  private buffer = "";
  private consumed = 0;
  private nextKey = 0;
  private fenceRead = false;
  private fenceMarker: string | null = null;

  reset(): void {
    this.data = [];
    this.language = null;
    this.highlighted = false;
    this.committed = 0;
    this.pending = false;
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
  append(
    md: string,
    animation: boolean,
    highlight?: LineHighlighter | undefined,
  ): void {
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
      const lineIndex = match.index ?? 0;
      const separatorLength = match[0].length;

      if (
        this.render(
          this.nextKey,
          this.buffer.substring(0, lineIndex + separatorLength),
          animation,
          highlight,
        )
      ) {
        this.committed++;
      }

      this.nextKey++;
      this.buffer = this.buffer.substring(lineIndex + separatorLength);
    }

    // A shorter run of the opening marker on the last line is most likely the
    // closing fence arriving; showing it would expose a partial fence. A line
    // that really contains that marker appears once its newline is committed.
    this.pending = false;

    if (this.buffer.length > 0 && this.pendingFence(this.buffer) !== true) {
      this.pending = this.render(
        this.nextKey,
        this.buffer,
        animation,
        highlight,
      );
    }
  }

  /** Renders one line into the cache; false when the line is not code. */
  private render(
    key: number,
    line: string,
    animation: boolean,
    highlight?: LineHighlighter | undefined,
  ): boolean {
    // A line holding nothing but a fence closes the block; it is not part of
    // the code. Parsing used to drop it as a side effect.
    if (this.closingFence(line) === true) {
      return false;
    }

    if (!line) {
      return false;
    }

    let content: ReactNode;
    const coloured = highlight ? this.colour(line, highlight) : null;

    if (coloured !== null) {
      this.highlighted = true;
      content = coloured;
    } else if (animation !== true) {
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

  /**
   * The line as highlighted markup, or null when the highlighter passed.
   *
   * The line separator is held back: highlight.js would keep it inside the
   * last span, and the settled render puts it between lines instead.
   */
  private colour(line: string, highlight: LineHighlighter): ReactNode {
    const separator = line.match(trailingSeparator);
    const source = separator ? line.slice(0, -separator[0].length) : line;

    if (source === "") {
      return null;
    }

    const tree = highlight(source, this.language);

    if (!tree) {
      return null;
    }

    return (
      <>
        {toJsxRuntime(tree, {
          jsx: jsx,
          jsxs: jsxs,
          Fragment: JsxFragment,
        })}
        {separator ? separator[0] : null}
      </>
    );
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
