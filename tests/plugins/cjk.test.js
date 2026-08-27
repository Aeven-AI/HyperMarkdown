import { describe, expect, it } from "vitest";
import { cjkPlugin } from "../../lib/plugins/cjk";
import { parseMarkup, renderStatic, renderStreamed } from "../helpers/render";

describe("cjk plugin", () => {
  const source = "**日本語（説明）**続き、*中文【备注】*，~~한국어（이전）~~。";

  it("leaves CJK emphasis unstyled without the plugin", () => {
    expect(parseMarkup(renderStatic(source)).querySelector("strong")).toBe(
      null,
    );
  });

  it("emphasises across CJK punctuation with the plugin", () => {
    const options = { plugins: { cjk: cjkPlugin() } };

    for (const markup of [
      renderStatic(source, options),
      renderStreamed(source, 2, options),
    ]) {
      const document = parseMarkup(markup);

      expect(document.querySelector("strong")?.textContent).toBe(
        "日本語（説明）",
      );
      expect(document.querySelector("em")?.textContent).toBe("中文【备注】");
      expect(document.querySelector("del")?.textContent).toBe("한국어（이전）");
      expect(document.body.textContent).toBe(
        "日本語（説明）続き、中文【备注】，한국어（이전）。",
      );
    }
  });
});
