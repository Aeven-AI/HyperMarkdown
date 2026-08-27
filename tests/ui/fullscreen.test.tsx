// @vitest-environment jsdom
//
// A block that closes must keep its element type at that position. Swapping it
// remounts the block, which silently turns fullscreen back off.
import { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

import HyperMarkdown, { type HyperMarkdownHandle } from "../../index";

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia =
    window.matchMedia ??
    ((() => ({ matches: false, addListener: () => {}, removeListener: () => {} })) as any);
  (window as any).requestAnimationFrame =
    (window as any).requestAnimationFrame || ((cb: any) => setTimeout(cb, 0));
});

function mount(ui: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(ui); });
  return { host, root };
}

describe("fullscreen survives a block closing", () => {
  it("code block", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host } = mount(<HyperMarkdown ref={ref} streaming />);

    const open = "```js\nconst a = 1;\nconst b = 2;\n";
    const close = "```\n\nafter\n\n";

    act(() => { for (let i = 0; i < open.length; i += 5) ref.current!.write(open.slice(i, i + 5)); });

    const wrapper = host.querySelector(".codeblock-wrapper");
    expect(wrapper).toBeTruthy();

    const btn = wrapper!.querySelector(".codeblock-icon-button.first") as HTMLElement;
    act(() => { btn.click(); });

    act(() => { for (let i = 0; i < close.length; i += 5) ref.current!.write(close.slice(i, i + 5)); });
    act(() => { ref.current!.write("", true); });

    const after = host.querySelector(".codeblock-wrapper")!;
    expect(after.className).toContain("fullscreen");
  });

  it("table closed by finalize", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host } = mount(<HyperMarkdown ref={ref} streaming animation />);

    const open = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n";
    act(() => { for (let i = 0; i < open.length; i += 5) ref.current!.write(open.slice(i, i + 5)); });

    const wrapper = host.querySelector(".table-wrapper");
    const btn = wrapper!.querySelector(".table-icon-button.first") as HTMLElement;
    act(() => { btn.click(); });

    act(() => { ref.current!.write("", true); });
    const after = host.querySelector(".table-wrapper")!;
    expect(after.className).toContain("fullscreen");
  });

  it("code block closed by finalize", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host } = mount(<HyperMarkdown ref={ref} streaming animation />);

    const open = "```js\nconst a = 1;\nconst b = 2;\n```\n";
    act(() => { for (let i = 0; i < open.length; i += 5) ref.current!.write(open.slice(i, i + 5)); });

    const wrapper = host.querySelector(".codeblock-wrapper");
    const btn = wrapper!.querySelector(".codeblock-icon-button.first") as HTMLElement;
    act(() => { btn.click(); });
    act(() => { ref.current!.write("", true); });
    const after = host.querySelector(".codeblock-wrapper")!;
    expect(after.className).toContain("fullscreen");
  });

  it("table", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host } = mount(<HyperMarkdown ref={ref} streaming />);

    const open = "| A | B |\n|---|---|\n| 1 | 2 |\n";
    const close = "| 3 | 4 |\n\nafter\n\n";

    act(() => { for (let i = 0; i < open.length; i += 5) ref.current!.write(open.slice(i, i + 5)); });

    const wrapper = host.querySelector(".table-wrapper");
    expect(wrapper).toBeTruthy();
    const btn = wrapper!.querySelector(".table-icon-button.first") as HTMLElement;
    act(() => { btn.click(); });

    act(() => { for (let i = 0; i < close.length; i += 5) ref.current!.write(close.slice(i, i + 5)); });
    act(() => { ref.current!.write("", true); });

    const after = host.querySelector(".table-wrapper")!;
    expect(after.className).toContain("fullscreen");
  });
});
