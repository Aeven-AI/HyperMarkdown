// This file deliberately uses the node environment to cover the SSR adapters.
import { describe, expect, it, vi } from "vitest";

import { currentPath, onViewportScroll } from "../../lib/runtime";
import MermaidDiagram from "../../lib/mermaid";
import "../../index";

describe("runtime SSR adapters", () => {
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

  it("selects the browser commit effect in a fresh module realm", async () => {
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
