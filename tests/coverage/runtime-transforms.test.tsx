// @vitest-environment jsdom
import React, { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import MarkdownLink from "../../lib/link";
import Tooltip, { type TooltipHandle } from "../../lib/tooltip";
import { cellComponents } from "../../lib/components";
import { defaultUi } from "../../lib/config";
import { createProcessor } from "../../lib/processors";
import { rehypeAnimation } from "../../lib/rehype/animate-words";
import { rehypeData } from "../../lib/rehype/element-data";
import { rehypeMermaid } from "../../lib/rehype/mermaid";
import {
  Emitter,
  currentPath,
  getItem,
  onViewportScroll,
  setItem,
} from "../../lib/runtime";

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

describe("runtime browser adapters", () => {
  it("persists values and tolerates blocked storage", () => {
    setItem("coverage-key", "value");
    expect(getItem("coverage-key")).toBe("value");
    expect(currentPath()).toBe("/");

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => setItem("blocked", "value")).not.toThrow();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getItem("blocked")).toBeNull();
  });

  it("subscribes, dispatches, unsubscribes, and watches viewport changes", () => {
    const events = new Emitter();
    const fullscreen = vi.fn();
    events.on("fullscreen:change", "one", fullscreen);
    events.dispatchObjectEvent("fullscreen:change", true);
    expect(fullscreen).toHaveBeenCalledWith(true);
    events.off("fullscreen:change", "one");
    events.dispatchObjectEvent("fullscreen:change", false);
    expect(fullscreen).toHaveBeenCalledTimes(1);

    const handler = vi.fn();
    const stop = onViewportScroll(handler);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    expect(handler).toHaveBeenCalledTimes(2);
    stop();
    window.dispatchEvent(new Event("resize"));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe("small rehype transforms", () => {
  it("adds file data to matching elements and creates a properties bag", () => {
    const transform = rehypeData();
    const tree: any = {
      type: "root",
      children: [
        { type: "element", tagName: "p", children: [] },
        { type: "element", tagName: "a", properties: { href: "/" }, children: [] },
      ],
    };

    transform(tree, { data: {} } as any);
    transform(tree, {
      data: {
        rehypeData: {
          p: { stream: true },
          a: { title: "link" },
        },
      },
    } as any);

    expect(tree.children[0].properties).toEqual({ stream: true });
    expect(tree.children[1].properties).toEqual({ href: "/", title: "link" });

    transform(tree, { data: { rehypeData: { p: undefined } } } as any);
  });

  it("turns configured code fences into diagram nodes", () => {
    const transform = rehypeMermaid({ language: "chart" });
    const tree: any = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: {},
          children: [{
            type: "element",
            tagName: "code",
            properties: { className: ["language-chart"] },
            children: [{ type: "text", value: "graph TD\n```" }],
          }],
        },
        {
          type: "element",
          tagName: "pre",
          properties: {},
          children: [{
            type: "element",
            tagName: "code",
            properties: { className: ["language-other"] },
            children: [],
          }],
        },
      ],
    };

    transform(tree);
    expect(tree.children[0]).toMatchObject({
      tagName: "m",
      properties: { chart: "graph TD\n" },
    });
    expect(tree.children[1].tagName).toBe("pre");

    const defaultTree: any = {
      type: "root",
      children: [{
        type: "element",
        tagName: "pre",
        children: [{
          type: "element",
          tagName: "code",
          properties: { className: ["language-mermaid"] },
          children: [{ type: "element", tagName: "span", properties: {}, children: [] }],
        }],
      }],
    };
    rehypeMermaid()(defaultTree);
    expect(defaultTree.children[0].properties.chart).toBe("");
  });

  it("animates prose while leaving links, raw text, and KaTeX alone", () => {
    const transform = rehypeAnimation();
    const link: any = {
      type: "element",
      tagName: "a",
      children: [{ type: "text", value: "linked words" }],
    };
    const tree: any = {
      type: "root",
      children: [
        { type: "text", value: "hello world" },
        link,
        { type: "element", tagName: "script", properties: {}, children: [{ type: "text", value: "raw" }] },
        { type: "element", tagName: "span", properties: { className: "katex-html" }, children: [{ type: "text", value: "math" }] },
        { type: "element", tagName: "span", properties: { className: ["katex"] }, children: [{ type: "text", value: "math2" }] },
        { type: "element", tagName: "span", properties: { "data-animate-word": true }, children: [{ type: "text", value: "done" }] },
      ],
    };

    transform(tree);
    expect(tree.children[0]).toMatchObject({ type: "element", tagName: "span" });
    expect(link.properties).toMatchObject({
      "data-animate-word": true,
      "data-animate-key": "link-0",
    });
    expect(tree.children.some((node: any) => node.tagName === "script")).toBe(true);
  });
});

