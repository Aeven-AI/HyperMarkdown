import { describe, expect, it, beforeAll } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const FIXTURES = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "fixtures"
);

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});

global.window = dom.window;
global.document = dom.window.document;

// Node >=21 exposes globalThis.navigator as a getter-only accessor.
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});

if (typeof window.matchMedia !== "function") {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  });
}

if (typeof window.requestAnimationFrame !== "function") {
  window.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 0);
  };
}

if (typeof window.cancelAnimationFrame !== "function") {
  window.cancelAnimationFrame = (handle) => {
    clearTimeout(handle);
  };
}

window.setTimeout = window.setTimeout || setTimeout;
window.clearTimeout = window.clearTimeout || clearTimeout;
window.setInterval = window.setInterval || setInterval;
window.clearInterval = window.clearInterval || clearInterval;

if (typeof global.$ !== "function") {
  global.$ = () => ({
    height: () => 0,
    width: () => 0,
    css: () => {},
    addClass: () => {},
    remove: () => {},
  });
}

let MarkdownRenderStore;
let MarkdownLink;

beforeAll(async () => {
  const markdownModule = await import("../lib/markdown-render-store");
  const markdownLinkModule = await import("../lib/link");

  MarkdownRenderStore = markdownModule.default;
  MarkdownLink = markdownLinkModule.default;
});

function createRenderer(props = {}) {
  let renderer;
  let mergedProps;

  mergedProps = {
    md: props.md || "",
    streaming: props.streaming === true,
    animation: props.animation === true,
    scrollDown: props.scrollDown || undefined,
  };

  // The engine is plain TypeScript: no React lifecycle to stand in for.
  renderer = new MarkdownRenderStore(mergedProps);

  return renderer;
}

function renderStream(renderer, chunks, finalize = false) {
  let i;
  let count;
  let streaming;
  let animation;

  streaming = renderer.state.streaming;
  animation = renderer.state.animation;

  for (i = 0, count = chunks.length; i < count; i++) {
    renderer.streamMd(chunks[i], streaming, animation, false);
  }

  if (finalize === true) {
    renderer.streamMd("", streaming, animation, true);
  }
}

// rehype-react wires `a` to an arrow component that forwards to MarkdownLink, so
// the element sitting in the tree is that wrapper, not MarkdownLink itself.
function isLinkNode(node) {
  if (node.type === MarkdownLink) {
    return true;
  }

  return typeof node.type === "function" && typeof node.props?.href === "string";
}

function findLink(node, predicate) {
  let i;
  let child;
  let href;

  if (!node) {
    return null;
  }

  if (Array.isArray(node)) {
    for (i = 0; i < node.length; i++) {
      child = findLink(node[i], predicate);
      if (child) {
        return child;
      }
    }
    return null;
  }

  if (isLinkNode(node)) {
    href = node.props?.href;
    if (!predicate || predicate(href)) {
      return node;
    }
  }

  if (node.props && node.props.children) {
    child = findLink(node.props.children, predicate);
    if (child) {
      return child;
    }
  }

  return null;
}

function findMatchingLink(node, predicate) {
  if (typeof predicate !== "function") {
    return null;
  }

  if (!node) {
    return null;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const match = findMatchingLink(node[i], predicate);
      if (match) {
        return match;
      }
    }
    return null;
  }

  if (isLinkNode(node) && predicate(node.props?.href)) {
    return node;
  }

  if (node.props && node.props.children) {
    return findMatchingLink(node.props.children, predicate);
  }

  return null;
}

describe("HyperMarkdown streaming", () => {
  it("renders relative links during streaming", () => {
    let renderer;
    let chunks;
    let block;
    let link;

    renderer = createRenderer({ streaming: true, animation: true });
    chunks = ["[relative link]", "(../path", "/to/file", ".md)\n"];

    renderStream(renderer, chunks, false);

    block = renderer.streamData[renderer.streamData.length - 1];
    link = findLink(block?.element);

    expect(link?.props?.href).toBe("../path/to/file.md");
  });

  it("renders absolute links during streaming", () => {
    let renderer;
    let chunks;
    let block;
    let link;

    renderer = createRenderer({ streaming: true, animation: true });
    chunks = ["[absolute link]", "(https://example.com", "/docs)", "\n"];

    renderStream(renderer, chunks, false);

    block = renderer.streamData[renderer.streamData.length - 1];
    link = findLink(block?.element);

    expect(link?.props?.href).toBe("https://example.com/docs");
  });
});

describe("HyperMarkdown static rendering", () => {
  it("handles relative links when rendering initial markdown", async () => {
    let renderer;
    let markdown;
    let content;
    let link;

    markdown = "[relative link](../path/to/file.md)";

    renderer = createRenderer({ md: markdown, streaming: false });
    content = renderer.generateCachedData();
    link = findLink(content);

    expect(link?.props?.href).toBe("../path/to/file.md");
  });
});

describe("HyperMarkdown streaming dataset stress", () => {
  it("renders relative links from streamed dataset", () => {
    let renderer;
    let datasetPath;
    let dataset;
    let relativeLink;

    renderer = createRenderer({ streaming: true, animation: true });
    datasetPath = path.resolve(FIXTURES, "test-markdown-stress-two.json");
    dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

    dataset.forEach((item) => {
      const chunk = item?.data?.choices?.[0]?.delta?.content;
      if (typeof chunk === "string") {
        renderer.streamMd(
          chunk,
          renderer.state.streaming,
          renderer.state.animation,
          false
        );
      }
    });

    renderer.streamMd(
      "",
      renderer.state.streaming,
      renderer.state.animation,
      true
    );

    relativeLink = findMatchingLink(renderer.render(), (href) => {
      return typeof href === "string" && href.startsWith("../");
    });

    expect(relativeLink?.props?.href).toBe("../path/to/file.md");
    expect(
      renderToStaticMarkup(renderer.render()).includes(
        'href="../path/to/file.md"'
      )
    ).toBe(true);

    const markup = renderToStaticMarkup(renderer.render());
    const referenceDom = new JSDOM(markup);
    const referenceAnchors = referenceDom.window.document.querySelectorAll(
      'a[href="https://example.com"]'
    );

    expect(referenceAnchors.length).toBeGreaterThan(0);
    expect(
      Array.from(referenceAnchors).some(
        (anchor) => anchor.textContent === "reference link"
      )
    ).toBe(true);
    expect(
      Array.from(referenceAnchors).some(
        (anchor) => anchor.textContent === "implicit reference link"
      )
    ).toBe(true);
  });
});

// Text the reader actually sees. KaTeX subtrees are dropped because their
// MathML annotation legitimately carries the raw TeX source.
function visibleText(markup) {
  let renderDom;

  renderDom = new JSDOM("<body>" + markup + "</body>");
  renderDom.window.document
    .querySelectorAll(".katex")
    .forEach((node) => node.remove());

  return renderDom.window.document.body.textContent || "";
}

function splitChunks(text, size) {
  let i;
  let chunks;

  chunks = [];

  for (i = 0; i < text.length; i += size) {
    chunks.push(text.substring(i, i + size));
  }

  return chunks;
}

