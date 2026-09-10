// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { watchStickyHeader } from "../../lib/runtime";

let frames: FrameRequestCallback[] = [];
const observed = new Set<Element>();
let deliver: (target: Element, isIntersecting: boolean) => void = () => {};

beforeAll(() => {
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  }) as typeof window.requestAnimationFrame;
  class FakeIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      deliver = (target, isIntersecting) => {
        callback([{ target, isIntersecting } as IntersectionObserverEntry], this as never);
      };
    }
    observe(target: Element) { observed.add(target); }
    unobserve(target: Element) { observed.delete(target); }
    disconnect() { observed.clear(); }
  }
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = FakeIntersectionObserver;
});

afterEach(() => {
  frames = [];
  vi.restoreAllMocks();
});

function flushFrames() {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(performance.now()));
}

function block(rect: { top: number; height: number }) {
  const wrapper = document.createElement("div");
  const header = document.createElement("div");
  header.className = "codeblock-header";
  const measure = vi.fn(() => rect as DOMRect);
  Object.defineProperty(wrapper, "getBoundingClientRect", { configurable: true, value: measure });
  const watch = watchStickyHeader(() => wrapper, () => header, () => false);
  return { wrapper, header, measure, rect, watch };
}

describe("watchStickyHeader", () => {
  it("measures only on-screen blocks and writes the class only when the state flips", () => {
    const visible = block({ top: 0, height: 400 });
    const offscreen = block({ top: -5_000, height: 400 });
    flushFrames();
    expect(observed.has(visible.wrapper) && observed.has(offscreen.wrapper)).toBe(true);

    const records: MutationRecord[] = [];
    const recorder = new MutationObserver((batch) => { records.push(...batch); });
    recorder.observe(visible.header, { attributes: true });
    recorder.observe(offscreen.header, { attributes: true });

    deliver(visible.wrapper, true);
    deliver(offscreen.wrapper, false);
    expect(visible.header.classList.contains("scroll")).toBe(true);
    for (let index = 0; index < 20; index += 1) window.dispatchEvent(new Event("scroll"));

    expect(offscreen.measure).not.toHaveBeenCalled();
    expect(visible.measure).toHaveBeenCalledTimes(21);
    expect(recorder.takeRecords().length + records.length).toBe(1);

    visible.rect.top = 80;
    visible.watch.update();
    expect(visible.header.classList.contains("scroll")).toBe(false);

    visible.watch.stop();
    offscreen.watch.stop();
    recorder.disconnect();
  });

  it("clears a stuck toolbar when its block leaves the screen and detaches the scroll listener", () => {
    const listening = vi.spyOn(window, "removeEventListener");
    const only = block({ top: 0, height: 400 });
    flushFrames();
    deliver(only.wrapper, true);
    expect(only.header.classList.contains("scroll")).toBe(true);

    deliver(only.wrapper, false);
    expect(only.header.classList.contains("scroll")).toBe(false);
    expect(listening).toHaveBeenCalledWith("scroll", expect.any(Function), true);

    only.measure.mockClear();
    window.dispatchEvent(new Event("scroll"));
    expect(only.measure).not.toHaveBeenCalled();
    only.watch.stop();
    expect(observed.has(only.wrapper)).toBe(false);
  });

  it("waits for the wrapper ref and clears the class on stop", () => {
    let wrapper: HTMLElement | null = null;
    const header = document.createElement("div");
    const watch = watchStickyHeader(() => wrapper, () => header, () => false);
    flushFrames();
    watch.update();
    expect(observed.size).toBe(0);

    const element = document.createElement("div");
    Object.defineProperty(element, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, height: 400 }),
    });
    wrapper = element;
    const other = block({ top: 900, height: 10 });
    flushFrames();
    expect(observed.has(element)).toBe(true);
    deliver(element, true);
    expect(header.classList.contains("scroll")).toBe(true);

    watch.stop();
    expect(header.classList.contains("scroll")).toBe(false);
    other.watch.stop();
  });

  it("ignores a stopped block's queued intersection and stops a registration that never attached", () => {
    const stopped = block({ top: 0, height: 400 });
    flushFrames();
    // Off screen, an explicit update measures nothing.
    deliver(stopped.wrapper, false);
    stopped.watch.update();
    expect(stopped.measure).not.toHaveBeenCalled();
    stopped.watch.stop();
    deliver(stopped.wrapper, true);
    expect(stopped.header.classList.contains("scroll")).toBe(false);

    const neverAttached = watchStickyHeader(() => null, () => null, () => false);
    neverAttached.stop();
    flushFrames();
    expect(observed.size).toBe(0);
  });
});
