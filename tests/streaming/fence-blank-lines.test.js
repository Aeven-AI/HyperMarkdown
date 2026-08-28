import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Renderer from "../../lib/renderer";

// A fence whose body is blank lines. The blank line is a paragraph separator in
// prose and content inside a fence; taking it as a separator consumes the
// opening marker, leaves the closing marker to be read as an opener, and
// renders the rest of the document as code. Whether a delta boundary lands in
// that window is what made it intermittent.
const EMPTY_FENCE = [
  "Empty fence:",
  "",
  "```",
  "",
  "",
  "```",
  "",
  "---",
  "",
  "## After",
  "",
  "Plain paragraph that must not be code.",
  "",
].join("\n");

function settled(doc, size) {
  const renderer = new Renderer({ streaming: true, animation: false });

  for (let index = 0; index < doc.length; index += size) {
    renderer.streamMd(doc.slice(index, index + size), true, false, false);
  }
  renderer.streamMd("", true, false, true);

  return renderToStaticMarkup(renderer.render());
}

function codeText(markup) {
  return (markup.match(/<pre\b[^>]*>[\s\S]*?<\/pre>/g) || []).join("");
}

describe("a fence whose body is blank lines", () => {
  it("keeps following prose out of the code block at every chunk size", () => {
    for (let size = 1; size <= 40; size += 1) {
      const markup = settled(EMPTY_FENCE, size);

      expect(codeText(markup)).not.toContain("Plain paragraph that must not be code");
    }
  });

  it("keeps the prose after the fence outside the code block", () => {
    // The sizes that used to split the fence, each checked for the shape the
    // split produced: a second code block, and the document swallowed into it.
    for (const size of [10, 11, 12, 21, 22, 23]) {
      const markup = settled(EMPTY_FENCE, size);

      expect((markup.match(/<pre\b/g) || []).length).toBe(1);
      expect(markup).toContain("After");
      expect(codeText(markup)).not.toContain("After");
    }
  });

});
