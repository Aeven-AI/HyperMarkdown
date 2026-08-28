// @vitest-environment jsdom
import React, { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi, type Mock } from "vitest";

import HyperMarkdown, { type HyperMarkdownHandle } from "../../index";
import CodeHeader from "../../lib/code/header";
import MarkdownCode from "../../lib/code";
import LineNumber from "../../lib/code/line-numbers";
import MermaidDiagram from "../../lib/mermaid";
import MermaidHeader from "../../lib/mermaid/header";
import Reasoning from "../../lib/reasoning";
import TableHeader from "../../lib/table/header";
import MarkdownTable from "../../lib/table";
import { defaultUi } from "../../lib/config";
import { Emitter } from "../../lib/runtime";
import Renderer from "../../lib/renderer";

let frames: FrameRequestCallback[] = [];

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = (() => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as any;
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  }) as any;
  HTMLElement.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  frames = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function flushFrames() {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(performance.now()));
}

function mount(ui: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  flushFrames();
  return { host, root };
}

function refWith<T>(current: T) {
  return { current } as React.RefObject<T>;
}

describe("toolbar controls", () => {
  it("copies code and opens a completed HTML preview", async () => {
    vi.useFakeTimers();
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
    const opened = vi.spyOn(window, "open").mockImplementation(() => null);
    const alerts = vi.fn();
    const { host, root } = mount(
      <HyperMarkdown
        md={"```html\n<strong>preview</strong>\n```\n"}
        onAlert={alerts}
      />,
    );

    const buttons = host.querySelectorAll<HTMLButtonElement>(".codeblock-icon-button");
    expect(buttons).toHaveLength(3);
    await act(async () => buttons[2]!.click());
    act(() => vi.advanceTimersByTime(600));
    expect(clipboard.writeText).toHaveBeenCalledWith("<strong>preview</strong>\n");
    act(() => buttons[0]!.click());
    expect(opened).toHaveBeenCalledWith(expect.stringMatching(/^\/preview-code\/hm-/), "_blank");
    expect(Object.keys(localStorage).some((key) => key.startsWith("preview-hm-"))).toBe(true);
    expect(alerts).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it("reports a pending preview and forwards fullscreen events", () => {
    const alerts = vi.fn();
    const fullscreen = vi.fn();
    const componentRef = createRef<HyperMarkdownHandle>();
    const { root } = mount(
      <HyperMarkdown
        ref={componentRef}
        streaming
        onAlert={alerts}
        onFullscreenChange={fullscreen}
      />,
    );
    act(() => {
      componentRef.current!.store.events.dispatchObjectEvent("show:modal", {
        type: "alertModal",
        header: defaultUi.translations.previewPendingTitle,
        content: "pending",
      });
      componentRef.current!.store.events.dispatchObjectEvent("fullscreen:change", true);
      componentRef.current!.store.events.dispatchObjectEvent("fullscreen:change", false);
    });
    expect(alerts).toHaveBeenCalledWith(expect.objectContaining({
      header: defaultUi.translations.previewPendingTitle,
    }));
    expect(fullscreen).toHaveBeenCalledWith(true);
    expect(fullscreen).toHaveBeenLastCalledWith(false);
    act(() => root.unmount());

    // Exercise the producer side of the pending-preview event too.
    const events = new Emitter();
    const pending = vi.fn();
    events.on("show:modal", "pending", pending);
    const direct = mount(
      <CodeHeader
        stream
        language="html"
        fullscreen={false}
        codeRef={refWith(document.createElement("div"))}
        wrapperRef={refWith(document.createElement("div"))}
        toggleFullScreen={vi.fn()}
        events={events}
      />,
    );
    act(() => direct.host.querySelector<HTMLButtonElement>("button")!.click());
    expect(pending).toHaveBeenCalledWith(expect.objectContaining({
      header: defaultUi.translations.previewPendingTitle,
    }));
    act(() => direct.root.unmount());
  });

  it("handles unavailable previews and rejected clipboard writes", async () => {
    const clipboardError = new Error("denied");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(clipboardError) },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const events = new Emitter();
    const alert = vi.fn();
    events.on("show:modal", "test", alert);
    const code = document.createElement("div");
    const wrapper = document.createElement("div");
    const toggle = vi.fn();
    const { host, root } = mount(
      <CodeHeader
        language="html"
        fullscreen={false}
        codeRef={refWith(code)}
        wrapperRef={refWith(wrapper)}
        toggleFullScreen={toggle}
        events={events}
      />,
    );

    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    act(() => buttons[0]!.click());
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({
      header: defaultUi.translations.previewUnavailableTitle,
    }));

    code.textContent = "copy me";
    await act(async () => buttons[2]!.click());
    expect(consoleError).toHaveBeenCalledWith("Failed to copy code: ", clipboardError);
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, height: 200 }),
    });
    act(() => window.dispatchEvent(new Event("scroll")));
    flushFrames();
    expect(host.querySelector(".codeblock-header")?.className).toContain("scroll");
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 70, height: 20 }),
    });
    act(() => window.dispatchEvent(new Event("resize")));
    flushFrames();
    expect(host.querySelector(".codeblock-header")?.className).not.toContain("scroll");
    act(() => root.unmount());
  });

  it("copies tables, handles copy failure, and supports disabled controls", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("no"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const table = document.createElement("table");
    Object.defineProperty(table, "innerText", { value: "A\tB\n1\t2" });
    const wrapper = document.createElement("div");
    const events = new Emitter();
    const fullscreen = vi.fn();
    events.on("fullscreen:change", "table", fullscreen);
    const { host, root } = mount(
      <TableHeader
        stream
        tableRef={refWith(table)}
        wrapperRef={refWith(wrapper)}
        fullscreen={false}
        events={events}
      />,
    );
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    act(() => buttons[0]!.click());
    expect(fullscreen).toHaveBeenCalledWith(true);
    await act(async () => buttons[1]!.click());
    act(() => vi.advanceTimersByTime(600));
    await act(async () => buttons[1]!.click());
    expect(writeText).toHaveBeenCalledWith("A\tB\n1\t2");
    expect(consoleLog).toHaveBeenCalled();

    const ui = {
      ...defaultUi,
      controls: {
        ...defaultUi.controls,
        table: { fullscreen: false, copy: false },
      },
    };
    act(() => root.render(
      <TableHeader
        tableRef={refWith(table)}
        wrapperRef={refWith(wrapper)}
        fullscreen
        ui={ui}
      />,
    ));
    flushFrames();
    expect(host.querySelector("button")).toBeNull();

    act(() => root.render(
      <TableHeader
        tableRef={refWith<HTMLTableElement | null>(null)}
        wrapperRef={refWith(wrapper)}
        fullscreen={false}
      />,
    ));
    flushFrames();
    act(() => host.querySelectorAll<HTMLButtonElement>("button")[1]!.click());
    act(() => root.unmount());
  });

  it("tracks fullscreen code scrolling and settles animated children", () => {
    vi.useFakeTimers();
    const block = createRef<any>();
    const { host, root } = mount(
      <MarkdownCode
        ref={block}
        animation
        children={<code className="language-js">streaming{"\n"}</code>}
        preChildren={<code className="language-js">settled{"\n"}</code>}
      />,
    );
    const wrapper = host.querySelector<HTMLElement>(".codeblock-wrapper")!;
    Object.defineProperties(wrapper, {
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    act(() => block.current.toggleFullScreen(true));
    expect(wrapper.className).toContain("fullscreen");
    expect(wrapper.scrollTo).toHaveBeenCalled();

    wrapper.scrollTop = 0;
    act(() => wrapper.dispatchEvent(new Event("scroll")));
    block.current.scrollDown();
    wrapper.scrollTop = 450;
    act(() => wrapper.dispatchEvent(new Event("scroll")));
    Object.defineProperty(wrapper, "scrollHeight", { configurable: true, value: 600 });
    block.current.scrollDown();
    expect(wrapper.scrollTo).toHaveBeenCalledTimes(2);

    act(() => vi.advanceTimersByTime(1000));
    expect(host.textContent).toContain("settled");
    act(() => block.current.toggleFullScreen(false));
    act(() => root.unmount());
  });

  it("handles code blocks without language metadata or mounted wrappers", () => {
    const noChildren = new (MarkdownCode as any)({});
    const noClass = new (MarkdownCode as any)({ children: <code /> });
    const noMatch = new (MarkdownCode as any)({ children: <code className="plain" /> });
    expect(noChildren.language()).toBe("Code");
    expect(noClass.language()).toBe("Code");
    expect(noMatch.language()).toBe("Code");

    const nativeExec = RegExp.prototype.exec;
    const exec = vi
      .spyOn(RegExp.prototype, "exec")
      .mockImplementation(function (this: RegExp, value: string) {
        if (this.source === "language-(\\w+)" && value === "language-js") {
          return ["language-js"] as RegExpExecArray;
        }

        return nativeExec.call(this, value);
      });
    const missingCapture = new (MarkdownCode as any)({
      children: <code className="language-js" />,
    });
    expect(missingCapture.language()).toBe("Code");
    exec.mockRestore();
    expect(() => noChildren.scrollDown()).not.toThrow();
    expect(() => noChildren.scrollDownListener()).not.toThrow();
    noChildren.updater = {
      enqueueSetState(instance: any, update: any, callback: () => void) {
        instance.state = { ...instance.state, ...update };
        callback();
      },
    };
    expect(() => noChildren.toggleFullScreen(true)).not.toThrow();

    const code = document.createElement("div");
    Object.defineProperty(code, "textContent", { configurable: true, value: null });
    const lineNumber = new (LineNumber as any)({ codeRef: refWith(code) });
    expect(() => lineNumber.lineNumberCount()).not.toThrow();
  });

  it("grows, trims, and exactly fills line-number groups", () => {
    const lineNumber: any = new (LineNumber as any)({
      animation: false,
      codeRef: refWith(document.createElement("div")),
      lineCount: 130,
    });

    expect(lineNumber.spans(130, false)).toHaveLength(3);
    expect(lineNumber.spans(64, false)).toHaveLength(1);
  });

  it("hides disabled code and diagram controls", () => {
    const ui = {
      ...defaultUi,
      controls: {
        ...defaultUi.controls,
        code: { fullscreen: false, copy: false, preview: false },
        diagram: { fullscreen: false, copy: false },
      },
    };
    const wrapper = document.createElement("div");
    const code = document.createElement("div");
    const { host, root } = mount(
      <>
        <CodeHeader
          ui={ui}
          language="js"
          fullscreen={false}
          codeRef={refWith(code)}
          wrapperRef={refWith(wrapper)}
          toggleFullScreen={vi.fn()}
        />
        <MermaidHeader
          ui={ui}
          chart="graph"
          fullscreen={false}
          wrapperRef={refWith(wrapper)}
          toggleFullScreen={vi.fn()}
        />
      </>,
    );
    expect(host.querySelector("button")).toBeNull();
    act(() => root.unmount());
  });

  it("tracks a fullscreen table user's scroll position", () => {
    const { host, root } = mount(
      <MarkdownTable>
        <tbody><tr><td>one</td></tr></tbody>
      </MarkdownTable>,
    );
    const wrapper = host.querySelector<HTMLElement>(".table-wrapper")!;
    Object.defineProperties(wrapper, {
      scrollHeight: { configurable: true, writable: true, value: 500 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    act(() => host.querySelector<HTMLButtonElement>(".table-icon-button.first")!.click());
    expect(wrapper.scrollTo).toHaveBeenCalled();
    act(() => wrapper.dispatchEvent(new Event("scroll")));
    wrapper.scrollTop = 450;
    act(() => wrapper.dispatchEvent(new Event("scroll")));
    wrapper.scrollHeight = 600;
    act(() => root.render(
      <MarkdownTable><tbody><tr><td>two</td></tr></tbody></MarkdownTable>,
    ));
    expect(wrapper.scrollTo).toHaveBeenCalled();
    act(() => root.unmount());
  });

  it("updates a table header across viewport and fullscreen changes", () => {
    const table = document.createElement("table");
    const wrapper = document.createElement("div");
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, height: 200 }),
    });
    const { host, root } = mount(
      <TableHeader
        tableRef={refWith(table)}
        wrapperRef={refWith(wrapper)}
        fullscreen={false}
      />,
    );
    act(() => window.dispatchEvent(new Event("scroll")));
    flushFrames();
    expect(host.querySelector(".table-header")?.className).toContain("scroll");
    act(() => root.render(
      <TableHeader
        tableRef={refWith(table)}
        wrapperRef={refWith(wrapper)}
        fullscreen
      />,
    ));
    flushFrames();
    expect(host.querySelector(".table-header")?.className).not.toContain("scroll");
    act(() => window.dispatchEvent(new Event("resize")));
    act(() => root.unmount());
    flushFrames();
  });
});