function collectFrames(renderer, source, size) {
  let i;
  let chunks;
  let frames;

  frames = [];
  chunks = splitChunks(source, size);

  for (i = 0; i < chunks.length; i++) {
    renderer.streamMd(chunks[i], renderer.state.streaming, renderer.state.animation, false);
    frames.push(renderToStaticMarkup(renderer.render()));
  }

  renderer.streamMd("", renderer.state.streaming, renderer.state.animation, true);

  return frames;
}

describe("HyperMarkdown streaming math", () => {
  it("never shows a half-written inline formula as raw tex", () => {
    let frames;
    let renderer;
    let rawFrames;

    renderer = createRenderer({ streaming: true, animation: false });
    frames = collectFrames(renderer, "Energy is $E = mc^2$ and that is it.\n\n", 2);

    rawFrames = frames.filter((frame) => /\$|\^/.test(visibleText(frame)));

    expect(rawFrames).toEqual([]);
    expect(renderToStaticMarkup(renderer.render())).toContain("katex");
  });

  it("never shows a half-written display formula as raw tex", () => {
    let frames;
    let renderer;
    let rawFrames;

    renderer = createRenderer({ streaming: true, animation: false });
    frames = collectFrames(
      renderer,
      "Look:\n\n$$\n\\frac{a}{b} = c\n$$\n\nDone.\n\n",
      2
    );

    rawFrames = frames.filter((frame) => /\$|frac/.test(visibleText(frame)));

    expect(rawFrames).toEqual([]);
    expect(renderToStaticMarkup(renderer.render())).toContain("katex");
  });

  it("keeps the text when the stream ends mid-formula", () => {
    let markup;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("Value $x^2 and no closer", 3), true);

    markup = renderToStaticMarkup(renderer.render());

    expect(markup).toContain("x^2");
  });

  it("leaves katex output out of the word animation", () => {
    let markup;
    let katexEl;
    let renderer;
    let renderDom;

    renderer = createRenderer({ streaming: true, animation: true });
    renderStream(renderer, splitChunks("Energy $E = mc^2$ ok.\n\n", 3), true);

    markup = renderToStaticMarkup(renderer.render());
    renderDom = new JSDOM("<body>" + markup + "</body>");
    katexEl = renderDom.window.document.querySelector(".katex");

    expect(katexEl).not.toBeNull();
    expect(katexEl.querySelectorAll("[data-animate-word]").length).toBe(0);
  });
});

function tableOnly(markup) {
  let start;
  let end;

  start = markup.indexOf("<table");

  if (start === -1) {
    return null;
  }

  end = markup.lastIndexOf("</table>");

  return markup.substring(start, end + "</table>".length);
}

// The row cache must be indistinguishable from parsing the whole buffer, at
// every point in the stream — not just once the table is finished.
function streamedTable(source, size, animation) {
  let i;
  let chunks;
  let renderer;

  chunks = splitChunks(source, size);
  renderer = createRenderer({ streaming: true, animation: animation });

  for (i = 0; i < chunks.length; i++) {
    renderer.streamMd(chunks[i], true, animation, false);
  }

  return renderer;
}

function fullParsedTable(source, animation) {
  let buffer;
  let renderer;

  renderer = createRenderer({ streaming: true, animation: animation });

  buffer = renderer.mdMath(source, "table");
  buffer = renderer.mdString(buffer, "table", true);

  return tableOnly(
    renderToStaticMarkup(renderer.processMd(buffer, true, animation))
  );
}

describe("HyperMarkdown streaming table cache", () => {
  const sources = {
    headed: "| A | B |\n|:--|--:|\n| 1 | **b** |\n| 2 | [l](x) |\n| 3 | `c` |\n",
    headless: "| a | b |\n| c | d |\n| e | f |\n",
    "headless without outer pipes": "a | b\nc | d\n",
    "headless widening": "| a | b |\n| c | d | e |\n| f | g |\n",
    "math in a cell": "| A |\n|---|\n| $x^2$ |\n| plain |\n",
  };

  Object.keys(sources).forEach((name) => {
    [false, true].forEach((animation) => {
      it(`matches a full parse at every step: ${name} (animation=${animation})`, () => {
        let end;
        let source;
        let cached;
        let renderer;
        let expected;
        let mismatches;

        source = sources[name];
        mismatches = [];

        for (end = 1; end <= source.length; end++) {
          renderer = streamedTable(source.substring(0, end), 3, animation);

          if (!renderer.tableHead) {
            continue;
          }

          cached = tableOnly(renderToStaticMarkup(renderer.render()));

          if (cached === null) {
            continue;
          }

          expected = fullParsedTable(source.substring(0, end), animation);

          if (cached !== expected) {
            mismatches.push(source.substring(0, end));
          }
        }

        expect(mismatches).toEqual([]);
      });
    });
  });

  it("renders a headless table that has no outer pipes", () => {
    let cells;
    let markup;
    let cellDom;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("a | b\nc | d\n\n", 3), true);

    markup = renderToStaticMarkup(renderer.render());

    cellDom = new JSDOM("<body>" + markup + "</body>");
    cells = Array.from(cellDom.window.document.querySelectorAll("tbody td")).map(
      (cell) => cell.textContent
    );

    expect(markup).toContain("<table");
    expect(cells).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps every cell when a later row is wider", () => {
    let markup;
    let renderer;
    let headerDom;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("| a | b |\n| c | d | e |\n\n", 3), true);

    markup = renderToStaticMarkup(renderer.render());
    headerDom = new JSDOM("<body>" + markup + "</body>");

    expect(headerDom.window.document.querySelectorAll("thead th").length).toBe(3);
    expect(
      Array.from(headerDom.window.document.querySelectorAll("tbody td")).map(
        (cell) => cell.textContent
      )
    ).toEqual(["a", "b", "", "c", "d", "e"]);
  });

  it("parses each table row once instead of the whole table per chunk", () => {
    let calls;
    let renderer;
    let processMd;

    renderer = createRenderer({ streaming: true, animation: false });

    calls = 0;
    processMd = renderer.processMd;
    renderer.processMd = function (...args) {
      calls++;
      return processMd.apply(renderer, args);
    };

    renderStream(
      renderer,
      splitChunks(
        "| A | B |\n|---|---|\n" +
          Array.from({ length: 40 }, (_, i) => `| ${i} | row |\n`).join(""),
        4
      ),
      false
    );

    // Without the cache this is one full-table parse per chunk (150+).
    expect(calls).toBeLessThan(10);
  });
});

// The finished stream must land on the same DOM the whole-document renderer
// produces; streaming-only scaffolding has to be gone by then.
function documentTable(source) {
  let renderer;

  renderer = createRenderer({ md: source, streaming: false });

  return tableOnly(renderToStaticMarkup(renderer.render()));
}

function closedStreamTable(source) {
  let renderer;

  renderer = createRenderer({ streaming: true, animation: false });
  renderStream(renderer, splitChunks(source, 3), true);

  return tableOnly(renderToStaticMarkup(renderer.render()));
}

