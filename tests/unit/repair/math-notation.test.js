// `convertMath` no longer rewrites the TeX delimiters themselves: `\(…\)`,
// `\[…\]` and a same-line `$$…$$` are recognised while parsing, by the math
// plugin's micromark extension, and are covered by
// tests/correctness/tex-delimiters.test.js. What is asserted here is the part
// that stays a source transform — notations that are not TeX, and the dollars
// that must be kept away from maths.

import { describe, expect, it } from "vitest";

import { convertMath } from "../../../lib/math-notation";

describe.each([
  ["null", null, undefined, null],
  ["undefined", undefined, undefined, undefined],
  [
    "double parentheses",
    "Solve (( x + 1 )) now",
    undefined,
    "Solve $x + 1$ now",
  ],
  ["padded parentheses", "Solve ( x + 1 ) now", undefined, "Solve $x + 1$ now"],
  [
    "existing inline math",
    "Already $x + 1$ here",
    undefined,
    "Already $x + 1$ here",
  ],
  [
    "placeholder dollars",
    "Literal $...$ here",
    undefined,
    "Literal \\$...\\$ here",
  ],
  ["empty dollars", "Literal $   $ here", undefined, "Literal \\$   \\$ here"],
  [
    "currency range",
    "$2000~$5000 dollars",
    undefined,
    "\\$2000~\\$5000 dollars",
  ],
  ["code block", "\\( x \\)", "code", "\\( x \\)"],
  [
    "inline code",
    "Use `fn( value )` here",
    undefined,
    "Use `fn( value )` here",
  ],
  ["link destination", "[docs]( /path )", undefined, "[docs]( /path )"],
  [
    "double-parenthesis link destination",
    "[docs](( /path ))",
    undefined,
    "[docs]($/path$)",
  ],
  [
    "left-sized double delimiter",
    "\\left(( value ))",
    undefined,
    "\\left($value$)",
  ],
  [
    "right-sized double delimiter",
    "(( value ))\\right",
    undefined,
    "($value$)\\right",
  ],
  [
    "left-sized padded delimiter",
    "\\bigl( value )",
    undefined,
    "\\bigl( value )",
  ],
  [
    "right-sized padded delimiter",
    "( value )\\bigr",
    undefined,
    "( value )\\bigr",
  ],
  ["raw HTML", "<span>( value )</span>", undefined, "<span>( value )</span>"],
  ["HTML comment", "<!-- ( value ) -->", undefined, "<!-- ( value ) -->"],
])("convertMath: %s", (_name, input, blockType, expected) => {
  it("normalizes only unprotected math notation", () => {
    expect(convertMath(input, blockType)).toBe(expected);
  });
});

describe("convertMath block notation", () => {
  it("converts bracketed multiline blocks", () => {
    expect(convertMath("[\nx + y\n]")).toBe("\n$$\nx + y\n$$\n");
  });

  it("converts a plain opener with an escaped closing bracket", () => {
    expect(convertMath("[\ne^x = \\frac{x^2}{2}\n\\]")).toBe(
      "\n$$\ne^x = \\frac{x^2}{2}\n$$\n",
    );
  });

  it("leaves non-math bracket blocks unchanged", () => {
    expect(convertMath("[\nplain prose\n]")).toBe("[\nplain prose\n]");
    expect(convertMath('[\n{ "a": 1 }\n]')).toBe('[\n{ "a": 1 }\n]');
    expect(convertMath("[\n1,\n2\n]")).toBe("[\n1,\n2\n]");
    expect(convertMath("[\n\n]")).toBe("[\n\n]");
  });
});
