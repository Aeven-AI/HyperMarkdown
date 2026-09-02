import { describe, expect, it } from "vitest";

import {
  cssLength,
  defaultIcons,
  defaultTranslations,
  previewValue,
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
    expect(ui.controls.diagram).toEqual({
      copy: true,
      fullscreen: true,
      preview: true,
      panZoom: true,
    });
    expect(ui.lineNumbers).toBe(true);
  });

  it("turns pan and zoom off with the rest of a hidden diagram toolbar", () => {
    // `false` hides the toolbar, and there is nothing left to pan or zoom
    // with. The object form is the one that keeps copy and fullscreen while
    // dropping only the zoom controls.
    expect(resolveUi({ controls: { diagram: false } }).controls.diagram).toEqual({
      copy: false,
      fullscreen: false,
      preview: false,
      panZoom: false,
    });

    expect(resolveUi({ controls: { diagram: true } }).controls.diagram.panZoom).toBe(
      true,
    );

    // Absent means on, like every other diagram control.
    expect(resolveUi({ controls: {} }).controls.diagram.panZoom).toBe(true);

    expect(
      resolveUi({ controls: { diagram: { panZoom: false } } }).controls.diagram,
    ).toEqual({
      copy: true,
      fullscreen: true,
      preview: true,
      panZoom: false,
    });
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
        diagram: { copy: false, fullscreen: false, panZoom: false },
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
      panZoom: false,
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

describe("preview config", () => {
  it("carries nothing of its own until the host says otherwise", () => {
    // An empty config is what tells a code block to open its own page.
    expect(resolveUi().preview).toEqual({});
  });

  it("keeps what the host configured", () => {
    const ui = resolveUi({
      preview: { url: "/p/{id}", storageKey: "k-{id}" },
    });

    expect(ui.preview.url).toBe("/p/{id}");
    expect(ui.preview.storageKey).toBe("k-{id}");
  });

  it("copies the config rather than holding the host's object", () => {
    const preview = { url: "/p/{id}" };
    const ui = resolveUi({ preview });

    expect(ui.preview).toEqual(preview);
    expect(ui.preview).not.toBe(preview);
  });
});

describe("previewValue", () => {
  it("replaces every {id} in a template", () => {
    expect(previewValue("/p/{id}", "7")).toBe("/p/7");
    expect(previewValue("/p/{id}?k={id}", "7")).toBe("/p/7?k=7");
    expect(previewValue("/p/none", "7")).toBe("/p/none");
  });

  it("hands the id to a function, for routes substitution cannot reach", () => {
    expect(previewValue((id) => `/p#${encodeURIComponent(id)}`, "a b")).toBe(
      "/p#a%20b",
    );
  });

  it("falls back to its own template when nothing is configured", () => {
    expect(previewValue(undefined, "7", "preview-{id}")).toBe("preview-7");
    expect(previewValue(undefined, "7", "")).toBe("");
  });
});