describe("component adapters and footnote links", () => {
  const renderer: any = {
    options: { scrollDown: vi.fn(), plugins: {} },
    events: new Emitter(),
    ui: defaultUi,
  };

  it("renders every narrow cached-cell component", () => {
    const components = cellComponents(renderer);
    const markup = renderToStaticMarkup(
      <>
        {React.createElement(components.a, { href: "https://example.com", children: "link" })}
        {React.createElement(components.m, { chart: "graph TD" })}
        {React.createElement(components.img, { src: "https://example.com/a.png", alt: "image" })}
      </>,
    );
    expect(markup).toContain("mermaid-wrapper");
    expect(markup).toContain("<img");
    expect(markup).toContain("target=\"_blank\"");
  });

  it("normalizes streamed footnote labels and follows hashes on click", () => {
    const { host, root } = mount(
      <>
        <MarkdownLink data-footnote-ref="" id="user-content-fnref-2" href="#fn-2">
          <span key="number">old</span><i key="suffix">suffix</i>
        </MarkdownLink>
        <MarkdownLink data-footnote-ref="" id="user-content-fnref-3" href="#fn-3">
          old
        </MarkdownLink>
        <MarkdownLink data-footnote-ref="" href="#missing">unchanged</MarkdownLink>
        <MarkdownLink data-footnote-ref="" id="user-content-fnref-4" href="#fn-4">
          {[
            "old",
            <i key="suffix">suffix</i>,
          ]}
        </MarkdownLink>
        <MarkdownLink data-footnote-ref="" id="user-content-fnref-5" href="#fn-5">
          <i>unchanged element</i>
        </MarkdownLink>
      </>,
    );

    const links = host.querySelectorAll("a");
    expect(links[0]?.textContent).toBe("2suffix");
    expect(links[1]?.textContent).toBe("3");
    expect(links[2]?.textContent).toBe("unchanged");
    expect(links[3]?.textContent).toBe("4");
    expect(links[4]?.textContent).toBe("unchanged element");
    act(() => links[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(window.location.hash).toBe("#fn-2");
    act(() => root.unmount());
  });

  it("normalizes a direct span footnote child", () => {
    const renderLink = (MarkdownLink as any).type;
    const unchanged = renderLink({
      "data-footnote-ref": "",
      id: "user-content-fnref-6",
      href: "#fn-6",
      children: <span>6</span>,
    });
    const changed = renderLink({
      "data-footnote-ref": "",
      id: "user-content-fnref-7",
      href: "#fn-7",
      children: <span>old</span>,
    });
    expect(renderToStaticMarkup(unchanged)).toContain(">6</span>");
    expect(renderToStaticMarkup(changed)).toContain(">7</span>");
  });

  it("passes element keys through both JSX runtime helpers", () => {
    const components = cellComponents(renderer);
    const processor = createProcessor("regular", components as any);
    const file: any = processor.processSync({
      value: "one\n\ntwo **bold**\n",
      data: { rehypeData: { p: { key: "stable" } } },
    });
    expect(renderToStaticMarkup(file.result)).toContain("<strong>bold</strong>");
  });

  it("supports an imperative tooltip with and without a reference element", () => {
    const tooltip = createRef<TooltipHandle>();
    const empty = mount(<Tooltip ref={tooltip} trigger="manual" />);
    act(() => {
      tooltip.current!.show();
      tooltip.current!.hide();
    });
    expect(empty.host.textContent).toBe("");

    act(() => empty.root.render(
      <Tooltip ref={tooltip} content="changed" placement="bottom" touch={false} arrow={false}>
        <button type="button">target</button>
      </Tooltip>,
    ));
    expect(empty.host.textContent).toBe("target");
    act(() => {
      tooltip.current!.show();
      tooltip.current!.hide();
      empty.root.unmount();
    });
  });
});
