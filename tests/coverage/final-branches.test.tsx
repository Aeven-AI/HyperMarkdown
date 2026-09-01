// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import HyperMarkdown from "../../index";
import MarkdownImage from "../../lib/image";
import MarkdownLink from "../../lib/link";
import Tooltip from "../../lib/tooltip";
import Renderer from "../../lib/renderer";
import CodeHeader from "../../lib/code/header";
import MermaidDiagram from "../../lib/mermaid";
import MermaidHeader from "../../lib/mermaid/header";
import { createProcessor } from "../../lib/processors";
import { rehypeAnimation } from "../../lib/rehype/animate-words";
import { rehypeData } from "../../lib/rehype/element-data";
import { rehypeMermaid } from "../../lib/rehype/mermaid";
import { remarkFootnotes } from "../../lib/remark/footnotes";
import { findBlockBoundary } from "../../lib/stream/find-block-boundary";

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function mount(ui: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  return { host, root };
}

const clickEvent = {
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
} as any;

describe("remaining component branches", () => {
  it("runs image memoization and the footnote fallbacks", () => {
    expect((MarkdownImage as any).compare({ src: "/same" }, { src: "/same" }))
      .toBe(true);

    const renderLink = (MarkdownLink as any).type;
    const withoutHref = renderLink({
      "data-footnote-ref": "",
      id: "user-content-fnref-8",
      children: <span>8</span>,
    });
    withoutHref.props.onClick(clickEvent);
    expect(window.location.hash).toBe("");

    const matchingArray = renderLink({
      "data-footnote-ref": "",
      id: "user-content-fnref-9",
      href: "#fn-9",
      children: [<span key="number">9</span>, <i key="suffix">suffix</i>],
    });
    expect(matchingArray.props.children).toBe("9");
  });

  it("instantiates a tooltip with all defaults", () => {
    const { root } = mount(
      <Tooltip>
        <button type="button">target</button>
      </Tooltip>,
    );

    act(() => root.unmount());
  });

  it("handles empty toolbar inputs and an absent diagram wrapper", () => {
    const emptyCode = document.createElement("div");
    const codeHeader = new (CodeHeader as any)({
      language: "text",
      fullscreen: false,
      codeRef: { current: emptyCode },
      wrapperRef: { current: null },
      toggleFullScreen: vi.fn(),
    });
    expect(() => codeHeader.copyContent(clickEvent)).not.toThrow();

    const diagramHeader = new (MermaidHeader as any)({
      chart: "",
      fullscreen: false,
      wrapperRef: { current: null },
      toggleFullScreen: vi.fn(),
    });
    expect(() => diagramHeader.copyContent(clickEvent)).not.toThrow();

    const frame = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    diagramHeader.updateHeaderScrollClass();
    expect(frame).toHaveBeenCalled();
  });

  it("covers defensive diagram cleanup without a parent or mounted wrapper", () => {
    const diagram: any = new (MermaidDiagram as any)({ chart: "" });
    const untracked = document.createElement("div");
    diagram.removeSandbox(untracked);

    const detached = document.createElement("div");
    diagram.mermaidSandboxes.add(detached);
    diagram.removeSandbox(detached);
    expect(diagram.mermaidSandboxes.has(detached)).toBe(false);

    expect(() => diagram.componentWillUnmount()).not.toThrow();
  });

  it("swallows preload failures after starting the requested fetch", async () => {
    const load = vi.fn(() => Promise.reject(new Error("offline")));
    const plugin: any = {
      type: "diagram",
      name: "failing",
      language: "mermaid",
      loaded: () => null,
      load,
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <HyperMarkdown md="plain" preload plugins={{ diagram: plugin }} />,
      );
    });

    expect(load).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });
});

