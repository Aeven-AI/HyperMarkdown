import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let Renderer;

beforeAll(async () => {
  Renderer = (await import("../../lib/renderer")).default;
});

function html(md, options = {}) {
  return renderToStaticMarkup(
    new Renderer({ md, streaming: false, ...options }).render(),
  );
}

const table = "| A | B |\n|---|---|\n| 1 | 2 |\n\n";
const code = "```js\nconst a = 1;\n```\n\n";

describe("translations", () => {
  it("uses English by default", () => {
    expect(html(table)).toContain(">Table<");
  });

  it("takes an override for any subset", () => {
    const out = html(table, { translations: { table: "Tabel" } });

    expect(out).toContain(">Tabel<");
    expect(out).not.toContain(">Table<");
  });

  it("keeps the defaults for strings not overridden", async () => {
    // Tooltip text is not in the server markup — Tippy only renders it on
    // show — so the merge is checked where it happens.
    const { resolveUi } = await import("../../lib/config");
    const ui = resolveUi({ translations: { table: "Tabel" } });

    expect(ui.translations.table).toBe("Tabel");
    expect(ui.translations.copy).toBe("Copy");
    expect(ui.translations.fullScreen).toBe("Full screen");
  });
});

describe("icons", () => {
  it("takes replacement markup", () => {
    const out = html(table, { icons: { copy: "<svg id='mine'></svg>" } });
    expect(out).toContain("mine");
  });
});

describe("controls", () => {
  it("shows both table buttons by default", () => {
    const out = html(table);

    expect(out).toContain("table-icon-button first");
    expect(out).toContain("table-icon-button last");
  });

  it("hides a single button", () => {
    const out = html(table, { controls: { table: { copy: false } } });

    expect(out).toContain("table-icon-button first");
    expect(out).not.toContain("table-icon-button last");
  });

  it("hides every button for a block kind", () => {
    const out = html(table, { controls: { table: false } });

    expect(out).not.toContain("table-icon-button");
    expect(out).toContain("<table");
  });

  it("leaves other block kinds alone", () => {
    const out = html(table + code, { controls: { table: false } });

    expect(out).not.toContain("table-icon-button");
    expect(out).toContain("codeblock-icon-button");
  });
});

describe("line numbers", () => {
  it("renders the gutter by default", () => {
    expect(html(code)).toContain("line-numbers");
  });

  it("can be turned off", () => {
    expect(html(code, { lineNumbers: false })).not.toContain("line-numbers");
  });
});

describe("max heights", () => {
  it("emits no style by default", () => {
    expect(html(code)).not.toContain("max-height");
  });

  it("treats a number as pixels", () => {
    expect(html(code, { codeBlockMaxHeight: 400 })).toContain(
      "max-height:400px",
    );
    expect(html(table, { tableMaxHeight: "20rem" })).toContain(
      "max-height:20rem",
    );
  });
});

describe("className", () => {
  it("always carries the class the stylesheet is scoped under", () => {
    expect(html("hi\n\n")).toBe('<div class="hypermarkdown"><p>hi</p></div>');
  });

  it("appends a caller's class rather than replacing it", () => {
    expect(html("hi\n\n", { className: "prose" })).toBe(
      '<div class="hypermarkdown prose"><p>hi</p></div>',
    );
  });
});