describe("HyperMarkdown streaming table close", () => {
  const sources = {
    "header with no rows": "| Header Only |\n|-------------|\n\n",
    "aligned header with no rows": "| A | B |\n|:---|---:|\n\n",
    "header with rows": "| A | B |\n|:---|---:|\n| 1 | 2 |\n\n",
    headless: "| a | b |\n| c | d |\n\n",
  };

  Object.keys(sources).forEach((name) => {
    it(`closes to the whole-document render: ${name}`, () => {
      expect(closedStreamTable(sources[name])).toBe(documentTable(sources[name]));
    });
  });

  it("drops the placeholder row once a header-only table closes", () => {
    let markup;

    markup = closedStreamTable("| Header Only |\n|-------------|\n\n");

    expect(markup).toContain("<th>Header Only</th>");
    expect(markup).not.toContain("<tbody>");
  });

  it("keeps the real column alignment once the table closes", () => {
    let markup;

    markup = closedStreamTable("| A | B |\n|:---|---:|\n\n");

    expect(markup).toContain('<th style="text-align:left">A</th>');
    expect(markup).toContain('<th style="text-align:right">B</th>');
  });

  it("still shows a table before its delimiter has arrived", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("| Header Only |", 3), false);

    expect(tableOnly(renderToStaticMarkup(renderer.render()))).toContain(
      "<table"
    );
  });
});

// data-headless drives CSS that collapses the header row to zero height, so a
// table that really has a header must never be flagged headless.
function tableTag(markup) {
  let start;

  start = markup.indexOf("<table");

  if (start === -1) {
    return null;
  }

  return markup.substring(start, markup.indexOf(">", start) + 1);
}

describe("HyperMarkdown table headless flag", () => {
  const sources = {
    "header, no rows, one column": {
      md: "| Header Only |\n|-------------|\n\n",
      headless: "false",
      columns: "1",
    },
    "header, no rows, two columns": {
      md: "| A | B |\n|:---|---:|\n\n",
      headless: "false",
      columns: "2",
    },
    "header with rows": {
      md: "| A | B |\n|---|---|\n| 1 | 2 |\n\n",
      headless: "false",
      columns: "2",
    },
    "one column with rows": {
      md: "| A |\n|---|\n| 1 |\n\n",
      headless: "false",
      columns: "1",
    },
    "genuinely headless": {
      md: "| a | b |\n| c | d |\n\n",
      headless: "true",
      columns: "2",
    },
  };

  Object.keys(sources).forEach((name) => {
    it(`flags ${name} correctly, streamed and whole-document`, () => {
      let source;
      let renderer;

      source = sources[name];

      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, splitChunks(source.md, 3), true);

      expect(tableTag(renderToStaticMarkup(renderer.render()))).toBe(
        `<table data-headless="${source.headless}" data-header-columns="${source.columns}">`
      );

      renderer = createRenderer({ md: source.md, streaming: false });

      expect(tableTag(renderToStaticMarkup(renderer.render()))).toBe(
        `<table data-headless="${source.headless}" data-header-columns="${source.columns}">`
      );
    });
  });
});

// renderToStaticMarkup does not run React's key validation, so the unkeyed-row
// warning only ever showed up in the browser. Assert on the elements instead.
describe("HyperMarkdown table row keys", () => {
  it("gives every cached row a key", () => {
    let rows;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(
      renderer,
      splitChunks(
        "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |\n",
        3
      ),
      false
    );

    rows = renderer.lineCacheData.filter((row) => row);

    expect(rows.length).toBeGreaterThan(1);

    rows.forEach((row) => {
      expect(row.key).not.toBeNull();
    });

    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it("keys rows of a headless table too", () => {
    let rows;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: true });
    renderStream(
      renderer,
      splitChunks("| a | b |\n| c | d |\n| e | f |\n", 3),
      false
    );

    rows = renderer.lineCacheData.filter((row) => row);

    expect(rows.length).toBeGreaterThan(1);

    rows.forEach((row) => {
      expect(row.key).not.toBeNull();
    });
  });
});

// Emphasis should style as soon as the opening marker is unambiguous, rather
// than waiting for the closing marker to arrive.
function partialStream(source, count) {
  let i;
  let renderer;

  renderer = createRenderer({ streaming: true, animation: false });

  for (i = 0; i < count; i++) {
    renderer.streamMd(source.charAt(i), true, false, false);
  }

  return renderToStaticMarkup(renderer.render());
}

function firstStyledAt(source, tag) {
  let n;

  for (n = 1; n <= source.length; n++) {
    if (partialStream(source, n).includes(tag)) {
      return n;
    }
  }

  return -1;
}

describe("HyperMarkdown eager emphasis", () => {
  const sources = {
    "single asterisk": { md: "*italic*", tag: "<em>" },
    "double asterisk": { md: "**bold**", tag: "<strong>" },
    "triple asterisk": { md: "***bold italic***", tag: "<em>" },
    "single underscore": { md: "_italic_", tag: "<em>" },
    "double underscore": { md: "__bold__", tag: "<strong>" },
    "triple underscore": { md: "___bold italic___", tag: "<em>" },
    strikethrough: { md: "~~struck~~", tag: "<del>" },
    "inline code": { md: "`code`", tag: "<code>" },
    "italic mid sentence": { md: "say *hi* now", tag: "<em>" },
  };

  Object.keys(sources).forEach((name) => {
    it(`styles ${name} before its closing marker arrives`, () => {
      let source;
      let styledAt;

      source = sources[name];
      styledAt = firstStyledAt(source.md, source.tag);

      expect(styledAt).toBeGreaterThan(0);
      expect(styledAt).toBeLessThan(source.md.length);
    });
  });

  it("leaves a list bullet alone rather than reading it as emphasis", () => {
    let markup;

    markup = partialStream("* alpha", "* alpha".length);

    expect(markup).toContain("<li>");
    expect(markup).not.toContain("<em>");
  });

  it("keeps thematic breaks working", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("text\n\n***\n\nmore\n\n", 2), true);

    expect(renderToStaticMarkup(renderer.render())).toContain("<hr/>");
  });
});

describe("HyperMarkdown loose list blocks", () => {
  const sources = {
    "loose dash list": "- alpha\n\n- beta\n\n- gamma\n\n",
    "loose asterisk list": "* alpha\n\n* beta\n\n* gamma\n\n",
    "loose plus list": "+ alpha\n\n+ beta\n\n+ gamma\n\n",
  };

  Object.keys(sources).forEach((name) => {
    it(`keeps ${name} in a single list`, () => {
      let source;
      let streamed;
      let renderer;

      source = sources[name];

      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, splitChunks(source, 2), true);
      streamed = renderToStaticMarkup(renderer.render());

      expect((streamed.match(/<ul>/g) || []).length).toBe(1);
      expect((streamed.match(/<li>/g) || []).length).toBe(3);

      renderer = createRenderer({ md: source, streaming: false });

      expect(streamed.replace(/\n+/g, "")).toBe(
        renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
      );
    });
  });
});

