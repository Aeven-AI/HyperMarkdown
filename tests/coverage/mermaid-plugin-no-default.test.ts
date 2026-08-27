import { describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock("mermaid", () => ({
  default: undefined,
  initialize: engine.initialize,
  render: engine.render,
}));

import { mermaidPlugin } from "../../lib/plugins/mermaid";

describe("mermaid module interop", () => {
  it("supports a module namespace without a default export", async () => {
    const loaded = await mermaidPlugin().load();
    expect(loaded.initialize).toBe(engine.initialize);
    expect(engine.initialize).toHaveBeenCalled();
  });
});
