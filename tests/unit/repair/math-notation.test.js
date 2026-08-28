import { describe, expect, it } from "vitest";

import { convertMath } from "../../../lib/math-notation";

describe.each([
  ["null", null, undefined, null],
  ["undefined", undefined, undefined, undefined],
  ["inline TeX", "Solve \\( x + 1 \\) now", undefined, "Solve $x + 1$ now"],
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
  it("converts TeX display delimiters on their own lines", () => {
    expect(convertMath("Before\n\\[\nx + y\n\\]\nAfter")).toBe(
      "Before\n\n$$\nx + y\n$$\n\nAfter",
    );
  });

  it("converts bracketed multiline blocks", () => {
    expect(convertMath("[\nx + y\n]")).toBe("\n$$\nx + y\n$$\n");
  });

  it("converts a plain opener with an escaped closing bracket", () => {
    expect(convertMath("[\ne^x = \\frac{x^2}{2}\n\\]")).toBe(
      "\n$$\ne^x = \\frac{x^2}{2}\n$$\n",
    );
  });

  it("converts TeX display delimiters written on one line", () => {
    // The form models emit most often. remark-math needs the fences on their
    // own lines, so the body is lifted onto one.
    expect(convertMath("Before\n\\[x^2 + y^2 = z^2\\]\nAfter")).toBe(
      "Before\n\n$$\nx^2 + y^2 = z^2\n$$\n\nAfter",
    );
    expect(convertMath("\\[E = mc^2\\]")).toBe("\n$$\nE = mc^2\n$$\n");
    expect(convertMath("  \\[ a^2 \\]  ")).toBe("\n$$\na^2\n$$\n");
  });

  it("leaves an escaped bracket that is not maths as written", () => {
    // "\\[" is markdown's escape for a literal bracket; only a body that reads
    // as maths is converted.
    expect(convertMath("\\[see notes\\]")).toBe("\\[see notes\\]");
    expect(convertMath("\\[TODO\\]")).toBe("\\[TODO\\]");
    expect(convertMath('\\[{ "a": 1 }\\]')).toBe('\\[{ "a": 1 }\\]');
  });

  it("leaves a one-line display fence alone inside a code block", () => {
    expect(convertMath("\\[x^2\\]", "code")).toBe("\\[x^2\\]");
  });

  it("does not convert a display fence sharing its line with prose", () => {
    // Mid-sentence it is far more likely to be an escaped bracket, and
    // remark-math would not read it as display maths there anyway.
    expect(convertMath("text \\[x^2\\] more")).toBe("text \\[x^2\\] more");
  });

  it("leaves non-math bracket blocks unchanged", () => {
    expect(convertMath("[\nplain prose\n]")).toBe("[\nplain prose\n]");
    expect(convertMath('[\n{ "a": 1 }\n]')).toBe('[\n{ "a": 1 }\n]');
    expect(convertMath("[\n1,\n2\n]")).toBe("[\n1,\n2\n]");
    expect(convertMath("[\n\n]")).toBe("[\n\n]");
  });
});
