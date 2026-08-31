import React, { Fragment } from "react";
import { describe, expect, it, vi } from "vitest";

import Renderer from "../../lib/renderer";
import { createProcessor } from "../../lib/processors";

describe("renderer defensive and callback paths", () => {
  it("flushes callbacks for text, code, tables, diagrams, and reasoning", () => {
    const scrollDown = vi.fn();
    const diagram = {
      type: "diagram" as const,
      name: "fake",
      language: "mermaid",
      loaded: () => ({ render: vi.fn() }),
      load: vi.fn(),
    };
    const samples = [
      "text\n\n",
      "```js\ncode\n```\n\n",
      "| A |\n|---|\n| x |\n\n",
      "```mermaid\ngraph TD\n```\n\n",
      "<think>reasoning</think>",
    ];

    for (const sample of samples) {
      const renderer = new Renderer({ streaming: true, scrollDown, plugins: { diagram } });
      renderer.streamMd(sample, true, false, true);
      renderer.flush();
    }
    expect(scrollDown).toHaveBeenCalled();
  });

  it("settles pending input on finalize and handles a stalled drain", () => {
    const renderer: any = new Renderer({ streaming: true });
    renderer.streamMd("<thi", true, false, true);
    expect(renderer.render()).toBeTruthy();

    const storedPending: any = new Renderer({ streaming: true });
    storedPending.blockType = "pending";
    storedPending.streamMd("x", true, false, true);
    expect(storedPending.render()).toBeTruthy();

    renderer.mdBuffer = "stalled";
    renderer.blockType = "pending";
    renderer.streamProcess = vi.fn();
    renderer.drainMd([], true, false, true);
    expect(renderer.streamProcess).toHaveBeenCalledWith(
      "text",
      [],
      true,
      false,
      true,
      {
        close: false,
        md: "stalled",
        mdClose: "",
        mdNext: "",
      },
    );
  });

  it("recognizes component roots and rejects unrelated React shapes", () => {
    const renderer: any = new Renderer();
    const Type = () => <div />;
    const expected = <Type />;

    expect(renderer.blockOfType(null, Type)).toBeNull();
    expect(renderer.blockOfType(expected, Type)).toBe(expected);
    expect(renderer.blockOfType(<div />, Type)).toBeNull();
    expect(renderer.blockOfType(<Fragment><Type /><Type /></Fragment>, Type)).toBeNull();
    expect(renderer.blockOfType(<Fragment><div /></Fragment>, Type)).toBeNull();
    expect(renderer.blockOfType(<Fragment>{expected}</Fragment>, Type)?.type).toBe(Type);
  });

  it("covers empty list, cache, stream, processor, and portal fallbacks", () => {
    const renderer: any = new Renderer();
    renderer.listCache.data = [];
    expect(renderer.listElement()).toBeNull();
    renderer.listCache.data = ["not an element"];
    renderer.listCache.itemText = ["- item"];
    expect(renderer.listElement()).toBeTruthy();
    renderer.listCache.itemText = [];
    expect(renderer.listElement().type).toBe("ul");

    let markerRead = 0;
    const marker = ["2."];
    Object.defineProperty(marker, "1", {
      configurable: true,
      get: () => (markerRead++ === 0 ? "2." : undefined),
    });
    renderer.listCache.itemText = [
      { match: () => marker } as any,
    ];
    expect(renderer.listElement().props.start).toBeUndefined();

    renderer.listCache.itemText = [
      { match: () => ["marker-without-capture"] } as any,
    ];
    expect(renderer.listElement().type).toBe("ul");
    renderer.listCache.data = [
      <li key="task" className={["task-list-item"] as any}>task</li>,
    ];
    expect(renderer.listElement().props.className).toBe("contains-task-list");

    renderer.cachedData = null;
    renderer.streamData = null;
    expect(renderer.generateCachedData()).toBeNull();
    expect(renderer.generateStreamData()).toBeNull();
    expect(renderer.processMd("", false, false)).toBeNull();

    const element = <div>reasoning</div>;
    renderer.options.reasoningTarget = () => null;
    expect(renderer.placeReasoning(element, 1)).toBe(element);
    renderer.streamReasoning("plain", [], 1, { close: false }, true, false);

    renderer.mdBuffer = "";
    expect(() => renderer.streamProcess("pending", [], true, false, false))
      .not.toThrow();
  });

  it("reuses processed footnotes and selects the animated processor", () => {
    const renderer: any = new Renderer({ animation: true });
    renderer.footnoteBuffer = "[^a]: note";
    const first = renderer.generateFootnoteData();
    const second = renderer.generateFootnoteData();
    expect(second).toBe(first);
  });

  it("covers direct streaming fallbacks without changing parser behavior", () => {
    const scrollDown = vi.fn();
    const renderer: any = new Renderer({ streaming: true, scrollDown });

    renderer.processCacheMd = vi.fn();
    renderer.listElement = vi.fn(() => null);
    renderer.streamText("- one\n- two", [], 1, {
      close: false,
      md: "- one\n- two",
      mdClose: "",
      mdNext: "",
    }, true, false);

    renderer.processMd = vi.fn(() => <div>not code</div>);
    renderer.streamCode("```js\nopen", [], 2, {
      close: false,
      md: "```js\nopen",
      mdClose: "",
      mdNext: "",
    }, true, false);
    renderer.streamCode("```js\ncode\n```", [], 2, {
      close: true,
      md: "```js\ncode\n```",
      mdClose: "```",
      mdNext: "",
    }, true, false);

    renderer.streamCode("```mermaid\ngraph", [], 5, {
      close: false,
      md: "```mermaid\ngraph",
      mdClose: "",
      mdNext: "",
    }, true, false);
    renderer.streamCode("```mermaid\ngraph\n```", [], 5, {
      close: true,
      md: "```mermaid\ngraph\n```",
      mdClose: "```",
      mdNext: "",
    }, true, false);

    renderer.tableCache.head = <tr><th>A</th></tr>;
    renderer.tableCache.data = [<tr key="row"><td>x</td></tr>];
    renderer.streamTable("| A |\n|---|\n| x |", [], 3, {
      close: false,
      md: "| A |\n|---|\n| x |",
      mdClose: "",
      mdNext: "",
    }, true, false);

    renderer.tableCache.head = null;
    renderer.processMd = vi.fn(() => <div>table fallback</div>);
    renderer.streamTable("| unfinished |", [], 6, {
      close: true,
      md: "| unfinished |",
      mdClose: "",
      mdNext: "",
    }, true, false);
    expect(renderer.processMd).toHaveBeenCalledWith(
      "| unfinished |",
      true,
      false,
    );

    renderer.ui.controls.reasoning = false;
    renderer.processMd = vi.fn(() => <div>reasoning</div>);
    renderer.streamReasoning("<think>reasoning", [], 4, {
      close: false,
      md: "<think>reasoning",
      mdClose: "",
      mdNext: "",
    }, true, false);
    expect(scrollDown).toHaveBeenCalled();
  });

  it("falls back to the regular processor for an unknown internal shape", () => {
    const processor = createProcessor("unknown" as any, {} as any);
    expect(processor.processSync("text").result).toBeTruthy();
  });
});
