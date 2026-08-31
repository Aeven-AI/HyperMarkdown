import { describe, expect, it } from "vitest";

import Renderer from "../../lib/renderer";
import type { BlockBoundary } from "../../lib/types";

describe("stream boundary scan", () => {
  it("uses the boundary already computed by the drain", () => {
    const renderer: any = new Renderer({ streaming: true });
    const boundary: BlockBoundary = {
      close: true,
      md: "settled",
      mdClose: "\n\n",
      mdNext: "next block",
    };

    renderer.mdBuffer = "settled\n\nnext block";
    renderer.streamProcess("text", [], true, false, false, boundary);

    expect(renderer.mdBuffer).toBe("next block");
  });
});