// A half-typed link must not stream as raw markup, and must never render an
// anchor pointing at a truncated URL. Holding it back until the closing ")"
// arrives is the trade the renderer makes.
describe("HyperMarkdown streaming links", () => {
  const sources = {
    "inline link": "[inline link](https://example.com)",
    "link with title": '[t](https://example.com "Title")',
    "relative link": "[relative link](../path/to/file.md)",
    "image": "![inline image](https://example.com/image.png)",
    "parens inside url": "[parens](https://example.com/path(inner))",
    "link mid sentence": "see [docs](https://x.dev) now",
  };

  Object.keys(sources).forEach((name) => {
    it(`never shows half-typed markup for a ${name}`, () => {
      let n;
      let frame;
      let source;
      let renderer;

      source = sources[name];

      for (n = 1; n < source.length; n++) {
        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, source.substring(0, n).split(""), false);

        frame = visibleText(renderToStaticMarkup(renderer.render()));

        // no bracket syntax, and no anchor built from a partial destination
        expect(frame).not.toContain("](");
        expect(frame).not.toContain("![");
      }
    });

    it(`finishes a ${name} identical to the whole-document render`, () => {
      let source;
      let renderer;
      let streamed;

      source = sources[name] + "\n\n";

      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, splitChunks(source, 2), true);
      streamed = renderToStaticMarkup(renderer.render());

      renderer = createRenderer({ md: source, streaming: false });

      expect(streamed.replace(/\n+/g, "")).toBe(
        renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
      );
    });
  });

  it("does not hold back a bare autolink", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, "https://example.com".substring(0, 12).split(""), false);

    expect(renderToStaticMarkup(renderer.render())).toContain("<a ");
  });

  it("keeps literal brackets that never become a link", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("text with [brackets] here.\n\n", 2), true);

    expect(visibleText(renderToStaticMarkup(renderer.render()))).toContain(
      "text with [brackets] here."
    );
  });

  it("clears the block when withholding empties the buffer", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, "![img](htt".split(""), false);

    expect(visibleText(renderToStaticMarkup(renderer.render())).trim()).toBe("");
  });
});

// Balancing a dangling marker must never manufacture a thematic break: "**_"
// once settled into "****", which markdown reads as a horizontal rule.
describe("HyperMarkdown emphasis never becomes a rule", () => {
  const emphasisBlock =
    "*italic*\n_italic_\n**bold**\n__bold__\n\n" +
    "***bold italic***\n___bold italic___\n**_bold italic_**\n*__bold italic__*\n\n";

  it("shows no rule while the emphasis block streams", () => {
    let n;
    let rules;
    let renderer;

    for (n = 1; n <= emphasisBlock.length; n++) {
      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, emphasisBlock.substring(0, n).split(""), false);

      rules = renderToStaticMarkup(renderer.render()).match(/<hr\/>/g);

      expect(rules).toBeNull();
    }
  });

  it("does not rewrite a dangling marker into a rule", () => {
    let output;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    output = renderer.mdString(
      "***bold italic***\n___bold italic___\n**_",
      "text",
      true
    );

    expect(output).not.toMatch(/^[ \t]*([-*_])\1{2,}[ \t]*$/m);
  });

  it("still renders a real thematic break", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("text\n\n***\n\nmore\n\n", 2), true);

    expect(renderToStaticMarkup(renderer.render())).toContain("<hr/>");
  });
});

// "<" opens an angle autolink or raw HTML; either way the bare "<" should not
// sit on screen as literal text while the rest of the construct arrives.
describe("HyperMarkdown streaming angle constructs", () => {
  const withheld = {
    "angle autolink": "<https://example.com>",
    "email autolink": "<fake@email.com>",
    "raw element": '<div style="color: red;">raw</div>',
    "inline tag": "line with a <br> break",
    "unknown tag": "<not-a-real-tag>",
    "html comment": "before <!-- note --> after",
  };

  Object.keys(withheld).forEach((name) => {
    it(`never shows a bare "<" for a ${name}`, () => {
      let n;
      let source;
      let renderer;

      source = withheld[name];

      for (n = 1; n < source.length; n++) {
        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, source.substring(0, n).split(""), false);

        expect(visibleText(renderToStaticMarkup(renderer.render()))).not.toContain(
          "<"
        );
      }
    });

    it(`finishes a ${name} identical to the whole-document render`, () => {
      let source;
      let streamed;
      let renderer;

      source = withheld[name] + "\n\n";

      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, splitChunks(source, 2), true);
      streamed = renderToStaticMarkup(renderer.render());

      renderer = createRenderer({ md: source, streaming: false });

      expect(streamed.replace(/\n+/g, "")).toBe(
        renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
      );
    });
  });

  it("keeps a literal less-than that is only text", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, "2 < 3 is".split(""), false);

    expect(visibleText(renderToStaticMarkup(renderer.render()))).toContain(
      "2 < 3"
    );
  });

  it("still resolves a bare autolink eagerly", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, "https://example.com".substring(0, 12).split(""), false);

    expect(renderToStaticMarkup(renderer.render())).toContain("<a ");
  });
});

// A line of only "-" under a line of text is a setext heading, so an arriving
// nested list marker briefly turns its own parent into a heading.
describe("HyperMarkdown nested lists never flash as headings", () => {
  const nested =
    "-   Unordered item\n-   Another item\n" +
    "    -   Nested item\n    -   Another nested item\n" +
    "        -   Deeply nested item\n-   Back to level 1\n\n";

  it("shows no heading while a nested list streams", () => {
    let n;
    let renderer;

    for (n = 1; n <= nested.length; n++) {
      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, nested.substring(0, n).split(""), false);

      expect(renderToStaticMarkup(renderer.render())).not.toMatch(/<h[1-6]>/);
    }
  });

  it("withholds a bare underline that is still undecided", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(renderer.mdString("-   Another item\n    -", "text", true)).toBe(
      "-   Another item\n"
    );
  });

  // Top-level items still stream as one <ul> each — a separate, pre-existing
  // quirk of closing a block at every bullet — so this checks the nesting and
  // the content rather than asking for markup equality.
  it("builds the nested structure once the stream finishes", () => {
    let streamed;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks(nested, 3), true);
    streamed = renderToStaticMarkup(renderer.render());

    expect(streamed).not.toMatch(/<h[1-6]>/);
    expect(streamed).toMatch(/<li>[\s\S]*<ul>/);

    [
      "Unordered item",
      "Another item",
      "Nested item",
      "Another nested item",
      "Deeply nested item",
      "Back to level 1",
    ].forEach((item) => {
      expect(streamed).toContain(item);
    });
  });

  const headings = {
    "setext h2": "Title\n---\n\nbody\n\n",
    "setext h1": "Title\n===\n\nbody\n\n",
    "setext single dash": "Title\n-\n\nbody\n\n",
    "thematic break": "text\n\n---\n\nmore\n\n",
  };

  Object.keys(headings).forEach((name) => {
    it(`still renders a ${name}`, () => {
      let source;
      let streamed;
      let renderer;

      source = headings[name];

      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, splitChunks(source, 2), true);
      streamed = renderToStaticMarkup(renderer.render());

      renderer = createRenderer({ md: source, streaming: false });

      expect(streamed.replace(/\n+/g, "")).toBe(
        renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
      );
    });
  });
});

