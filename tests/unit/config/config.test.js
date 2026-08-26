import { describe, expect, it } from "vitest";

import {
  cssLength,
  defaultIcons,
  defaultTranslations,
  resolveUi,
} from "../../../lib/config";

describe("resolveUi", () => {
  it("resolves independent defaults for every block type", () => {
    const ui = resolveUi();

    expect(ui.translations).toEqual(defaultTranslations);
    expect(ui.icons).toEqual(defaultIcons);
    expect(ui.translations).not.toBe(defaultTranslations);
    expect(ui.icons).not.toBe(defaultIcons);
    expect(ui.controls.table).toEqual({
      copy: true,
      fullscreen: true,
      preview: true,
    });
    expect(ui.controls.code).toEqual(ui.controls.table);
    expect(ui.lineNumbers).toBe(true);
  });

  it("merges partial translations and icons without dropping defaults", () => {
    const ui = resolveUi({
      translations: { copy: "Kopieren" },
      icons: { copy: "<svg data-test='copy' />" },
    });

    expect(ui.translations.copy).toBe("Kopieren");
    expect(ui.translations.codeCopied).toBe(defaultTranslations.codeCopied);
    expect(ui.icons.copy).toContain("data-test");
    expect(ui.icons.run).toBe(defaultIcons.run);
  });

  it("supports disabled, enabled, and partially disabled control groups", () => {
    const ui = resolveUi({
      controls: {
        table: false,
        code: true,
        diagram: { copy: false, fullscreen: false },
      },
    });

    expect(ui.controls.table).toEqual({
      copy: false,
      fullscreen: false,
      preview: false,
    });
    expect(ui.controls.code).toEqual({
      copy: true,
      fullscreen: true,
      preview: true,
    });
    expect(ui.controls.diagram).toEqual({
      copy: false,
      fullscreen: false,
      preview: true,
    });
  });

  it("passes presentation limits through and allows line numbers off", () => {
    const ui = resolveUi({
      lineNumbers: false,
      codeBlockMaxHeight: 480,
      tableMaxHeight: "60vh",
    });

    expect(ui.lineNumbers).toBe(false);
    expect(ui.codeBlockMaxHeight).toBe(480);
    expect(ui.tableMaxHeight).toBe("60vh");
  });
});

describe.each([
  [undefined, undefined],
  [0, "0px"],
  [320, "320px"],
  [-1, "-1px"],
  ["42rem", "42rem"],
  ["calc(100vh - 4rem)", "calc(100vh - 4rem)"],
])("cssLength(%j)", (input, expected) => {
  it("normalizes the value", () => {
    expect(cssLength(input)).toBe(expected);
  });
});
