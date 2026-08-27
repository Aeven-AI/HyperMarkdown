import { beforeEach, describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock("mermaid", () => ({ default: engine }));

import { mermaidPlugin } from "../../lib/plugins/mermaid";

beforeEach(() => {
  engine.initialize.mockReset();
});

describe("mermaid plugin loader", () => {
  it("deduplicates pending loads and returns the cached engine", async () => {
    const plugin = mermaidPlugin({ theme: "dark", custom: true });
    const first = plugin.load();
    const second = plugin.load();

    expect(second).toBe(first);
    await expect(first).resolves.toBe(engine);
    expect(engine.initialize).toHaveBeenCalledWith({
      securityLevel: "strict",
      theme: "dark",
      custom: true,
      startOnLoad: false,
      suppressErrorRendering: true,
    });
    expect(plugin.loaded()).toBe(engine);
    await expect(plugin.load()).resolves.toBe(engine);
  });

  it("clears a failed pending load so it can retry", async () => {
    engine.initialize.mockImplementationOnce(() => {
      throw new Error("initialization failed");
    });
    const plugin = mermaidPlugin();

    await expect(plugin.load()).rejects.toThrow("initialization failed");
    expect(plugin.loaded()).toBeNull();
    await expect(plugin.load()).resolves.toBe(engine);
  });
});