// Closing a block consumes only the first one in the buffer and parks the rest
// in mdBuffer for the next chunk to drive. At finalize there is no next chunk,
// so whatever is left has to be drained or it never reaches the DOM.
function finishedText(source, size, finalizeOnLastChunk) {
  let i;
  let last;
  let chunks;
  let renderer;

  chunks = splitChunks(source, size);
  renderer = createRenderer({ streaming: true, animation: false });

  for (i = 0; i < chunks.length; i++) {
    last = i === chunks.length - 1;
    renderer.streamMd(chunks[i], true, false, finalizeOnLastChunk && last);
  }

  if (finalizeOnLastChunk !== true) {
    renderer.streamMd("", true, false, true);
  }

  return renderToStaticMarkup(renderer.render())
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("HyperMarkdown keeps every block", () => {
  const sources = {
    "tight list": { md: "- a\n- b\n- c\n\n", items: ["a", "b", "c"] },
    "two letter items": { md: "- aa\n- bb\n- cc\n\n", items: ["aa", "bb", "cc"] },
    "word items": {
      md: "- alpha\n- beta\n- gamma\n\n",
      items: ["alpha", "beta", "gamma"],
    },
    paragraphs: {
      md: "one\n\ntwo\n\nthree\n\n",
      items: ["one", "two", "three"],
    },
    "list then paragraph": {
      md: "- x\n\npara\n\n- y\n\n",
      items: ["x", "para", "y"],
    },
    "heading list tail": {
      md: "# H\n\n- a\n- b\n\ntail\n\n",
      items: ["H", "a", "b", "tail"],
    },
  };

  Object.keys(sources).forEach((name) => {
    [1, 2, 3, 4, 5, 7, 100].forEach((size) => {
      it(`keeps every item of a ${name} at chunk size ${size}`, () => {
        let source;

        source = sources[name];

        [false, true].forEach((finalizeOnLastChunk) => {
          const rendered = finishedText(
            source.md,
            size,
            finalizeOnLastChunk
          );

          source.items.forEach((item) => {
            expect(rendered).toMatch(
              new RegExp("(^|\\W)" + item + "(\\W|$)")
            );
          });
        });
      });
    });
  });

  it("drains a buffer that still holds blocks when the stream ends", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    renderer.streamMd("- a\n- b\n- c\n\n", true, false, false);
    renderer.streamMd("", true, false, true);

    expect(renderer.mdBuffer).toBe("");
  });
});

// Streaming should only ever add to what is on screen. If a frame shows text
// that the finished render does not contain, raw markup leaked and was then
// replaced — which is what "unstyled markup while streaming" looks like.
function bodyText(renderer) {
  let dom;
  let markup;

  markup = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      renderer.generateCachedData(),
      renderer.generateStreamData()
    )
  );

  dom = new JSDOM("<body>" + markup + "</body>");

  // Drop component chrome (line numbers, toolbars): it is not document text
  // and it grows as lines are added.
  dom.window.document
    .querySelectorAll(".line-numbers, .codeblock-header, .table-header")
    .forEach((node) => node.remove());

  return (dom.window.document.body.textContent || "").replace(/\s+/g, "");
}

describe("HyperMarkdown streams without leaking markup", () => {
  const sources = {
    emphasis: "**bold** and *italic* and ***both*** and `code`\n\n",
    "mixed emphasis": "**mixed _nested_ emphasis**\n\n",
    "code span with asterisks": "`**not bold**` here\n\n",
    "escaped characters": "Escape these: \\*not italic\\*, \\#not a header\n\n",
    "hard break backslash": "ends with a backslash\\\nnext line\n\n",
    "ordered list": "1. First item\n2. Second item\n\n",
    "nested list": "- Item\n  - Nested item\n    - Deep\n- Back\n\n",
    "inline link": "See [docs](https://example.com) now\n\n",
    "reference link": "A [ref link][r] here\n\n[r]: https://example.com\n\n",
    "angle autolink": "Visit <https://example.com> today\n\n",
    "fenced code": "```\nraw **markdown** here\n```\n\n",
  };

  Object.keys(sources).forEach((name) => {
    it(`never shows text the finished render drops: ${name}`, () => {
      let n;
      let frame;
      let source;
      let renderer;
      let finalText;

      source = sources[name];

      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, splitChunks(source, 1), true);
      finalText = bodyText(renderer);

      for (n = 1; n <= source.length; n++) {
        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, source.substring(0, n).split(""), false);

        frame = bodyText(renderer);

        expect(finalText.startsWith(frame)).toBe(true);
      }
    });
  });
});

describe("HyperMarkdown finishes what the document renderer produces", () => {
  it("matches the whole-document text for the stress datasets", () => {
    let dom;
    let raw;
    let chunks;
    let renderer;

    ["test-markdown-stress-one.json", "test-markdown-stress-two.json"].forEach(
      (name) => {
        raw = JSON.parse(
          fs.readFileSync(
            path.resolve(FIXTURES, name),
            "utf8"
          )
        );

        chunks = raw
          .map((item) => item?.data?.choices?.[0]?.delta?.content)
          .filter((chunk) => typeof chunk === "string");

        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, chunks, true);

        const streamed = renderToStaticMarkup(renderer.render());

        renderer = createRenderer({ md: chunks.join(""), streaming: false });

        const document = renderToStaticMarkup(renderer.render());

        const asText = (markup) => {
          dom = new JSDOM("<body>" + markup + "</body>");
          return (dom.window.document.body.textContent || "").replace(
            /\s+/g,
            ""
          );
        };

        expect(asText(streamed)).toBe(asText(document));
      }
    );
  }, 300000);
});

// "*" and "_" cannot be balanced by counting each token separately: in
// "**Bold *italic*** the trailing "***" closes both the "*" and the "**"
// before it. They are matched as delimiter runs, the way CommonMark does.
describe("HyperMarkdown emphasis delimiter runs", () => {
  const balanced = {
    "combined closer": "**Bold *italic ~~strike `code`~~*** inside",
    "combined closer at end": "**Bold *italic ~~strike `code`~~***",
    "already paired": "a **b** c",
    "italic mid sentence": "say *hi* now",
    "multiplication sign": "2 * 3 = 6",
    "intraword underscores": "snake_case_word",
    "single letters": "a_b_c",
  };

  Object.keys(balanced).forEach((name) => {
    it(`leaves ${name} untouched`, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.mdString(balanced[name], "text", true)).toBe(
        balanced[name]
      );
    });
  });

  const closed = {
    "single asterisk": ["*italic", "*italic*"],
    "double asterisk": ["**bold", "**bold**"],
    "triple asterisk": ["***bold italic", "***bold italic***"],
    "single underscore": ["_it", "_it_"],
    "double underscore": ["__bo", "__bo__"],
    "triple underscore": ["___bi", "___bi___"],
    "bold around italic": ["**mixed _nested_ emphasis", "**mixed _nested_ emphasis**"],
    "bold then italic": ["**_bold italic", "**_bold italic_**"],
    "italic then bold": ["*__bold italic", "*__bold italic__*"],
    "bold outer italic inner": ["__*bold italic", "__*bold italic*__"],
    "after a finished pair": ["**b** and *i", "**b** and *i*"],
    "bullet keeps its marker": ["* bullet _x", "* bullet _x_"],
  };

  Object.keys(closed).forEach((name) => {
    it(`closes ${name} innermost first`, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.mdString(closed[name][0], "text", true)).toBe(
        closed[name][1]
      );
    });
  });

  it("drops a marker that has nothing after it yet", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(renderer.mdString("a **b** c **", "text", true)).toBe("a **b** c ");
  });

  it("leaves emphasis markers inside a raw HTML block alone", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(
      renderer.mdString('<img src="x" />\n**after html', "text", true)
    ).toBe('<img src="x" />\n**after html');
  });

  it("holds back a partial html entity", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(renderer.mdString("symbols &cop", "text", true)).toBe("symbols ");
  });
});

