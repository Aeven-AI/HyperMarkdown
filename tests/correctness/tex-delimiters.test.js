import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { katexPlugin } from "../../lib/plugins/math";
import Renderer from "../../lib/renderer";
import { parseMarkup } from "../helpers/render";

function documentOf(md) {
  const renderer = new Renderer({
    md,
    streaming: false,
    plugins: { math: katexPlugin() },
  });
  return parseMarkup(renderToStaticMarkup(renderer.render()));
}

describe("TeX delimiters", () => {
  it("renders inline and display TeX beside dollar math", () => {
    const doc = documentOf(
      [
        "Inline dollar $\\theta$ and backslash \\(\\frac{1}{5}\\).",
        "",
        "\\[\\frac{\\pi}{4} < \\theta < \\frac{\\pi}{2}\\]",
        "",
        "$$\\theta \\in \\left(\\frac{\\pi}{4}\\right). \\tag{1}$$",
      ].join("\n"),
    );

    expect(doc.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(4);
    expect(doc.querySelectorAll(".katex-display")).toHaveLength(2);
    expect(doc.querySelector(".katex-error")).toBeNull();
  });

  it("renders inline TeX inside a table cell", () => {
    const doc = documentOf(
      ["| Symbol | Value |", "| --- | --- |", "| $\\theta$ | \\(\\frac{1}{5}\\) |"].join("\n"),
    );

    expect(doc.querySelector("table .katex")).not.toBeNull();
  });

  it("lets a display block interrupt an open paragraph", () => {
    const doc = documentOf("text before\n\\[a + b\\]\ntext after");

    expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(doc.body.textContent).toContain("text before");
    expect(doc.body.textContent).toContain("text after");
  });

  it("leaves markdown's own bracket escape as literal text", () => {
    const doc = documentOf("\\[see notes\\] and \\\\[not math\\\\]");

    expect(doc.querySelector(".katex")).toBeNull();
    expect(doc.querySelector(".katex-error")).toBeNull();
    expect(doc.body.textContent).toContain("see notes");
  });

  it("keeps an escaped dollar out of math", () => {
    const doc = documentOf("costs \\$5 and \\$10 today");

    expect(doc.querySelector(".katex")).toBeNull();
    expect(doc.body.textContent).toContain("$5");
  });
});

describe("the same-line bracket heuristic", () => {
  // `\[` is markdown's escape for a literal bracket, so a one-line `\[…\]` is
  // only maths when its body says so. Multi-line and container forms are
  // unambiguous and close on their delimiters alone.
  it("takes a one-line block whose body carries maths syntax", () => {
    for (const source of ["\\[x^2 + y^2\\]", "\\[a = b\\]", "\\[\\frac{1}{5}\\]"]) {
      const doc = documentOf(source);
      expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
    }
  });

  it("leaves a one-line block of prose, JSON, or nothing as text", () => {
    for (const source of ["\\[see notes\\]", '\\[{"a": 1}\\]', "\\[   \\]"]) {
      const doc = documentOf(source);
      expect(doc.querySelector(".katex")).toBeNull();
      expect(doc.querySelector(".katex-error")).toBeNull();
    }
  });

  it("asks nothing of a block that spans lines, wherever it sits", () => {
    for (const source of [
      "\\[\nsee notes\n\\]",
      "> \\[\n> see notes\n> \\]",
      "- \\[\n  see notes\n  \\]",
    ]) {
      expect(documentOf(source).querySelectorAll(".katex-display")).toHaveLength(1);
    }
  });
});

describe("inline TeX edge cases", () => {
  it("treats an escaped backslash before the delimiter as text, not an escape of it", () => {
    // "\\\(x\)" is an escaped backslash followed by a real inline opener.
    const doc = documentOf(String.raw`\\\(x\)`);

    expect(doc.querySelectorAll(".katex")).toHaveLength(1);
    expect(doc.querySelector(".katex-error")).toBeNull();
  });

  it("carries an inline formula across a line ending", () => {
    const doc = documentOf("\\(\\frac{1}{5}\n+\\frac{1}{7}\\)");

    expect(doc.querySelectorAll(".katex")).toHaveLength(1);
    expect(doc.querySelector("annotation")?.textContent).toContain("\\frac{1}{7}");
  });

  it("keeps an escaped backslash inside the formula body", () => {
    const doc = documentOf("\\(a \\\\ b\\)");

    expect(doc.querySelectorAll(".katex")).toHaveLength(1);
  });

  it("leaves an unclosed inline opener as text", () => {
    const doc = documentOf("before \\(x + y");

    expect(doc.querySelector(".katex")).toBeNull();
    expect(doc.querySelector(".katex-error")).toBeNull();
    expect(doc.body.textContent).toContain("x + y");
  });

  it("reopens after a delimiter that turned out not to close", () => {
    const doc = documentOf("\\(a \\(b\\)");

    expect(doc.querySelectorAll(".katex")).toHaveLength(1);
    expect(doc.querySelector(".katex-error")).toBeNull();
  });

  it("leaves a lone backslash that opens nothing as text", () => {
    const doc = documentOf("a \\b c");

    expect(doc.querySelector(".katex")).toBeNull();
    expect(doc.body.textContent).toContain("c");
  });
});

describe("display TeX edge cases", () => {
  it("carries a display block across lines inside a list item", () => {
    const doc = documentOf("- \\[\n  \\frac{1}{5}\n  \\]");

    expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(doc.querySelector("li")).not.toBeNull();
  });

  it("leaves an unclosed display opener as text", () => {
    const doc = documentOf("\\[x");

    expect(doc.querySelector(".katex")).toBeNull();
    expect(doc.body.textContent).toContain("[x");
  });

  it("does not open a display block on a lone backslash-bracket-less run", () => {
    const doc = documentOf("\\{a\\}");

    expect(doc.querySelector(".katex")).toBeNull();
  });

  it("keeps a same-line dollar display block whole", () => {
    const doc = documentOf("$$a = b \\tag{1}$$");

    expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
  });

  it("does not treat a tripled dollar run as a same-line block", () => {
    const doc = documentOf("$$$a$$$");

    expect(doc.querySelector(".katex-error")).toBeNull();
  });
});

describe("display TeX inside containers", () => {
  it("abandons a block whose body opens another one", () => {
    // A second opener inside the body is ambiguous, so the construct gives the
    // block up rather than guessing which marker closes it. Both brackets then
    // render as the literal characters their backslashes escape.
    const doc = documentOf("\\[\na \\[ b\n\\]");

    expect(doc.querySelector(".katex")).toBeNull();
    expect(doc.querySelector(".katex-error")).toBeNull();
    expect(doc.body.textContent).toContain("a [ b");
  });

  it("keeps the block together under a list item's indentation", () => {
    const doc = documentOf("1. item\n\n   \\[\n   a = b\n   \\]\n");

    expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(doc.querySelector("li")).not.toBeNull();
  });

  it("keeps the block together inside a blockquote", () => {
    const doc = documentOf("> \\[\n> a = b\n> \\]");

    expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(doc.querySelector("blockquote")).not.toBeNull();
  });

  it("does not let a lazy blockquote line continue the block", () => {
    // The second line leaves the quote, so the block cannot run on into it.
    const doc = documentOf("> \\[\na = b\n\\]");

    expect(doc.querySelector(".katex-error")).toBeNull();
  });

  it("keeps a nested list item's deeper indentation", () => {
    const doc = documentOf("- outer\n  - inner\n\n    \\[\n    a = b\n    \\]\n");

    expect(doc.querySelector(".katex-error")).toBeNull();
  });
});

describe("indentation and dollar-marker paths", () => {
  it("keeps an indented display block together across its lines", () => {
    // Indented short of a code block, so the indentation is a line prefix the
    // construct has to carry onto each continuation line.
    const doc = documentOf("  \\[\n  a = b\n  \\]");

    expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(doc.querySelector(".katex-error")).toBeNull();
  });

  it("leaves a block whose body runs onto a second line to upstream display math", () => {
    // The same-line construct gives up at the line ending, so remark-math's own
    // fenced display block is what renders this.
    const doc = documentOf(["$$", "a = b", "$$"].join("\n"));

    expect(doc.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(doc.querySelector(".katex-error")).toBeNull();
  });

  it("contains a same-line block whose body runs past its line", () => {
    // The construct only spans one line, so a body that continues past it
    // cannot close. The failure stays inside that block.
    const doc = documentOf(["$$a", "b$$"].join("\n"));

    expect(doc.querySelectorAll(".katex-error")).toHaveLength(1);
  });

  it("contains a stray dollar inside a same-line block", () => {
    // One "$" cannot close a "$$" block, so it stays in the body. KaTeX has no
    // meaning for it, and the failure is confined to that block: the prose
    // around it still renders.
    const doc = documentOf("before $$a $ b$$ after");

    expect(doc.querySelectorAll(".katex-error")).toHaveLength(1);
    expect(doc.body.textContent).toContain("before");
    expect(doc.body.textContent).toContain("after");
  });

  it("keeps a single dollar inside a same-line dollar block as content", () => {
    // One "$" cannot close a "$$" block, so it stays part of the formula.
    const doc = documentOf("$$a + \\$ + b$$");

    expect(doc.querySelector(".katex-error")).toBeNull();
  });
});