describe("diagram controls and engine lifecycle", () => {
  it("renders, updates, scrolls, copies, and toggles a diagram", async () => {
    vi.useFakeTimers();
    const render = vi.fn(async (_id: string, chart: string) => ({ svg: `<svg><text>${chart}</text></svg>` }));
    const engine = { initialize: vi.fn(), render };
    const plugin: any = {
      type: "diagram",
      name: "fake",
      language: "mermaid",
      loaded: () => engine,
      load: vi.fn(),
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const events = new Emitter();
    const fullscreen = vi.fn();
    events.on("fullscreen:change", "diagram", fullscreen);
    const scrolled = vi.fn();
    const { host, root } = mount(
      <MermaidDiagram chart="graph TD" diagram={plugin} events={events} scrollDown={scrolled} />,
    );
    await act(async () => {});
    expect(host.querySelector(".mermaid-svg svg")?.textContent).toBe("graph TD");
    expect(document.querySelector(".mermaid-render-sandbox")).toBeNull();

    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    act(() => buttons[0]!.click());
    expect(host.querySelector(".mermaid-wrapper")?.className).toContain("fullscreen");
    expect(fullscreen).toHaveBeenCalledWith(true);
    await act(async () => buttons[1]!.click());
    act(() => vi.advanceTimersByTime(600));

    act(() => root.render(
      <MermaidDiagram chart="graph LR" stream="true" diagram={plugin} events={events} scrollDown={scrolled} />,
    ));
    flushFrames();
    await act(async () => {});
    expect(render).toHaveBeenCalledTimes(2);
    expect(host.querySelector(".mermaid-wrapper")?.className).toContain("stream-active");
    act(() => root.unmount());
  });

  it("cleans up after engine load and render failures", async () => {
    const failingLoad: any = {
      loaded: () => null,
      load: () => Promise.reject(new Error("load")),
    };
    const { root } = mount(<MermaidDiagram chart="bad" diagram={failingLoad} />);
    await act(async () => {});
    expect(document.querySelector(".mermaid-render-sandbox")).toBeNull();

    const failingRender: any = {
      loaded: () => ({ render: () => Promise.reject(new Error("render")) }),
      load: vi.fn(),
    };
    act(() => root.render(<MermaidDiagram chart="still bad" diagram={failingRender} />));
    flushFrames();
    await act(async () => {});
    expect(document.querySelector(".mermaid-render-sandbox")).toBeNull();
    act(() => root.unmount());
  });

  it("renders after an asynchronous engine load and handles inert instances", async () => {
    const engine = { render: vi.fn(async () => ({ svg: "<svg><text>loaded</text></svg>" })) };
    const plugin: any = {
      loaded: () => null,
      load: () => Promise.resolve(engine),
    };
    const { host, root } = mount(<MermaidDiagram chart="async" diagram={plugin} />);
    await act(async () => {});
    expect(host.querySelector(".mermaid-svg")?.textContent).toBe("loaded");
    act(() => root.unmount());

    const inert = new (MermaidDiagram as any)({ chart: "" });
    expect(() => inert.renderMermaidDiagram()).not.toThrow();
    expect(() => inert.scrollDown()).not.toThrow();
    expect(() => inert.scrollDownListener()).not.toThrow();
    inert.updater = {
      enqueueSetState(instance: any, update: any, callback: () => void) {
        instance.state = { ...instance.state, ...update };
        callback();
      },
    };
    expect(() => inert.toggleFullScreen(true)).not.toThrow();

    inert.mermaidSandboxes = new Set([null]);
    expect(() => inert.removeSandbox()).not.toThrow();
  });

  it("covers header update decisions and empty charts", () => {
    const header = createRef<any>();
    const wrapper = document.createElement("div");
    const toggle = vi.fn();
    const { host, root } = mount(
      <MermaidHeader
        ref={header}
        chart=""
        fullscreen={false}
        wrapperRef={refWith(wrapper)}
        toggleFullScreen={toggle}
      />,
    );
    expect(header.current.shouldComponentUpdate(header.current.props)).toBe(false);
    expect(header.current.shouldComponentUpdate({ ...header.current.props, chart: "x" })).toBe(true);
    expect(host.querySelectorAll("button")).toHaveLength(2);
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, height: 200 }),
    });
    act(() => window.dispatchEvent(new Event("scroll")));
    flushFrames();
    expect(host.querySelector(".mermaid-header")?.className).toContain("scroll");
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 70, height: 20 }),
    });
    act(() => window.dispatchEvent(new Event("resize")));
    flushFrames();
    expect(host.querySelector(".mermaid-header")?.className).not.toContain("scroll");
    act(() => root.unmount());
  });

  it("handles rejected diagram copies and fullscreen header updates", async () => {
    vi.useFakeTimers();
    const error = new Error("clipboard denied");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(error) },
    });
    const logged = vi.spyOn(console, "log").mockImplementation(() => {});
    const wrapper = document.createElement("div");
    const header = createRef<any>();
    const { host, root } = mount(
      <MermaidHeader
        ref={header}
        chart="graph"
        fullscreen={false}
        wrapperRef={refWith(wrapper)}
        toggleFullScreen={vi.fn()}
      />,
    );
    await act(async () => host.querySelectorAll<HTMLButtonElement>("button")[1]!.click());
    expect(logged).toHaveBeenCalledWith(error);
    act(() => root.render(
      <MermaidHeader
        ref={header}
        chart="graph"
        fullscreen
        wrapperRef={refWith(wrapper)}
        toggleFullScreen={vi.fn()}
      />,
    ));
    flushFrames();
    expect(host.querySelector(".mermaid-header")?.className).not.toContain("scroll");
    act(() => root.unmount());
  });

  it("tracks a fullscreen diagram user's scroll position", async () => {
    const diagramRef = createRef<any>();
    const engine = { render: vi.fn(async () => ({ svg: "<svg/>" })) };
    const plugin: any = { loaded: () => engine, load: vi.fn() };
    const { host, root } = mount(
      <MermaidDiagram ref={diagramRef} chart="graph" diagram={plugin} />,
    );
    await act(async () => {});
    const wrapper = host.querySelector<HTMLElement>(".mermaid-wrapper")!;
    Object.defineProperties(wrapper, {
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    act(() => diagramRef.current.toggleFullScreen(true));
    expect(wrapper.scrollTo).toHaveBeenCalled();
    act(() => wrapper.dispatchEvent(new Event("scroll")));
    const scrolls = () => (wrapper.scrollTo as unknown as Mock).mock.calls.length;

    // scrollTo is stubbed once on the prototype for the whole file, so counts
    // accumulate across tests: measure this sequence's own calls.
    // Scrolled away from the bottom: following the content would yank the
    // reader back, so scrollDown() leaves them where they are.
    const atTop = scrolls();
    diagramRef.current.scrollDown();
    expect(scrolls() - atTop).toBe(0);

    // Pinned to the bottom: it follows the diagram as it grows.
    wrapper.scrollTop = 450;
    act(() => wrapper.dispatchEvent(new Event("scroll")));
    Object.defineProperty(wrapper, "scrollHeight", { configurable: true, value: 600 });
    const atBottom = scrolls();
    diagramRef.current.scrollDown();
    expect(scrolls() - atBottom).toBe(1);
    act(() => diagramRef.current.toggleFullScreen(false));
    act(() => root.unmount());
  });
});

