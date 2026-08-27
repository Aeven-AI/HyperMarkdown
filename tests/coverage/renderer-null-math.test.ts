import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/math-notation", async () => {
  const actual = await vi.importActual<typeof import("../../lib/math-notation")>(
    "../../lib/math-notation",
  );

  return { ...actual, convertMath: vi.fn(() => null) };
});

import Renderer from "../../lib/renderer";

describe("renderer math fallback", () => {
  it("normalizes an empty converter result", () => {
    const renderer: any = new Renderer();
    expect(renderer.mdMath("input", "text")).toBe("");
  });
});
