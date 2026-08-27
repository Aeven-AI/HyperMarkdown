import { beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let Renderer;

beforeAll(async () => {
  Renderer = (await import("../../lib/renderer")).default;
});

function html(md, options = {}) {
  const renderer = new Renderer({ md, streaming: false, ...options });
  return renderToStaticMarkup(renderer.render());
}

function streamed(md, options = {}) {
  const renderer = new Renderer({ streaming: true, ...options });

  for (let i = 0; i < md.length; i += 3) {
    renderer.streamMd(md.slice(i, i + 3), true, false, false);
  }
  renderer.streamMd("", true, false, true);

  return renderToStaticMarkup(renderer.render());
}

describe("sanitization", () => {
  const vectors = {
    script: "<script>alert(1)</script>\n\n",
    img: '<img src=x onerror="alert(1)">\n\n',
    svg: "<svg><script>alert(1)</script></svg>\n\n",
    iframe: '<iframe src="https://evil.test"></iframe>\n\n',
    style: "<style>body { display: none }</style>\n\n",
    handler: '<div onclick="alert(1)">click</div>\n\n',
    form: '<form action="https://evil.test"><input name="p"></form>\n\n',
  };

  Object.keys(vectors).forEach((name) => {
    it(`strips ${name}, streaming and static alike`, () => {
      const source = vectors[name];

      for (const out of [html(source), streamed(source)]) {
        expect(out).not.toContain("<script");
        expect(out).not.toContain("onerror");
        expect(out).not.toContain("onclick");
        expect(out).not.toContain("<iframe");
        expect(out).not.toContain("<style");
        expect(out).not.toContain("<form");
      }
    });
  });

  it("keeps the markdown that is not an attack", () => {
    const out = html(
      "# Title\n\n**bold** and `code` and [a](https://x.test)\n\n",
    );

    expect(out).toContain("<h1");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain('href="https://x.test"');
  });

  it("keeps deliberately allowed tags", () => {
    const out = html('<mark data-id="7">hi</mark>\n\n', {
      allowedTags: { mark: ["data-id"] },
    });

    expect(out).toContain("<mark");
    expect(out).toContain('data-id="7"');
  });

  it("can be turned off for trusted content", () => {
    expect(html("<iframe></iframe>\n\n", { sanitize: false })).toContain(
      "<iframe",
    );
  });
});

describe("link safety", () => {
  it("drops a javascript: link target but keeps its text", () => {
    const out = html("[click](javascript:alert(1))\n\n");

    expect(out).not.toContain("javascript:");
    expect(out).toContain("click");
  });

  it("allows http, https, mailto and tel by default", () => {
    for (const url of [
      "https://x.test",
      "http://x.test",
      "mailto:a@x.test",
      "tel:+1234",
    ]) {
      expect(html(`[go](${url})\n\n`)).toContain(`href="${url}"`);
    }
  });

  it("honours a narrowed protocol list", () => {
    const out = html("[go](http://x.test)\n\n", {
      linkSafety: { allowedProtocols: ["https"] },
    });

    expect(out).not.toContain("http://x.test");
    expect(out).toContain("go");
  });

  it("honours a link prefix allowlist", () => {
    const options = {
      linkSafety: { allowedLinkPrefixes: ["https://ok.test"] },
    };

    expect(html("[go](https://ok.test/a)\n\n", options)).toContain("ok.test/a");
    expect(html("[go](https://evil.test/a)\n\n", options)).not.toContain(
      "evil.test",
    );
  });

  it("keeps relative links, which cannot leave the origin", () => {
    expect(html("[go](/docs/a)\n\n")).toContain('href="/docs/a"');
  });

  it("allows data: images but not data: links", () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

    expect(html(`![x](${png})\n\n`)).toContain("data:image/png");
    expect(
      html("[x](data:text/html,<script>alert(1)</script>)\n\n"),
    ).not.toContain("data:text/html");
  });
});