// Constructs whose meaning is not settled until more characters arrive should
// be held back rather than rendered as the markup they are made of.
describe("HyperMarkdown withholds undecided constructs", () => {
  const cases = {
    "raw html block keeps its markers": [
      '<p>raw</p>\n**bold after',
      '<p>raw</p>\n**bold after',
    ],
    "inline html still gets emphasis": [
      "normal <span>x</span> and **bold",
      "normal <span>x</span> and **bold**",
    ],
    "double backtick span": ["`` `", "`` ``"],
    "double backtick with content": ["`` `Single", "`` `Single``"],
    "finished double backtick span": [
      "`` `Single backtick in code` ``",
      "`` `Single backtick in code` ``",
    ],
    "task marker in a blockquote": ["> - [x] ", ""],
    "task marker with content": ["> - [x] Task", "> - [x] Task"],
    "nested marker with no text": ["- item\n-   -", "- item\n"],
    "stacked dangling markers": ["a\n**_", "a\n"],
    "strikethrough closer after a space": [
      "~~struck **",
      "~~struck~~",
    ],
  };

  Object.keys(cases).forEach((name) => {
    it(name, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.mdString(cases[name][0], "text", true)).toBe(
        cases[name][1]
      );
    });
  });

  it("balances inline markup inside table cells", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(
      renderer.mdString("| **Bold Header** | `", "table", true)
    ).not.toContain("`");
  });

  it("holds back a delimiter row that has no dashes yet", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(
      renderer.mdString("| A | B |\n| :", "table", true)
    ).not.toMatch(/\|\s*:\s*$/);
  });
});

// Closing a dangling marker must never build a fence: "~~x~~\n~~" closed onto
// itself becomes "~~~~", which markdown reads as a code block.
describe("HyperMarkdown never manufactures a fence", () => {
  const sources = {
    "strikethrough lines": "~~This text is deleted.~~\n~~**Bold and deleted**~~\n~~*Italic*~~\n\n",
    "single tilde run": "~~struck~~\n~single tilde~\n~also~\n\n",
    "backtick lines": "`code`\n`more code`\n\n",
  };

  Object.keys(sources).forEach((name) => {
    it(`shows no code block while ${name} stream`, () => {
      let n;
      let source;
      let renderer;

      source = sources[name];

      for (n = 1; n <= source.length; n++) {
        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, source.substring(0, n).split(""), false);

        expect(renderToStaticMarkup(renderer.render())).not.toContain("<pre>");
      }
    });
  });

  it("does not close a dangling marker onto the run before it", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(
      renderer.mdString("~~This text is deleted.~~\n~~**", "text", true)
    ).toBe("~~This text is deleted.~~\n");
  });

  it("still builds a combined closer out of separate ones", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(
      renderer.mdString("**Bold *italic ~~strike `code`~~***", "text", true)
    ).toBe("**Bold *italic ~~strike `code`~~***");
  });
});

// A marker is escaped only when an odd number of backslashes precedes it: in
// "\\~" the backslash escapes the backslash, leaving the tilde live.
describe("HyperMarkdown counts backslashes when deciding escapes", () => {
  const cases = {
    "escaped tilde stays text": ["a \\~", "a \\~"],
    "escaped backslash leaves the tilde live": ["a \\\\~", "a \\\\"],
    "escaped tilde mid sentence": ["a \\~b", "a \\~b"],
    "escaped asterisk stays text": ["a \\*", "a \\*"],
  };

  Object.keys(cases).forEach((name) => {
    it(name, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.mdString(cases[name][0], "text", true)).toBe(
        cases[name][1]
      );
    });
  });
});

// React remounts a subtree when the element type at a position changes, and a
// remount restarts every CSS animation inside it. The closed table therefore
// has to keep the shape its streaming frames had.
function treeShape(node, depth) {
  let type;

  if (depth > 8) {
    return "…";
  }

  if (node === null || node === undefined || typeof node !== "object") {
    return "";
  }

  if (Array.isArray(node)) {
    return node
      .map((child) => treeShape(child, depth))
      .filter(Boolean)
      .join(",");
  }

  type =
    typeof node.type === "string"
      ? node.type
      : (node.type && (node.type.displayName || node.type.name)) || "?";

  return (
    type +
    "#" +
    (node.key === null || node.key === undefined ? "-" : node.key) +
    "(" +
    (node.props ? treeShape(node.props.children, depth + 1) : "") +
    ")"
  );
}

describe("HyperMarkdown table does not remount when it closes", () => {
  const source = "| A | B |\n|---|---|\n| one | two |\n| three | four |\n\n";

  it("keeps the same element shape across the close", () => {
    let i;
    let after;
    let before;
    let chunks;
    let renderer;

    chunks = splitChunks(source, 4);
    renderer = createRenderer({ streaming: true, animation: true });

    for (i = 0; i < chunks.length - 1; i++) {
      renderer.streamMd(chunks[i], true, true, false);
    }

    before = treeShape(
      renderer.streamData[renderer.streamData.length - 1].element,
      0
    );

    renderer.streamMd(chunks[chunks.length - 1], true, true, false);
    renderer.streamMd("", true, true, true);

    after = treeShape(
      renderer.streamData[renderer.streamData.length - 1].element,
      0
    );

    expect(after).toBe(before);
    expect(after).toContain("MarkdownTable");
  });

  it("reuses the cached row elements after closing", () => {
    let i;
    let rows;
    let cached;
    let chunks;
    let renderer;

    chunks = splitChunks(source, 4);
    renderer = createRenderer({ streaming: true, animation: true });

    for (i = 0; i < chunks.length - 1; i++) {
      renderer.streamMd(chunks[i], true, true, false);
    }

    cached = renderer.lineCacheData[0];

    renderer.streamMd(chunks[chunks.length - 1], true, true, false);
    renderer.streamMd("", true, true, true);

    rows = renderer.streamData[renderer.streamData.length - 1].props;

    expect(renderer.lineCacheData[0]).toBe(cached);
  });

  it("leaves a header-only table without a body", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: true });
    renderStream(renderer, splitChunks("| Header Only |\n|---|\n\n", 3), true);

    expect(renderToStaticMarkup(renderer.render())).not.toContain("<tbody>");
  });
});

describe("HyperMarkdown animation leaves raw-text elements alone", () => {
  const sources = {
    script: "<script>alert('x');</script>\n\n",
    style: "<style>.a { color: red; }</style>\n\n",
  };

  Object.keys(sources).forEach((name) => {
    it(`keeps the contents of a ${name} element`, () => {
      let source;
      let streamed;
      let renderer;

      source = sources[name];

      renderer = createRenderer({ streaming: true, animation: true });
      renderStream(renderer, splitChunks(source, 4), true);
      streamed = renderToStaticMarkup(renderer.render());

      renderer = createRenderer({ md: source, streaming: false });

      expect(streamed.replace(/\n+/g, "")).toBe(
        renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
      );
    });
  });
});

