import { describe, expect, it } from "vitest";

import { rehypeLinkSafety } from "../../../lib/rehype/link-safety";

function element(tagName, properties = {}, children = []) {
  return { type: "element", tagName, properties, children };
}

function root(children) {
  return { type: "root", children };
}

function applyPolicy(tree, overrides = {}) {
  const policy = {
    allowedProtocols: ["http", "https", "mailto", "tel"],
    allowedLinkPrefixes: ["*"],
    allowedImagePrefixes: ["*"],
    allowDataImages: true,
    ...overrides,
  };

  rehypeLinkSafety(policy)(tree);
  return tree;
}

describe("rehypeLinkSafety", () => {
  it("keeps allowed absolute and relative destinations", () => {
    const relative = element("a", { href: "/guide" });
    const absolute = element("a", { href: "https://example.com" });
    const tree = root([relative, absolute]);

    applyPolicy(tree);

    expect(relative.properties.href).toBe("/guide");
    expect(absolute.properties.href).toBe("https://example.com");
  });

  it("removes unsafe schemes without removing link content", () => {
    const text = { type: "text", value: "keep me" };
    const link = element("a", { href: " javascript:alert(1)" }, [text]);

    applyPolicy(root([link]));

    expect(link.properties).not.toHaveProperty("href");
    expect(link.children).toEqual([text]);
  });

  it("enforces separate link and image prefix allowlists", () => {
    const link = element("a", { href: "https://docs.example/page" });
    const image = element("img", { src: "https://cdn.example/image.png", alt: "chart" });
    const tree = root([link, image]);

    applyPolicy(tree, {
      allowedLinkPrefixes: ["https://docs.example/"],
      allowedImagePrefixes: ["https://images.example/"],
    });

    expect(link.properties.href).toBe("https://docs.example/page");
    // A disallowed image becomes its alt text: an <img> with the src removed
    // would render as a broken-image placeholder carrying nothing.
    expect(tree.children[1]).toEqual({ type: "text", value: "chart" });
  });

  it("leaves empty text where a disallowed image had no alt", () => {
    const tree = root([element("img", { src: "https://cdn.example/x.png" })]);

    applyPolicy(tree, { allowedImagePrefixes: ["https://images.example/"] });

    expect(tree.children).toEqual([{ type: "text", value: "" }]);
  });

  it("allows only image data URLs when explicitly enabled", () => {
    const image = element("img", { src: "DATA:image/png;base64,AAAA" });
    const link = element("a", { href: "data:text/html,unsafe" });

    applyPolicy(root([image, link]), {
      allowedProtocols: ["https"],
      allowedLinkPrefixes: ["*"],
      allowedImagePrefixes: [],
    });

    expect(image.properties.src).toContain("DATA:image/png");
    expect(link.properties).not.toHaveProperty("href");
  });

  it("rejects data images when disabled", () => {
    const image = element("img", { src: "data:image/svg+xml;base64,AAAA", alt: "logo" });
    const tree = root([image]);

    applyPolicy(tree, {
      allowDataImages: false,
      allowedProtocols: ["https"],
    });

    expect(tree.children).toEqual([{ type: "text", value: "logo" }]);
  });

  it("treats an image whose src sanitization already stripped as rejected", () => {
    // hast-util-sanitize runs first and removes a disallowed scheme outright,
    // so this stage sees an <img> with no src at all — the same verdict.
    const tree = root([element("img", { alt: "diagram" })]);

    applyPolicy(tree);

    expect(tree.children).toEqual([{ type: "text", value: "diagram" }]);
  });

  it("removes the source from a rejected image with no parent to replace", () => {
    const image = element("img", {
      src: "javascript:alert(1)",
      alt: "diagram",
    });

    applyPolicy(image);

    expect(image.properties).not.toHaveProperty("src");
    expect(image.properties.alt).toBe("diagram");
  });

  it("ignores unrelated elements and non-string URL properties", () => {
    const paragraph = element("p", { href: "javascript:ignored" });
    const link = element("a", { href: ["not", "a", "string"] });

    applyPolicy(root([paragraph, link]));

    expect(paragraph.properties.href).toBe("javascript:ignored");
    expect(link.properties.href).toEqual(["not", "a", "string"]);
  });
});
