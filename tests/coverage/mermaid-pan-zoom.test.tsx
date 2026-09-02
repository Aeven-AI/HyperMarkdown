// @vitest-environment jsdom
import React, { createRef } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { resolveUi } from "../../lib/config";
import PanZoom from "../../lib/mermaid/pan-zoom";

let frames: FrameRequestCallback[] = [];

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  }) as any;
  window.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  document.body.replaceChildren();
  frames = [];
  vi.restoreAllMocks();
});

function flushFrames() {
  let pending;

  pending = frames;
  frames = [];
  pending.forEach((callback) => callback(performance.now()));
}

function mount(ui: React.ReactElement) {
  const host = document.createElement("div");
  const root = createRoot(host);

  document.body.appendChild(host);
  act(() => root.render(ui));

  return { host, root };
}

function pointer(
  type: string,
  clientX: number,
  clientY: number,
  pointerId = 1,
  button = 0,
  isPrimary = true,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: button,
    cancelable: true,
    clientX: clientX,
    clientY: clientY,
  });

  Object.defineProperties(event, {
    isPrimary: { value: isPrimary },
    pointerId: { value: pointerId },
  });

  return event;
}

describe("Mermaid pan and zoom", () => {
  it("zooms with its buttons and resets the view", () => {
    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg><text>chart</text></svg>" />,
    );
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;
    const zoomIn = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom in"]',
    )!;
    const zoomOut = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom out"]',
    )!;
    const reset = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Reset zoom and pan"]',
    )!;

    expect(content.style.transform).toBe("translate(0px, 0px) scale(1)");
    act(() => zoomIn.click());
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.1)");
    act(() => zoomOut.click());
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1)");
    act(() => reset.click());
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1)");

    act(() => root.unmount());
  });

  it("zooms on a modifier wheel with a non-passive handler", () => {
    let wheel;

    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" />,
    );
    const wrapper = host.querySelector<HTMLElement>(".mermaid-pan-zoom")!;
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;
    wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -10,
      ctrlKey: true,
    });

    act(() => wrapper.dispatchEvent(wheel));

    expect(wheel.defaultPrevented).toBe(true);
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.1)");

    wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 10,
      ctrlKey: true,
    });
    act(() => wrapper.dispatchEvent(wheel));
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1)");

    // A trackpad pinch is a wheel event with ctrlKey set, so it zooms; ⌘ is
    // accepted for the same reason ctrl is.
    wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -10,
      metaKey: true,
    });
    act(() => wrapper.dispatchEvent(wheel));
    expect(wheel.defaultPrevented).toBe(true);
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.1)");

    act(() => root.unmount());
  });

  it("keeps zooming while the button is held, and stops when released", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" />,
    );
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;
    const zoomIn = host.querySelector<HTMLButtonElement>(
      ".mermaid-pan-zoom-button.first",
    )!;

    act(() => zoomIn.dispatchEvent(pointer("pointerdown", 0, 0)));

    // Below the delay a press is just a click, and the click is what steps.
    act(() => vi.advanceTimersByTime(200));
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1)");

    // Past it the zoom walks on its own, one step per interval.
    act(() => vi.advanceTimersByTime(240));
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.1)");
    act(() => vi.advanceTimersByTime(160));
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.3)");

    act(() => zoomIn.dispatchEvent(pointer("pointerup", 0, 0)));
    act(() => vi.advanceTimersByTime(400));
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.3)");

    // The click that ends a hold must not add a step on top of it.
    act(() => zoomIn.click());
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.3)");

    // A later, ordinary click still steps once.
    act(() => zoomIn.click());
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1.4)");

    act(() => root.unmount());
    vi.useRealTimers();
  });

  it("drops a hold that is cancelled rather than released", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" />,
    );
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;
    const zoomOut = host.querySelectorAll<HTMLButtonElement>(
      ".mermaid-pan-zoom-button",
    )[1]!;

    act(() => zoomOut.dispatchEvent(pointer("pointerdown", 0, 0)));
    act(() => vi.advanceTimersByTime(440));
    expect(content.style.transform).toBe("translate(0px, 0px) scale(0.9)");

    // A cancelled gesture ends the hold: it cannot outlive the finger.
    act(() => zoomOut.dispatchEvent(pointer("pointercancel", 0, 0)));
    act(() => vi.advanceTimersByTime(800));
    expect(content.style.transform).toBe("translate(0px, 0px) scale(0.9)");

    // And the click closing that hold does not step again, zooming out as
    // much as zooming in.
    act(() => zoomOut.click());
    expect(content.style.transform).toBe("translate(0px, 0px) scale(0.9)");

    act(() => zoomOut.click());
    expect(content.style.transform).toBe("translate(0px, 0px) scale(0.8)");

    act(() => root.unmount());
    vi.useRealTimers();
  });

  it("does not leave a hold running after the diagram unmounts", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" />,
    );
    const zoomIn = host.querySelector<HTMLButtonElement>(
      ".mermaid-pan-zoom-button.first",
    )!;

    act(() => zoomIn.dispatchEvent(pointer("pointerdown", 0, 0)));
    act(() => root.unmount());

    // Nothing left to fire into a component that is gone.
    expect(() => act(() => vi.advanceTimersByTime(2000))).not.toThrow();

    vi.useRealTimers();
  });

  it("lets a plain wheel scroll the page instead of zooming", () => {
    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" />,
    );
    const wrapper = host.querySelector<HTMLElement>(".mermaid-pan-zoom")!;
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;
    const before = content.style.transform;

    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -10,
    });

    act(() => wrapper.dispatchEvent(wheel));

    // Nothing prevented, nothing zoomed: the reader scrolls past a diagram
    // the way they scroll past a paragraph.
    expect(wheel.defaultPrevented).toBe(false);
    expect(content.style.transform).toBe(before);

    act(() => root.unmount());
  });

  it("pans by pointer and applies at most one transform per frame", () => {
    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" />,
    );
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;

    content.setPointerCapture = vi.fn();
    content.releasePointerCapture = vi.fn();

    act(() => content.dispatchEvent(pointer("pointerdown", 10, 20)));
    act(() => {
      content.dispatchEvent(pointer("pointermove", 30, 50));
      content.dispatchEvent(pointer("pointermove", 40, 60));
    });

    expect(frames).toHaveLength(1);
    act(() => flushFrames());
    expect(content.style.transform).toBe("translate(30px, 40px) scale(1)");
    expect(host.querySelector(".mermaid-pan-zoom")?.className).toContain(
      "panning",
    );

    act(() => content.dispatchEvent(pointer("pointerup", 40, 60)));
    expect(content.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(host.querySelector(".mermaid-pan-zoom")?.className).not.toContain(
      "panning",
    );

    act(() => root.unmount());
  });

  it("keeps the view while streamed SVG and fullscreen props change", () => {
    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg><text>one</text></svg>" />,
    );
    const zoomIn = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Zoom in"]',
    )!;

    act(() => zoomIn.click());
    act(() =>
      root.render(
        <PanZoom enabled fullscreen svg="<svg><text>two</text></svg>" />,
      ),
    );

    expect(host.querySelector(".mermaid-pan-zoom")?.className).toContain(
      "fullscreen",
    );
    expect(
      host.querySelector<HTMLElement>(".mermaid-pan-zoom-content")?.style
        .transform,
    ).toContain("scale(1.1)");
    expect(host.querySelector(".mermaid-svg")?.textContent).toBe("two");

    act(() => root.unmount());
  });

  it("attaches, removes, and resets interaction when enabled changes", () => {
    let wheel;

    const panZoomRef = createRef<any>();
    const { host, root } = mount(
      <PanZoom
        ref={panZoomRef}
        enabled
        fullscreen={false}
        svg="<svg />"
      />,
    );
    const wrapper = host.querySelector<HTMLElement>(".mermaid-pan-zoom")!;
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;

    act(() => panZoomRef.current.zoomIn());
    act(() =>
      root.render(
        <PanZoom
          ref={panZoomRef}
          enabled={false}
          fullscreen={false}
          svg="<svg />"
        />,
      ),
    );
    expect(content.style.transform).toBe("translate(0px, 0px) scale(1)");
    expect(host.querySelector("button")).toBeNull();

    wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -10,
    });
    act(() => wrapper.dispatchEvent(wheel));
    expect(wheel.defaultPrevented).toBe(false);

    act(() =>
      root.render(
        <PanZoom
          ref={panZoomRef}
          enabled
          fullscreen={false}
          svg="<svg />"
        />,
      ),
    );
    // Modifier held, so a live handler is the only thing that could prevent it.
    wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -10,
      ctrlKey: true,
    });
    act(() => wrapper.dispatchEvent(wheel));
    expect(wheel.defaultPrevented).toBe(true);

    act(() => root.unmount());
  });

  it("ignores disabled, stationary, secondary, and mismatched input", () => {
    let wheel;

    const panZoomRef = createRef<any>();
    const { host, root } = mount(
      <PanZoom
        ref={panZoomRef}
        enabled
        fullscreen={false}
        svg="<svg />"
      />,
    );
    const wrapper = host.querySelector<HTMLElement>(".mermaid-pan-zoom")!;
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;

    wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 0,
    });
    act(() => wrapper.dispatchEvent(wheel));
    expect(wheel.defaultPrevented).toBe(false);

    act(() => {
      content.dispatchEvent(pointer("pointerdown", 0, 0, 1, 1));
      content.dispatchEvent(pointer("pointerdown", 0, 0, 1, 0, false));
      content.dispatchEvent(pointer("pointermove", 10, 10));
      content.dispatchEvent(pointer("pointerup", 10, 10));
    });
    expect(host.querySelector(".mermaid-pan-zoom")?.className).not.toContain(
      "panning",
    );

    content.setPointerCapture = vi.fn();
    content.releasePointerCapture = vi.fn();
    act(() => content.dispatchEvent(pointer("pointerdown", 0, 0)));
    act(() => {
      content.dispatchEvent(pointer("pointermove", 10, 10, 2));
      content.dispatchEvent(pointer("pointerup", 10, 10, 2));
    });
    expect(frames).toHaveLength(0);
    act(() => content.dispatchEvent(pointer("pointerup", 10, 10)));

    act(() =>
      root.render(
        <PanZoom
          ref={panZoomRef}
          enabled={false}
          fullscreen={false}
          svg="<svg />"
        />,
      ),
    );
    wheel = new WheelEvent("wheel", { cancelable: true, deltaY: -10 });
    act(() => panZoomRef.current.handleWheel(wheel));
    act(() => content.dispatchEvent(pointer("pointerdown", 0, 0)));
    expect(wheel.defaultPrevented).toBe(false);

    act(() => root.unmount());
  });

  it("cancels a queued transform and tolerates its detached content", () => {
    const { host, root } = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" />,
    );
    const content = host.querySelector<HTMLElement>(
      ".mermaid-pan-zoom-content",
    )!;

    content.setPointerCapture = vi.fn();
    act(() => content.dispatchEvent(pointer("pointerdown", 0, 0)));
    act(() => content.dispatchEvent(pointer("pointermove", 10, 10)));
    expect(frames).toHaveLength(1);

    act(() => root.unmount());
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    act(() => flushFrames());
  });

  it("can disable interaction and customize its labels and icons", () => {
    let wheel;

    const disabledUi = resolveUi({ controls: { diagram: false } });
    const customUi = resolveUi({
      translations: { zoomIn: "Closer" },
      icons: { zoomIn: '<svg data-test="closer" />' },
    });
    const disabled = mount(
      <PanZoom
        enabled={disabledUi.controls.diagram.panZoom}
        fullscreen={false}
        svg="<svg />"
        ui={disabledUi}
      />,
    );

    wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -10,
    });
    act(() =>
      disabled.host
        .querySelector(".mermaid-pan-zoom")!
        .dispatchEvent(wheel),
    );
    expect(wheel.defaultPrevented).toBe(false);
    expect(disabled.host.querySelector("button")).toBeNull();
    act(() => disabled.root.unmount());

    const custom = mount(
      <PanZoom enabled fullscreen={false} svg="<svg />" ui={customUi} />,
    );
    expect(
      custom.host.querySelector('button[aria-label="Closer"] [data-test="closer"]'),
    ).not.toBeNull();
    act(() => custom.root.unmount());
  });
});
