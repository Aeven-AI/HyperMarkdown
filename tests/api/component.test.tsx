// @vitest-environment jsdom
import { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

import HyperMarkdown, { type HyperMarkdownHandle } from "../../index";

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia =
    window.matchMedia ??
    ((() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    })) as any);
});

function mount(ui: React.ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(ui);
  });
  return { host, root };
}

describe("HyperMarkdown component", () => {
  it("renders a document passed as a prop", () => {
    const { host } = mount(<HyperMarkdown md={"# Title\n\nA **bold** word.\n"} />);

    expect(host.querySelector("h1")?.textContent).toBe("Title");
    expect(host.querySelector("strong")?.textContent).toBe("bold");
  });

  it("re-renders when the md prop changes", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => root.render(<HyperMarkdown md={"first\n"} />));
    expect(host.textContent).toContain("first");

    act(() => root.render(<HyperMarkdown md={"second\n"} />));
    expect(host.textContent).toContain("second");
    expect(host.textContent).not.toContain("first");
  });

  it("streams through the imperative handle", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host } = mount(<HyperMarkdown ref={ref} streaming />);

    const source = "Streaming a list:\n\n- one\n- two\n\ndone.\n\n";

    act(() => {
      for (let i = 0; i < source.length; i += 4) {
        ref.current!.write(source.slice(i, i + 4));
      }
      ref.current!.write("", true);
    });

    expect(host.querySelectorAll("ul").length).toBe(1);
    expect(host.querySelectorAll("li").length).toBe(2);
    expect(host.textContent).toContain("done.");
  });

  it("shows no raw markup mid-stream", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host } = mount(<HyperMarkdown ref={ref} streaming />);

    const source = "See [the docs](https://example.com) now.\n\n";
    const seen: string[] = [];

    for (const ch of source) {
      act(() => ref.current!.write(ch));
      seen.push(host.textContent ?? "");
    }

    expect(seen.some((frame) => frame.includes("]("))).toBe(false);
    act(() => ref.current!.write("", true));
    expect(host.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com"
    );
  });

  it("reset() clears what was rendered", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host } = mount(<HyperMarkdown ref={ref} streaming />);

    act(() => {
      ref.current!.write("some text\n\n");
      ref.current!.write("", true);
    });
    expect(host.textContent).toContain("some text");

    act(() => ref.current!.reset());
    expect(host.textContent?.trim()).toBe("");
  });

  it("does not access the removed React element.ref getter", () => {
    let refWarning;
    let error;

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation((...args) => {
        error = args.join(" ");

        if (error.includes("Accessing element.ref was removed in React 19")) {
          refWarning = error;
        }
      });

    const { root } = mount(
      <HyperMarkdown md={"```javascript\nconsole.log('hello');\n```\n"} />
    );

    expect(refWarning).toBeUndefined();

    act(() => root.unmount());
    consoleError.mockRestore();
  });

  it("toggles code blocks in and out of fullscreen", () => {
    let button;
    let wrapper;

    const { host } = mount(
      <HyperMarkdown md={"```javascript\nconsole.log('hello');\n```\n"} />
    );

    button = host.querySelector(".codeblock-icon-button.first");
    wrapper = host.querySelector(".codeblock-wrapper");

    expect(button).toBeTruthy();
    expect(wrapper?.classList.contains("fullscreen")).toBe(false);

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(wrapper?.classList.contains("fullscreen")).toBe(true);

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(wrapper?.classList.contains("fullscreen")).toBe(false);
  });

  it("toggles tables in and out of fullscreen", () => {
    let button;
    let wrapper;

    const { host } = mount(
      <HyperMarkdown md={"| A | B |\n| - | - |\n| 1 | 2 |\n"} />
    );

    button = host.querySelector(".table-icon-button.first");
    wrapper = host.querySelector(".table-wrapper");

    expect(button).toBeTruthy();
    expect(wrapper?.classList.contains("fullscreen")).toBe(false);

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(wrapper?.classList.contains("fullscreen")).toBe(true);

    act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(wrapper?.classList.contains("fullscreen")).toBe(false);
  });
});
