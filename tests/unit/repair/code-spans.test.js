import { describe, expect, it } from "vitest";

import {
  backtickRuns,
  fixCodeSpan,
  insideCodeSpan,
  pairBacktickRuns,
} from "../../../lib/repair/code-spans";

describe("backtickRuns", () => {
  it("records the offset and width of every run", () => {
    expect(backtickRuns("a `one` and ``two``")).toEqual([
      { index: 2, length: 1 },
      { index: 6, length: 1 },
      { index: 12, length: 2 },
      { index: 17, length: 2 },
    ]);
  });

  it("does not treat a fenced block as inline code", () => {
    expect(backtickRuns("```js\nconst x = 1")).toEqual([]);
  });
});

describe("pairBacktickRuns", () => {
  it("pairs runs of equal width from left to right", () => {
    const result = pairBacktickRuns([
      { index: 0, length: 2 },
      { index: 3, length: 1 },
      { index: 5, length: 2 },
      { index: 8, length: 1 },
    ]);

    expect(result).toEqual({ paired: [true, undefined, true], unmatched: 3 });
  });

  it("reports no unmatched run when every span closes", () => {
    expect(
      pairBacktickRuns([
        { index: 0, length: 1 },
        { index: 4, length: 1 },
      ]),
    ).toEqual({ paired: [true, true], unmatched: -1 });
  });
});

describe("fixCodeSpan", () => {
  it("requests a matching closer for an open run", () => {
    expect(fixCodeSpan("before ``code")).toEqual({
      text: "before ``code",
      token: "``",
      close: true,
      index: 7,
    });
  });

  it("leaves a complete span alone", () => {
    expect(fixCodeSpan("`code`")).toEqual({
      text: "`code`",
      token: "`",
      close: false,
      index: -1,
    });
  });

  it("drops a dangling run with no content", () => {
    expect(fixCodeSpan("before `")).toEqual({
      text: "before ",
      token: "`",
      close: false,
      index: -1,
    });
  });
});

describe("insideCodeSpan", () => {
  it("distinguishes content, delimiters, and surrounding text", () => {
    const text = "a `code` b";

    expect(insideCodeSpan(text, 3)).toBe(true);
    expect(insideCodeSpan(text, 2)).toBe(false);
    expect(insideCodeSpan(text, 7)).toBe(false);
    expect(insideCodeSpan(text, 9)).toBe(false);
  });

  it("treats text after an unclosed run as code", () => {
    expect(insideCodeSpan("a ``unfinished", 8)).toBe(true);
  });

  it("skips runs whose width does not match the opener", () => {
    const text = "a `open `` wider";

    expect(insideCodeSpan(text, text.length - 1)).toBe(true);
  });
});
