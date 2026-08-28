import { describe, expect, it, vi } from "vitest";

import { patterns } from "../../lib/patterns";

import {
  findBlockBoundary,
  splitReasoning,
} from "../../lib/stream/find-block-boundary";

function refs() {
  return { footnotes: new Map<string, string>(), mdExtra: new Map<string, string>() };
}

function withMatch(
  source: string,
  expression: RegExp,
  result: RegExpMatchArray,
  run: () => void,
) {
  const nativeMatch = String.prototype.match;
  const match = vi
    .spyOn(String.prototype, "match")
    .mockImplementation(function (this: string, candidate: RegExp) {
      if (String(this) === source && candidate === expression) {
        return result;
      }

      return nativeMatch.call(this, candidate);
    });

  try {
    run();
  } finally {
    match.mockRestore();
  }
}

describe("block-boundary edge cases", () => {
  it("keeps unfinished and unknown blocks open", () => {
    expect(findBlockBoundary("plain", "text", refs())).toMatchObject({ close: false });
    expect(findBlockBoundary("table row", "table", refs())).toMatchObject({ close: false });
    expect(findBlockBoundary("pending", "pending", refs())).toMatchObject({ close: false });
    expect(findBlockBoundary("```js\nopen", "code", refs())).toMatchObject({ close: false });
  });

  it("maps missing footnotes and holds unresolved reference links", () => {
    const state = refs();
    const result = findBlockBoundary("note [^x] and [label][target]", "text", state);
    expect(result.close).toBe(false);
    expect(state.mdExtra.get("[^x]")).toBe("[^x]: x");

    state.footnotes.set("[^x]", "known");
    findBlockBoundary("[^x] [^x]", "text", state);
    expect(state.mdExtra.size).toBe(1);
  });

  it("closes before a rule, fence interruption, and indented code", () => {
    expect(findBlockBoundary("paragraph\n\n---\n", "text", refs())).toMatchObject({
      close: true,
      mdNext: "",
    });
    expect(findBlockBoundary("paragraph\n```js", "text", refs())).toMatchObject({
      close: true,
      mdNext: "```js",
    });
    expect(findBlockBoundary("    code", "text", refs())).toMatchObject({ close: true });
  });

  it("distinguishes one and two newlines after a closing fence", () => {
    expect(findBlockBoundary("```js\ncode\n```\nnext", "code", refs())).toMatchObject({
      close: true,
      mdClose: "\n",
      mdNext: "next",
    });
    expect(findBlockBoundary("```js\ncode\n```\n\nnext", "code", refs())).toMatchObject({
      close: true,
      mdClose: "\n",
      mdNext: "\nnext",
    });
    expect(findBlockBoundary("```js\ncode\n```next", "code", refs())).toMatchObject({
      close: false,
    });
  });

  it("finds the end of indented code with and without a blank line", () => {
    expect(findBlockBoundary("    one\n    two\nplain", "code", refs())).toMatchObject({
      close: true,
      mdNext: "\nplain",
    });
    expect(findBlockBoundary("    one\n\nplain", "code", refs())).toMatchObject({
      close: true,
    });
    expect(findBlockBoundary("    one\n    two", "code", refs())).toMatchObject({
      close: false,
    });
  });

  it("keeps a buffer that opens with a fence whole", () => {
    // The blank line sits inside the fence, so there is no prose to close
    // before it: the whole buffer belongs to the block the fence started.
    const md = "```js\ncode\n\nmore\n```\n";
    expect(findBlockBoundary(md, "text", refs())).toMatchObject({
      close: false,
      md,
      mdClose: "",
      mdNext: "",
    });
  });

  it("ends a loose list before an indented fence or following prose", () => {
    expect(findBlockBoundary("- one\n\n  ```js", "text", refs())).toMatchObject({
      close: true,
      mdNext: "  ```js",
    });
    expect(findBlockBoundary("- one\n\nprose", "text", refs())).toMatchObject({
      close: true,
      mdNext: "prose",
    });
  });

  it("handles successful matches without optional index metadata", () => {
    withMatch("plain", patterns.hrCloseRegex, ["---\n"] as RegExpMatchArray, () => {
      expect(findBlockBoundary("plain", "text", refs())).toMatchObject({
        close: true,
        mdClose: "---\n",
      });
    });

    withMatch("plain", patterns.interuptRegex, ["\n```"] as RegExpMatchArray, () => {
      expect(findBlockBoundary("plain", "text", refs())).toMatchObject({
        close: true,
        mdClose: "\n",
      });
    });

    withMatch("plain", patterns.indentedCodeRegex, ["    "] as RegExpMatchArray, () => {
      expect(findBlockBoundary("plain", "text", refs())).toMatchObject({
        close: true,
        mdClose: "plai",
      });
    });
  });

  it("handles defensive fenced-match shapes", () => {
    withMatch("fake", patterns.fencedCloseRegex, ["fake"] as RegExpMatchArray, () => {
      expect(findBlockBoundary("fake", "code", refs())).toMatchObject({
        close: false,
      });
    });

    withMatch(
      "fake",
      patterns.fencedCloseRegex,
      ["fake", "capture"] as RegExpMatchArray,
      () => {
        expect(findBlockBoundary("fake", "code", refs())).toMatchObject({
          close: false,
        });
      },
    );
  });
});

describe("finished reasoning splitting", () => {
  it("falls back for unmatched tags and retains prose around matched tags", () => {
    expect(splitReasoning("")).toEqual([{ md: "", reasoning: false }]);
    expect(splitReasoning("before <think>unfinished")).toEqual([
      { md: "before <think>unfinished", reasoning: false },
    ]);
    expect(splitReasoning("before <think>inside</think> after")).toEqual([
      { md: "before ", reasoning: false },
      { md: "inside", reasoning: true },
      { md: " after", reasoning: false },
    ]);
  });
});
