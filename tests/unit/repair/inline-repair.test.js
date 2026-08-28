import { describe, expect, it } from "vitest";

import { patterns } from "../../../lib/patterns";

import { fixPartialEntity } from "../../../lib/repair/entities";
import { fixTrailingEscape } from "../../../lib/repair/escapes";
import {
  emphasisPairs,
  emphasisRuns,
  fixEmphasis,
  insideHtmlBlock,
} from "../../../lib/repair/emphasis";
import {
  createInlineCaches,
  fixInlineToken,
  fixInlineTokens,
  trimTrailingRun,
} from "../../../lib/repair/inline-tokens";
import {
  fixLinkRefs,
  findClosingParen,
  findOpenLink,
  findUnescaped,
  hasDefinition,
} from "../../../lib/repair/links";
import { fixPartialMarker } from "../../../lib/repair/list-markers";
import {
  findInlineClose,
  findOpenMath,
  fixMath,
} from "../../../lib/repair/math";
import { processInlineSyntax } from "../../../lib/repair/process-inline-syntax";
import { fixSetext } from "../../../lib/repair/setext";
import { fixTasklist } from "../../../lib/repair/task-lists";
import { bulletMarker, escapedMarker } from "../../../lib/repair/utils";

describe.each([
  ["balanced emphasis", "**bold** and *italic*", "**bold** and *italic*"],
  ["open emphasis", "**bold", "**bold**"],
  ["nested emphasis", "**_bold italic", "**_bold italic_**"],
  ["dangling emphasis", "text **", "text "],
  ["open code span", "use `code", "use `code`"],
  ["partial entity", "symbols &cop", "symbols "],
  ["partial link", "before [docs](https://exa", "before "],
  // The repair pass leaves a marker where the withheld formula will go;
  // `rehypeMathPending` is what turns it into the placeholder element, so that
  // it is chrome rather than markup in the source. See
  // tests/streaming/math-pending-marker.test.js.
  ["partial math", "before $x +", `before ${patterns.mathPendingMarker}`],
  ["nested marker", "- item\n-   -", "- item\n"],
  ["temporary table", "before | unfinished", "before "],
  [
    "partial table row",
    "| A | B |\n| :",
    "| | |\n| :--- | :--- |\n| A | B |",
    "table",
  ],
  ["code block unchanged", "```js\n**literal", "```js\n**literal", "code"],
])("processInlineSyntax: %s", (_name, input, expected, blockType = "text") => {
  it("produces stable markup for an incomplete frame", () => {
    expect(processInlineSyntax(input, blockType, true)).toBe(expected);
  });
});

describe("small repair primitives", () => {
  it("only strips partial entities from pending content", () => {
    expect(fixPartialEntity("A &cop", true)).toBe("A ");
    expect(fixPartialEntity("A &copy;", true)).toBe("A &copy;");
    expect(fixPartialEntity("A &cop", false)).toBe("A &cop");
  });

  it("removes an odd trailing escape and preserves an even run", () => {
    expect(fixTrailingEscape("", true)).toBe("");
    expect(fixTrailingEscape("line\\", false)).toBe("line\\");
    expect(fixTrailingEscape("line\\", true)).toBe("line");
    expect(fixTrailingEscape("line\\\\", true)).toBe("line\\\\");
    expect(fixTrailingEscape("line\\\n", true)).toBe("line\n");
  });

  it("withholds only unresolved trailing link syntax", () => {
    expect(fixLinkRefs("", true)).toBe("");
    expect(fixLinkRefs("[docs](https://exa", false)).toBe("[docs](https://exa");
    expect(fixLinkRefs("before [docs](https://exa", true)).toBe("before ");
    expect(fixLinkRefs("[docs](https://example.com)", true)).toBe(
      "[docs](https://example.com)",
    );
    expect(fixLinkRefs("`[not a link` [docs](https://exa", true)).toBe(
      "`[not a link` ",
    );
  });

  it("withholds only unresolved trailing math", () => {
    expect(fixMath("", true)).toBe("");
    expect(fixMath("before $x", false)).toBe("before $x");
    expect(fixMath("before \\(x", true)).toBe(
      `before ${patterns.mathPendingMarker}`,
    );
    expect(fixMath("before \\(x\\)", true)).toBe("before \\(x\\)");
    expect(fixMath("before $ x", true)).toBe("before $ x");
    expect(fixMath("`$protected` then $open", true)).toBe(
      `\`$protected\` then ${patterns.mathPendingMarker}`,
    );
  });

  it("drops only an incomplete list marker", () => {
    expect(fixPartialMarker("- item\n1.", true)).toBe("- item\n");
    expect(fixPartialMarker("12.", true)).toBe("");
    expect(fixPartialMarker("1234567", true)).toBe("1234567");
    expect(fixPartialMarker("1. item\n12", true)).toBe("1. item\n");
    expect(fixPartialMarker("- item\n1. next", true)).toBe("- item\n1. next");
    expect(fixPartialMarker("- item\n1.", false)).toBe("- item\n1.");
  });

  it("withholds a pending setext underline after prose", () => {
    expect(fixSetext("Heading\n-", true)).toBe("Heading\n");
    expect(fixSetext("Heading\ntext", true)).toBe("Heading\ntext");
    expect(fixSetext("Heading\n---", false)).toBe("Heading\n---");
    expect(fixSetext("Heading\n\n---", true)).toBe("Heading\n\n---");
  });

  it("removes a task marker until item content arrives", () => {
    expect(fixTasklist("- [x] ")).toBe("- ");
    expect(fixTasklist("- [x] done")).toBe("- [x] done");
  });
});