describe("remaining transform branches", () => {
  it("skips inherited rehype-data keys", () => {
    const propsByTagName = Object.create({ p: { inherited: true } });
    const tree: any = {
      type: "root",
      children: [{ type: "element", tagName: "p", properties: {}, children: [] }],
    };

    rehypeData()(tree, { data: { rehypeData: propsByTagName } } as any);

    expect(tree.children[0].properties).toEqual({});
  });

  it("preserves animation metadata already attached to a link", () => {
    const link: any = {
      type: "element",
      tagName: "a",
      properties: {
        "data-animate-word": true,
        "data-animate-key": "existing",
      },
      children: [{ type: "text", value: "linked" }],
    };

    rehypeAnimation()({ type: "root", children: [link] } as any);

    expect(link.properties["data-animate-key"]).toBe("existing");
  });

  it("preserves animation metadata already attached to a KaTeX root", () => {
    const katex: any = {
      type: "element",
      tagName: "span",
      properties: {
        className: ["katex"],
        "data-animate-word": true,
        "data-animate-key": "existing-math",
      },
      children: [{ type: "text", value: "formula" }],
    };

    rehypeAnimation()({ type: "root", children: [katex] } as any);

    expect(katex.properties["data-animate-key"]).toBe("existing-math");
    expect(katex.children).toEqual([{ type: "text", value: "formula" }]);
  });

  it("tolerates matched transform roots without parent metadata", () => {
    const pre: any = {
      type: "element",
      tagName: "pre",
      properties: {},
      children: [{
        type: "element",
        tagName: "code",
        properties: { className: ["language-mermaid"] },
        children: [{ type: "text", value: "graph TD" }],
      }],
    };
    rehypeMermaid()(pre);
    expect(pre.tagName).toBe("pre");

    const definition: any = {
      type: "footnoteDefinition",
      identifier: "note",
      label: "note",
      children: [],
    };
    const file: any = { data: {} };
    remarkFootnotes()(definition, file);
    expect(file.data.footnoteDefinitions).toEqual([]);
  });

  it("builds a math pipeline without optional pre-plugins", () => {
    const passthrough = () => () => undefined;
    const processor = createProcessor("regular", {}, {
      math: {
        type: "math",
        name: "minimal",
        remarkPlugin: passthrough,
        rehypePlugin: passthrough,
      },
    });

    expect(processor).toBeTruthy();
  });

  it("keeps a boundary inside a differently fenced region", () => {
    const refs = { footnotes: new Map<string, string>(), mdExtra: new Map<string, string>() };
    const source = "```md\n~~~\n\ninside";

    expect(findBlockBoundary(source, "text", refs)).toMatchObject({
      close: false,
      md: source,
    });
  });
});

describe("remaining renderer branches", () => {
  const open = (md: string) => ({
    close: false,
    md,
    mdClose: "",
    mdNext: "",
  });
  const closed = (md: string) => ({
    close: true,
    md,
    mdClose: "",
    mdNext: "",
  });

  it("accepts empty processor results in every streaming block", () => {
    const renderer: any = new Renderer({ streaming: true });
    renderer.processMd = vi.fn(() => null);
    renderer.processCacheMd = vi.fn();

    expect(renderer.initializeCache({ md: "plain" })).toEqual([]);
    renderer.streamText("plain", [], 1, closed("plain"), true, true);
    renderer.streamCode("```mermaid\ngraph", [], 2, open("```mermaid\ngraph"), true, false);
    renderer.streamCode("```mermaid\ngraph\n```", [], 3, closed("```mermaid\ngraph\n```"), true, false);
    renderer.streamCode("```js\ncode\n```", [], 4, closed("```js\ncode\n```"), true, false);
    renderer.tableCache.head = null;
    renderer.streamTable("| unfinished |", [], 5, closed("| unfinished |"), true, false);

    expect(renderer.processMd).toHaveBeenCalled();
  });

  it("ignores an unknown cache type", () => {
    const renderer: any = new Renderer();

    expect(() => renderer.processCacheMd("plain", "unknown", false)).not.toThrow();
  });

  it("swallows a rejected diagram warm-up", async () => {
    const load = vi.fn(() => Promise.reject(new Error("offline")));
    const renderer: any = new Renderer({
      plugins: {
        diagram: {
          type: "diagram",
          name: "failing",
          language: "mermaid",
          loaded: () => null,
          load,
        },
      },
    });

    renderer.warmDiagramEngine("```mermaid\ngraph");
    await Promise.resolve();
    await Promise.resolve();
    expect(load).toHaveBeenCalledOnce();
  });
});
