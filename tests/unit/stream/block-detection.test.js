import { describe, expect, it } from "vitest";

import { detectBlockType } from "../../../lib/stream/detect-block-type";

const cases = [
  ["empty input", "", false, "text"],
  ["ordinary prose", "hello", false, "text"],
  ["leading newline", "\nhello", false, "text"],
  ["incomplete thematic break", "paragraph\n--", false, "pending"],
  ["trailing newline", "hello\n", false, "pending"],
  ["final trailing newline", "hello\n", true, "text"],
  ["inline link at newline", "[docs](https://example.com)\n", false, "text"],
  ["incomplete backtick fence", "```", false, "pending"],
  ["open backtick fence", "```js\n", false, "code"],
  ["backtick fence with content", "```js\nconst value = 1", false, "code"],
  ["open tilde fence", "~~~js\n", false, "code"],
  ["indented code", "    const value = 1", false, "code"],
  ["one pipe", "left | right", false, "pending"],
  ["table row", "| left | right |", false, "table"],
  ["table row without outer pipes", "left | middle | right", false, "table"],
  ["table row at newline", "left | middle | right\n", false, "table"],
];

describe.each(cases)("detectBlockType: %s", (_name, input, finalize, expected) => {
  it(`returns ${expected}`, () => {
    expect(detectBlockType(input, finalize)).toBe(expected);
  });
});