describe("link and math scanners", () => {
  it("finds balanced link destinations and escaped brackets", () => {
    expect(findClosingParen("one(two)three)", 0)).toBe(13);
    expect(findClosingParen("one\\)two", 0)).toBe(-1);
    expect(findUnescaped("a\\]b]", "]", 0)).toBe(4);
    expect(findUnescaped("a\\]b", "]", 0)).toBe(-1);
    expect(findOpenLink("[docs](https://example.com)", true, "")).toBe(-1);
    expect(findOpenLink("[docs](https://exa", true, "")).toBe(0);
  });

  it("classifies incomplete angle, image, inline, and reference links", () => {
    const definition = "[ref]: /guide\n[read][ref]";

    expect(findOpenLink("\\[literal", true, "")).toBe(-1);
    expect(findOpenLink("2 < 3", true, "")).toBe(-1);
    expect(findOpenLink("<https://exa", true, "")).toBe(0);
    expect(findOpenLink("<https://exa", false, "")).toBe(-1);
    expect(findOpenLink("<https://example.com>", true, "")).toBe(-1);
    expect(findOpenLink("![image", true, "")).toBe(0);
    expect(findOpenLink("[label", true, "")).toBe(0);
    expect(findOpenLink("[label]", true, "")).toBe(0);
    expect(findOpenLink("[label]", false, "")).toBe(-1);
    expect(findOpenLink("[read][ref", true, "")).toBe(0);
    expect(findOpenLink("[read][missing]", true, "")).toBe(0);
    expect(findOpenLink("[read][ref]", true, definition)).toBe(-1);
    expect(findOpenLink("[label] text", true, "")).toBe(-1);
  });

  it("requires a complete reference definition on an earlier line", () => {
    expect(hasDefinition("[docs]: /guide\n[read][docs]", "DOCS")).toBe(true);
    expect(hasDefinition("[docs]:\n[read][docs]", "docs")).toBe(false);
    expect(hasDefinition("[docs]: /guide", "docs")).toBe(false);
  });

  it("finds open math while respecting escaped closes and prose dollars", () => {
    expect(findOpenMath("before $x + 1")).toBe(7);
    expect(findOpenMath("before $x \\$ still")).toBe(7);
    expect(findOpenMath("cost $ 10")).toBe(-1);
    expect(findOpenMath("before \\[x")).toBe(7);
    expect(findOpenMath("before \\[x\\]")).toBe(-1);
    expect(findOpenMath("before \\x text")).toBe(-1);
    expect(findOpenMath("before $$x")).toBe(7);
    expect(findOpenMath("before $$x$$")).toBe(-1);
    expect(findOpenMath("before $x$")).toBe(-1);
    expect(findInlineClose("x \\$ y$", 0)).toBe(6);
    expect(findInlineClose("x \\$ y", 0)).toBe(-1);
  });
});