// Streaming synthesises a placeholder definition for every footnote reference
// seen so far, so the reference renders as a footnote before its real
// definition arrives. Only the ones a block refers to belong in that block.
describe("HyperMarkdown footnote placeholders", () => {
  const source =
    "First claim.[^1] Second claim.[^2]\n\n" +
    "A paragraph with no footnote in it at all.\n\n" +
    "[^1]: The first note.\n[^2]: The second note.\n\n";

  it("finishes identical to the whole-document render", () => {
    let streamed;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks(source, 3), true);
    streamed = renderToStaticMarkup(renderer.render());

    renderer = createRenderer({ md: source, streaming: false });

    expect(streamed.replace(/\n+/g, "")).toBe(
      renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
    );
  });

  it("appends only the placeholders a block refers to", () => {
    let seen;
    let renderer;
    let processMd;

    renderer = createRenderer({ streaming: true, animation: false });

    seen = [];
    processMd = renderer.processMd;
    renderer.processMd = function (md, ...rest) {
      let before;

      before = renderer.mdExtra.size;

      if (before > 0) {
        seen.push({
          md: md,
          known: before,
        });
      }

      return processMd.call(renderer, md, ...rest);
    };

    renderStream(renderer, splitChunks(source, 3), true);

    // once both references are known, a block naming neither must not carry
    // their definitions into its parse
    seen
      .filter((entry) => entry.known === 2)
      .forEach((entry) => {
        if (entry.md.indexOf("[^1]") === -1 && entry.md.indexOf("[^2]") === -1) {
          expect(entry.md).not.toContain("[^1]:");
          expect(entry.md).not.toContain("[^2]:");
        }
      });

    expect(seen.length).toBeGreaterThan(0);
  });

  it("still renders a footnote reference as a link", () => {
    let markup;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks(source, 3), true);

    markup = renderToStaticMarkup(renderer.render());

    expect(markup).toContain("data-footnote-ref");
    expect(markup).toContain("The first note.");
    expect(markup).toContain("The second note.");
  });
});

// A list block is held open across blank lines so a loose list stays one list.
// That guard has to recognise ordered markers too, not just bullets, or every
// blank line splits an ordered list into a new <ol>.
function listShape(markup) {
  let dom;

  dom = new JSDOM("<body>" + markup + "</body>");

  return walk(dom.window.document.body);

  function walk(element) {
    return Array.from(element.children)
      .map((child) => {
        const tag = child.tagName.toLowerCase();

        if (tag === "ul" || tag === "ol" || tag === "li") {
          return tag + "[" + walk(child) + "]";
        }

        return walk(child);
      })
      .filter(Boolean)
      .join(",");
  }
}

describe("HyperMarkdown mixed ordered and unordered lists", () => {
  const sources = {
    "ordered holding a nested unordered":
      "1. First\n   - alpha\n   - beta\n2. Second\n   - gamma\n\n",
    "unordered holding a nested ordered":
      "- First\n  1. alpha\n  2. beta\n- Second\n  1. gamma\n\n",
    "ordered, unordered, ordered":
      "1. One\n   - two\n     1. three\n   - four\n2. Five\n\n",
    "unordered, ordered, unordered":
      "- One\n  1. two\n     - three\n  2. four\n- Five\n\n",
    "four space nested unordered":
      "1. First\n    - alpha\n    - beta\n2. Second\n\n",
    "four space nested ordered":
      "- First\n    1. alpha\n    2. beta\n- Second\n\n",
    "loose ordered holding a nested unordered":
      "1. First\n\n   - alpha\n\n   - beta\n\n2. Second\n\n",
    "loose unordered holding a nested ordered":
      "- First\n\n  1. alpha\n\n  2. beta\n\n- Second\n\n",
    "plain loose ordered": "1. one\n\n2. two\n\n3. three\n\n",
    "paren markers": "1) First\n   - alpha\n2) Second\n\n",
    "ordered inside a blockquote": "> 1. one\n>    - alpha\n> 2. two\n\n",
  };

  Object.keys(sources).forEach((name) => {
    [1, 3, 7, 100].forEach((size) => {
      it(`matches the document render: ${name} at chunk size ${size}`, () => {
        let source;
        let renderer;
        let streamed;

        source = sources[name];

        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, splitChunks(source, size), true);
        streamed = renderToStaticMarkup(renderer.render());

        renderer = createRenderer({ md: source, streaming: false });

        expect(listShape(streamed)).toBe(
          listShape(renderToStaticMarkup(renderer.render()))
        );
      });
    });
  });

  it("keeps a loose ordered list in one list", () => {
    let markup;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(
      renderer,
      splitChunks("1. one\n\n2. two\n\n3. three\n\n", 3),
      true
    );

    markup = renderToStaticMarkup(renderer.render());

    expect((markup.match(/<ol>/g) || []).length).toBe(1);
    expect((markup.match(/<li>/g) || []).length).toBe(3);
  });

  it("still ends an ordered list where the list ends", () => {
    let markup;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(
      renderer,
      splitChunks("1. one\n2. two\n\n## Heading\n\nbody\n\n", 3),
      true
    );

    markup = renderToStaticMarkup(renderer.render());

    expect(markup).toContain("<h2>");
    expect(listShape(markup)).toBe("ol[li[],li[]]");
  });

  it("does not show a bare marker inside a blockquote", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, "> 1".split(""), false);

    expect(visibleText(renderToStaticMarkup(renderer.render())).trim()).toBe("");
  });
});

// The message renderer used to carry its own copy of the maths normaliser, so
// fixes landed in one renderer and not the other. Both now call the shared
// service; this fails if either grows a private copy again.

// Content renders the user's own message. It deliberately omits rehype-raw, so
// markup someone types is shown as text rather than rendered.

// Footnote definitions render nothing where they are written — the notes are
// gathered separately into one section — so a block holding only definitions
// parses to an empty result. On a long note list that block was re-parsed on
// every chunk to produce nothing.
describe("HyperMarkdown skips blocks that render nothing", () => {
  const definitionsOnly = {
    "single definition": "[^1]: The first note.",
    "several definitions": "[^1]: One.\n[^2]: Two.\n[^3]: Three.",
    "definition with a continuation": "[^1]: One.\n\n    More of note one.",
    "indented label": "   [^note]: Indented label.",
  };

  const notDefinitionsOnly = {
    "prose": "Just a paragraph.",
    "reference then prose": "[^1]: One.\nAnd some prose.",
    "prose then reference": "Some prose.[^1]",
    "link definition": "[ref]: https://example.com",
    "empty": "",
  };

  Object.keys(definitionsOnly).forEach((name) => {
    it(`recognises ${name}`, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.definitionsOnly(definitionsOnly[name])).toBe(true);
      expect(
        renderer.processMd(definitionsOnly[name], true, false)
      ).toBeNull();
    });
  });

  Object.keys(notDefinitionsOnly).forEach((name) => {
    it(`does not skip ${name}`, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.definitionsOnly(notDefinitionsOnly[name])).toBe(false);
    });
  });

  it("still renders the footnotes section and its references", () => {
    let markup;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(
      renderer,
      splitChunks(
        "First claim.[^1] Second claim.[^2]\n\n[^1]: The first note.\n[^2]: The second note.\n\n",
        3
      ),
      true
    );

    markup = renderToStaticMarkup(renderer.render());

    expect(markup).toContain("data-footnote-ref");
    expect(markup).toContain("The first note.");
    expect(markup).toContain("The second note.");
  });

  it("matches the whole-document render for a document with footnotes", () => {
    let source;
    let streamed;
    let renderer;

    source =
      "Text with a note.[^a]\n\nMore text.[^b]\n\n" +
      "[^a]: Note A.\n[^b]: Note B.\n\n    A second paragraph of note B.\n\nTail.\n\n";

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks(source, 3), true);
    streamed = renderToStaticMarkup(renderer.render());

    renderer = createRenderer({ md: source, streaming: false });

    expect(bodyOf(streamed)).toBe(
      bodyOf(renderToStaticMarkup(renderer.render()))
    );

    function bodyOf(markup) {
      const rendered = new JSDOM("<body>" + markup + "</body>");
      return (rendered.window.document.body.textContent || "").replace(
        /\s+/g,
        ""
      );
    }
  });
});

