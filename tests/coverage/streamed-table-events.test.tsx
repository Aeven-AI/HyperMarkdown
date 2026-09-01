// @vitest-environment jsdom
import React, { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import HyperMarkdown, { type HyperMarkdownHandle } from "../../index";

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
  frames = [];
});

function flushFrames() {
  const pending = frames;
  frames = [];
  pending.forEach((frame) => act(() => frame(0)));
}

const table = [
  "| Feature | Support | Notes |",
  "| --- | --- | --- |",
  "| **Bold** | ✅ | works |",
  "| `code` |  | (empty cell) |",
  "",
].join("\n");

/**
 * A table built by the streaming path reaches the reader through a different
 * construction site than one parsed from a finished document. It has to arrive
 * with the same wiring: without the emitter its toolbar toggles the block into
 * fullscreen and tells nobody, so a host that moves its own chrome out of the
 * way — the reason the event exists — never hears about it and paints over the
 * expanded block.
 */
describe("a table built while streaming", () => {
  it("reports fullscreen to the host, as a streamed code block does", async () => {
    const onFullscreenChange = vi.fn();
    const ref = createRef<HyperMarkdownHandle>();

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() =>
      root.render(
        <HyperMarkdown
          ref={ref}
          streaming
          onFullscreenChange={onFullscreenChange}
        />,
      ),
    );

    act(() => ref.current!.write(table));
    act(() => ref.current!.write("", true));
    flushFrames();

    const wrapper = host.querySelector(".table-wrapper");
    expect(wrapper).not.toBeNull();

    const fullscreen = [
      ...wrapper!.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => {
      return /full screen/i.test(button.getAttribute("aria-label") ?? "");
    });

    expect(fullscreen).toBeDefined();

    await act(async () => fullscreen!.click());

    expect(wrapper!.className).toContain("fullscreen");
    expect(onFullscreenChange).toHaveBeenCalledWith(true);

    act(() => root.unmount());
  });

  it("gives its toolbar the host's own labels", async () => {
    const ref = createRef<HyperMarkdownHandle>();

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    // The same omission that dropped the emitter dropped the resolved UI, so a
    // streamed table ignored what the host had configured.
    act(() =>
      root.render(
        <HyperMarkdown
          ref={ref}
          streaming
          translations={{ fullScreen: "Expand it" }}
        />,
      ),
    );

    act(() => ref.current!.write(table));
    act(() => ref.current!.write("", true));
    flushFrames();

    const labels = [
      ...host.querySelectorAll<HTMLButtonElement>(".table-icon-button"),
    ].map((button) => button.getAttribute("aria-label"));

    expect(labels).toContain("Expand it");

    act(() => root.unmount());
  });
});