describe("emphasis delimiter primitives", () => {
  it("leaves raw HTML blocks untouched", () => {
    expect(fixEmphasis("<div>\n**literal")).toEqual({
      text: "<div>\n**literal",
      pending: [],
    });
    expect(insideHtmlBlock("paragraph\n\n<section> content")).toBe(true);
    expect(insideHtmlBlock("paragraph\nplain text")).toBe(false);
  });

  it("skips escaped, code-span, and bullet markers", () => {
    expect(emphasisRuns("\\*escaped\\* `*code*`\n* bullet")).toEqual([]);
  });

  it("describes opening, closing, and intraword runs", () => {
    const runs = emphasisRuns("*open close* snake_case_word");

    expect(runs).toHaveLength(4);
    expect(runs[0]).toMatchObject({ canOpen: true, canClose: false });
    expect(runs[1]).toMatchObject({ canOpen: false, canClose: true });
    expect(runs[2]).toMatchObject({ canOpen: false, canClose: false });
  });

  it("applies the CommonMark rule of three", () => {
    const neutral = { canBoth: false, length: 1 };
    const bothOne = { canBoth: true, length: 1 };
    const bothTwo = { canBoth: true, length: 2 };
    const bothThree = { canBoth: true, length: 3 };

    expect(emphasisPairs(neutral, neutral)).toBe(true);
    expect(emphasisPairs(bothOne, bothOne)).toBe(true);
    expect(emphasisPairs(bothOne, bothTwo)).toBe(false);
    expect(emphasisPairs(bothThree, bothThree)).toBe(true);
  });

  it("matches single and double-width closers", () => {
    expect(fixEmphasis("*text* tail").pending).toEqual([]);
    expect(fixEmphasis("**text** tail").pending).toEqual([]);
    expect(fixEmphasis("*one **two").pending.map((item) => item.token)).toEqual(
      ["*", "**"],
    );
    expect(fixEmphasis("*one _two* tail").pending).toEqual([]);
    expect(emphasisRuns("(*?)")).toHaveLength(1);
  });
});

describe("inline token primitives", () => {
  it("caches token patterns and classifies complete, open, and edge runs", () => {
    const caches = createInlineCaches();

    expect(fixInlineToken("~~done~~", "~~", caches).close).toBe(false);
    expect(fixInlineToken("~~open", "~~", caches)).toMatchObject({
      close: true,
      index: 0,
    });
    expect(fixInlineToken("~~", "~~", caches).text).toBe("");
    expect(fixInlineToken("* item", "*", caches).text).toBe("* item");
    expect(fixInlineToken("* ", "*", caches).text).toBe("* ");
    expect(caches.token.has("~~")).toBe(true);
  });

  it("ignores escaped and code-span tokens", () => {
    const caches = createInlineCaches();

    expect(fixInlineToken("\\~literal", "~", caches).close).toBe(false);
    expect(fixInlineToken("`~literal`", "~", caches).close).toBe(false);
  });

  it("uses the code-span repair for backticks", () => {
    expect(fixInlineToken("`open", "`", createInlineCaches()).close).toBe(true);
  });

  it("prevents a manufactured fence while pending tokens settle", () => {
    expect(trimTrailingRun("text~~~~", "~")).toBe("text");
    expect(fixInlineTokens("*_\n*", createInlineCaches())).toBe("*_\n");
    expect(fixInlineTokens("~~done~~\n~~**", createInlineCaches())).toBe(
      "~~done~~\n",
    );
    expect(
      processInlineSyntax("~~This text is deleted.~~\n~~**", "text", true),
    ).toBe("~~This text is deleted.~~\n");
  });
});

describe("marker classification", () => {
  it("counts odd and even backslash escapes", () => {
    expect(escapedMarker("\\*", 1)).toBe(true);
    expect(escapedMarker("\\\\*", 2)).toBe(false);
  });

  it("recognizes only line-leading bullet asterisks", () => {
    expect(bulletMarker("* item", 0)).toBe(true);
    expect(bulletMarker("  * item", 2)).toBe(true);
    expect(bulletMarker("text * item", 5)).toBe(false);
    expect(bulletMarker("*emphasis", 0)).toBe(false);
  });
});
