// This file deliberately uses the node environment to cover the SSR adapters.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { currentPath, onViewportScroll } from "../../lib/runtime";
import MermaidDiagram from "../../lib/mermaid";
import PanZoom from "../../lib/mermaid/pan-zoom";
import "../../index";

describe("runtime SSR adapters", () => {
  it("marks the public component entry as a Next.js client boundary", () => {
    const entry = readFileSync(new URL("../../index.tsx", import.meta.url), "utf8");
    expect(entry.startsWith('"use client";')).toBe(true);
  });

  it("returns inert browser integrations when there is no window", () => {
    expect(currentPath()).toBe("");
    const handler = vi.fn();
    const stop = onViewportScroll(handler);
    expect(() => stop()).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it("renders diagrams without a DOM sandbox during SSR", async () => {
    const render = vi.fn(async () => ({ svg: "<svg/>" }));
    const diagram: any = { loaded: () => ({ render }), load: vi.fn() };
    const instance: any = new (MermaidDiagram as any)({ chart: "graph", diagram });
    expect(instance.renderSandbox()).toBeNull();
    instance.renderMermaidDiagram();
    await Promise.resolve();
    expect(render).toHaveBeenCalledWith(expect.any(String), "graph", undefined);
  });

  it("cleans up a queued pan frame without a browser window", () => {
    const instance: any = new (PanZoom as any)({
      enabled: true,
      fullscreen: false,
      svg: "<svg />",
    });

    instance.frame = 1;
    expect(() => instance.componentWillUnmount()).not.toThrow();
  });

  it("loads in a fresh browser-like module realm", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
    vi.resetModules();

    try {
      await import("../../index");
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "window", descriptor);
      } else {
        delete (globalThis as any).window;
      }
    }
  });
});