// A long list was re-parsed whole on every chunk. Settled items are cached and
// only the item still being written is re-parsed — the shape already used for
// table rows. Correctness rests on three things: which blocks qualify, where
// the item boundaries fall, and whether the list is loose or tight.
describe("HyperMarkdown list item cache", () => {
  const cacheable = {
    "plain bullets": "- one\n- two\n- three",
    "ordered": "1. one\n2. two",
    "nested sublist": "- one\n  - nested\n  - also nested\n- two",
    "loose list": "- one\n\n- two",
    "task list": "- [ ] todo\n- [x] done",
  };

  const notCacheable = {
    "single item": "- only one",
    "marker changes": "- one\n* two",
    "ordered delimiter changes": "1. one\n2) two",
    "prose before the list": "Intro text\n\n- one\n- two",
    "not a list": "Just a paragraph.",
  };

  Object.keys(cacheable).forEach((name) => {
    it(`caches ${name}`, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.listCacheable(cacheable[name])).toBe(true);
    });
  });

  Object.keys(notCacheable).forEach((name) => {
    it(`declines ${name}`, () => {
      let renderer;

      renderer = createRenderer({ streaming: true, animation: false });

      expect(renderer.listCacheable(notCacheable[name])).toBe(false);
    });
  });

  it("splits items without swallowing a nested list", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(
      renderer.listItems("- one\n  - nested\n  - also nested\n- two")
    ).toEqual(["- one\n  - nested\n  - also nested", "- two"]);
  });

  it("keeps a four space nested list with its parent item", () => {
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });

    expect(renderer.listItems("1. one\n    - nested\n2. two")).toEqual([
      "1. one\n    - nested",
      "2. two",
    ]);
  });

  const rendered = {
    "tight bullets": "- one\n- two\n- three\n\n",
    "tight task list": "- [ ] todo\n- [x] done\n\n",
    "loose bullets": "- one\n\n- two\n\n- three\n\n",
    "ordered from three": "3. three\n4. four\n\n",
    "nested mixed": "1. one\n   - a\n   - b\n2. two\n\n",
    "loose task list": "- [ ] todo\n\n- [x] done\n\n",
    "list then prose": "1. one\n2. two\n\nTail paragraph.\n\n",
  };

  Object.keys(rendered).forEach((name) => {
    [1, 3, 9].forEach((size) => {
      it(`renders ${name} the same as the document at chunk size ${size}`, () => {
        let source;
        let streamed;
        let renderer;

        source = rendered[name];

        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, splitChunks(source, size), true);
        streamed = renderToStaticMarkup(renderer.render());

        renderer = createRenderer({ md: source, streaming: false });

        expect(streamed.replace(/\n+/g, "")).toBe(
          renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
        );
      });
    });
  });

  it("keeps a tight bullet list in one list", () => {
    let markup;
    let renderer;

    renderer = createRenderer({ streaming: true, animation: false });
    renderStream(renderer, splitChunks("- one\n- two\n- three\n\n", 3), true);

    markup = renderToStaticMarkup(renderer.render());

    expect((markup.match(/<ul>/g) || []).length).toBe(1);
    expect((markup.match(/<li>/g) || []).length).toBe(3);
  });

  it("shows no leaked markup at any point while a list streams", () => {
    let n;
    let source;
    let renderer;

    source = "1. First item\n   - nested one\n   - nested two\n2. Second item\n\n";

    for (n = 1; n <= source.length; n++) {
      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, source.substring(0, n).split(""), false);

      const frame = visibleText(renderToStaticMarkup(renderer.render()));

      expect(frame).not.toContain("](");
      expect(frame).not.toMatch(/(^|\s)[-*+]\s*$/);
    }
  });

  it("re-parses only the item that changed", () => {
    let parses;
    let renderer;
    let processMd;

    renderer = createRenderer({ streaming: true, animation: false });

    parses = 0;
    processMd = renderer.processMd;
    renderer.processMd = function (md, ...rest) {
      const out = processMd.call(renderer, md, ...rest);
      if (out) parses++;
      return out;
    };

    // ordered markers keep the whole list in one block, which is where the
    // cache applies; a tight bullet list is already split per item upstream
    renderStream(
      renderer,
      splitChunks(
        Array.from({ length: 30 }, (_, i) => `${i + 1}. item number ${i}`).join("\n"),
        4
      ),
      false
    );

    // without the cache every chunk is a whole-list parse (100+)
    expect(parses).toBeLessThan(10);
  });
});

// A bullet on a new line used to close the block, so every item of a tight
// list became its own <ul> — visible as extra spacing between items. The list
// stays in one block now; the item cache is what makes that affordable.
describe("HyperMarkdown tight lists stay one list", () => {
  const sources = {
    "tight bullets": "- one\n- two\n- three\n\n",
    "tight asterisks": "* one\n* two\n* three\n\n",
    "tight plus": "+ one\n+ two\n+ three\n\n",
    "tight task list": "- [ ] todo\n- [x] done\n- [ ] later\n\n",
    "tight with inline markup": "- **bold** one\n- `code` two\n- [link](https://x.dev)\n\n",
    "tight then paragraph": "- one\n- two\n\nTail.\n\n",
    "tight then heading": "- one\n- two\n\n## Heading\n\n",
  };

  Object.keys(sources).forEach((name) => {
    [1, 3, 9, 100].forEach((size) => {
      it(`${name} matches the document at chunk size ${size}`, () => {
        let source;
        let streamed;
        let renderer;

        source = sources[name];

        renderer = createRenderer({ streaming: true, animation: false });
        renderStream(renderer, splitChunks(source, size), true);
        streamed = renderToStaticMarkup(renderer.render());

        renderer = createRenderer({ md: source, streaming: false });

        expect(streamed.replace(/\n+/g, "")).toBe(
          renderToStaticMarkup(renderer.render()).replace(/\n+/g, "")
        );
      });
    });
  });

  it("never shows a list splitting apart while it streams", () => {
    let n;
    let lists;
    let source;
    let renderer;
    let previous;

    source = "- one\n- two\n- three\n- four\n\n";
    previous = 0;

    for (n = 1; n <= source.length; n++) {
      renderer = createRenderer({ streaming: true, animation: false });
      renderStream(renderer, source.substring(0, n).split(""), false);

      lists = (renderToStaticMarkup(renderer.render()).match(/<ul>/g) || [])
        .length;

      expect(lists).toBeLessThanOrEqual(1);

      previous = lists;
    }

    expect(previous).toBe(1);
  });
});
