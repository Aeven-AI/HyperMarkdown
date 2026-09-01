import { describe, expect, it } from "vitest";

import { convertMath } from "../../lib/math-notation";
import { collectFencedRanges, repairTableSyntax } from "../../lib/repair/tables";
import { splitReasoning } from "../../lib/stream/find-block-boundary";

/**
 * Four scanners used to be regexes that re-read the buffer once per candidate
 * start. Each had an input — all of them ordinary-looking Markdown — that made
 * the cost quadratic, and the worst of them spent a minute on eight kilobytes.
 *
 * The inputs below are the witnesses CodeQL reported, at ten times the size.
 * The budget is deliberately loose: it is here to catch a return to quadratic
 * scanning, not to measure the machine.
 */
const BUDGET_MS = 1000;
const REPEATS = 20000;

function elapsed(run: () => void): number {
  const started = performance.now();
  run();
  return performance.now() - started;
}

describe("scanners stay linear on hostile input", () => {
  it("an unclosed bracket over blank lines", () => {
    const md = "[\n" + "\n ".repeat(REPEATS);

    expect(elapsed(() => convertMath(md))).toBeLessThan(BUDGET_MS);
  });

  it("a pipe-dense row that never completes a table", () => {
    const md = "|\n|" + "|".repeat(REPEATS);

    expect(elapsed(() => repairTableSyntax(md, "renderer", false))).toBeLessThan(
      BUDGET_MS,
    );
  });

  it("fences that never close", () => {
    const md = "```a\n".repeat(REPEATS);

    expect(elapsed(() => collectFencedRanges(md))).toBeLessThan(BUDGET_MS);
  });

  it("reasoning tags that never close", () => {
    const md = "<think ".repeat(REPEATS);

    expect(elapsed(() => splitReasoning(md))).toBeLessThan(BUDGET_MS);
  });

  it("still reads the documents those inputs imitate", () => {
    // The scanners replaced patterns whose exact quirks matter downstream, so
    // the shapes that pinned those quirks are kept here.
    expect(collectFencedRanges("```\n```")).toEqual([]);
    expect(collectFencedRanges("```\nx\n```")).toEqual([{ start: 0, end: 9 }]);
    expect(collectFencedRanges("```\r\nx\r\n```\r\n")).toEqual([]);
    expect(collectFencedRanges("  ```\nx\n```")).toEqual([]);
    expect(collectFencedRanges("  ```\nx\n  ```")).toEqual([
      { start: 0, end: 13 },
    ]);

    expect(splitReasoning("a<thinking>b</thinking>c")).toEqual([
      { md: "a", reasoning: false },
      { md: "b", reasoning: true },
      { md: "c", reasoning: false },
    ]);
    expect(splitReasoning("<think data-x='1'>b</think >")).toEqual([
      { md: "b", reasoning: true },
    ]);

    expect(convertMath("[\nx = y\n]")).toBe("\n$$\nx = y\n$$\n");
    expect(convertMath("[\n\n  x = y\n]")).toBe("\n$$\nx = y\n$$\n");
    expect(convertMath("[\n]")).toBe("[\n]");
  });
});