describe("reasoning interaction", () => {
  it("times streaming reasoning and preserves a reader's toggle", () => {
    vi.useFakeTimers();
    const { host, root } = mount(<Reasoning stream>thinking</Reasoning>);
    expect(host.querySelector(".reasoning-wrapper")?.className).toContain("open");
    act(() => vi.advanceTimersByTime(1100));
    act(() => host.querySelector<HTMLButtonElement>("button")!.click());
    expect(host.querySelector(".reasoning-wrapper")?.className).toContain("collapsed");
    act(() => root.render(<Reasoning stream={false}>done</Reasoning>));
    expect(host.querySelector(".reasoning-wrapper")?.className).toContain("collapsed");
    act(() => root.unmount());
  });

  it("automatically collapses reasoning that finishes untouched", () => {
    const { host, root } = mount(<Reasoning stream>thinking</Reasoning>);
    act(() => root.render(<Reasoning stream={false}>done</Reasoning>));
    expect(host.querySelector(".reasoning-wrapper")?.className).toContain("collapsed");
    act(() => root.unmount());
  });

  it("portals reasoning into a configured browser target", () => {
    const target = document.createElement("aside");
    document.body.appendChild(target);
    const renderer: any = new Renderer({ reasoningTarget: target });
    const portal = renderer.placeReasoning(<div>portal reasoning</div>, 1);
    expect(portal).toBeTruthy();
  });
});
