import { describe, expect, it, vi } from "vitest";

import Renderer from "../../lib/renderer";

describe("renderer processor cache", () => {
  it("creates pipeline shapes lazily and reuses their frozen processors", () => {
    const attach = vi.fn(() => () => undefined);
    const renderer: any = new Renderer({
      plugins: {
        cjk: {
          type: "cjk",
          name: "attachment-counter",
          remarkPluginsBefore: [attach],
        },
      },
    });

    expect(renderer.processors.size).toBe(0);
    expect(attach).not.toHaveBeenCalled();

    renderer.processMd("finished", false, false);
    const regular = renderer.processors.get("regular");

    renderer.processMd("streaming", true, false);
    renderer.processMd("animated", true, true);
    renderer.processCacheMd("| A |\n| --- |\n| x |\n", "table", false);
    renderer.processCacheMd("- one\n- two", "list", true);

    renderer.footnoteBuffer = "[^a]: note";
    renderer.generateFootnoteData();
    renderer.state.animation = true;
    renderer.footnoteBuffer = "[^b]: another note";
    renderer.generateFootnoteData();

    expect([...renderer.processors.keys()]).toEqual([
      "regular",
      "regular-stream",
      "regular-animation",
      "cached-table",
      "cached-table-animation",
      "footnote",
      "footnote-animation",
    ]);
    expect(attach).toHaveBeenCalledTimes(7);

    renderer.reset();
    renderer.processMd("finished again", false, false);

    expect(renderer.processors.get("regular")).toBe(regular);
    expect(attach).toHaveBeenCalledTimes(7);
  });
});
