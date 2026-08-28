import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Renderer from "../../lib/renderer";
import { parseMarkup } from "../helpers/render";

function codeContents(renderer) {
  const document = parseMarkup(renderToStaticMarkup(renderer.render()));

  return [...document.querySelectorAll("pre code")].map(
    (code) => code.textContent,
  );
}

function createRenderer() {
  return new Renderer({ streaming: true, animation: false });
}

describe("multiple blocks in one streaming delta", () => {
  it("renders every closed fence without waiting for another delta", () => {
    const renderer = createRenderer();
    const source = [
      "```cobol",
      "DISPLAY 'FIRST'",
      "```",
      "```",
      "second",
      "```",
      "```math",
      "third",
      "```",
      "",
    ].join("\n");

    renderer.streamMd(source, true, false, false);

    // A closed fence's content ends with its final newline, the way CommonMark
    // defines it; only the still-open tail below lacks one.
    expect(codeContents(renderer)).toEqual([
      "DISPLAY 'FIRST'\n",
      "second\n",
      "third\n",
    ]);
    expect(renderer.mdBuffer).toBe("");
  });

  it("retains an open tail and completes it without duplicating prior blocks", () => {
    const renderer = createRenderer();
    const source = [
      "```",
      "first",
      "```",
      "```unknown",
      "second",
      "```",
      "```text",
      "open tail",
    ].join("\n");

    renderer.streamMd(source, true, false, false);

    // Both closed fences come out of the one delta, and the unfinished third
    // renders too: what a delta shows must not depend on where its boundaries
    // happened to fall.
    expect(codeContents(renderer)).toEqual(["first\n", "second\n", "open tail"]);
    expect(renderer.mdBuffer).toBe("```text\nopen tail");

    renderer.streamMd("\n```\n", true, false, false);

    expect(codeContents(renderer)).toEqual(["first\n", "second\n", "open tail\n"]);
    expect(renderer.mdBuffer).toBe("");
  });
});
