// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import "../helpers/render";
import Renderer from "../../lib/renderer";

function fakeDiagram() {
  let loads = 0;
  let engine = null;
  return {
    plugin: {
      type: "diagram",
      name: "fake",
      language: "mermaid",
      loaded: () => engine,
      load: () => {
        loads++;
        engine = { initialize() {}, render: async () => ({ svg: "" }) };
        return Promise.resolve(engine);
      },
    },
    loads: () => loads,
  };
}

describe("diagram engine, warmed on sight", () => {
  it("starts loading when a diagram fence opens, before it closes", () => {
    const d = fakeDiagram();
    const r = new Renderer({ streaming: true, plugins: { diagram: d.plugin } });
    const open = "```mermaid\ngraph TD;\n";
    for (let i = 0; i < open.length; i += 4)
      r.streamMd(open.slice(i, i + 4), true, false, false);
    expect(d.loads()).toBe(1);
  });

  it("never asks for it when no diagram appears", () => {
    const d = fakeDiagram();
    const r = new Renderer({ streaming: true, plugins: { diagram: d.plugin } });
    const md = "```js\nconst a = 1;\n```\n\ntext\n\n";
    for (let i = 0; i < md.length; i += 4)
      r.streamMd(md.slice(i, i + 4), true, false, false);
    r.streamMd("", true, false, true);
    expect(d.loads()).toBe(0);
  });

  it("asks only once", () => {
    const d = fakeDiagram();
    const r = new Renderer({ streaming: true, plugins: { diagram: d.plugin } });
    const md = "```mermaid\ngraph TD;\nA-->B;\nC-->D;\n```\n\n";
    for (let i = 0; i < md.length; i += 2)
      r.streamMd(md.slice(i, i + 2), true, false, false);
    r.streamMd("", true, false, true);
    expect(d.loads()).toBe(1);
  });
});

describe("preload", () => {
  it("fetches the engine on mount when asked", async () => {
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { default: HyperMarkdown } = await import("../../index");
    const { createElement } = await import("react");

    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    const d = fakeDiagram();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        createElement(HyperMarkdown, {
          md: "no diagrams here\n\n",
          preload: true,
          plugins: { diagram: d.plugin },
        }),
      );
    });

    expect(d.loads()).toBe(1);

    await act(async () => root.unmount());
    host.remove();
  });

  it("does not fetch it on mount otherwise", async () => {
    const { act, createElement } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { default: HyperMarkdown } = await import("../../index");

    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    const d = fakeDiagram();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        createElement(HyperMarkdown, {
          md: "no diagrams here\n\n",
          plugins: { diagram: d.plugin },
        }),
      );
    });

    expect(d.loads()).toBe(0);

    await act(async () => root.unmount());
    host.remove();
  });
});
