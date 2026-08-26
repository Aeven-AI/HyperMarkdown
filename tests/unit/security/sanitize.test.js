import { describe, expect, it } from "vitest";

import {
  buildSchema,
  defaultLinkSafety,
  defaultSanitizeSchema,
  resolveLinkSafety,
} from "../../../lib/sanitize";

describe("resolveLinkSafety", () => {
  it("returns all defaults when no policy is supplied", () => {
    expect(resolveLinkSafety()).toEqual(defaultLinkSafety);
  });

  it("merges a partial policy without weakening unspecified rules", () => {
    const policy = resolveLinkSafety({
      allowedProtocols: ["https"],
      allowDataImages: false,
    });

    expect(policy).toEqual({
      allowedProtocols: ["https"],
      allowedLinkPrefixes: ["*"],
      allowedImagePrefixes: ["*"],
      allowDataImages: false,
    });
  });
});

describe("buildSchema", () => {
  it("adds custom tags and HTML/HAST aliases without mutating defaults", () => {
    const originalTags = [...(defaultSanitizeSchema.tagNames ?? [])];
    const schema = buildSchema(
      {
        widget: ["class", "for", "data-id", "aria-label", "title"],
      },
      defaultLinkSafety,
    );

    expect(schema.tagNames).toContain("widget");
    expect(schema.attributes?.widget).toEqual([
      "class",
      "className",
      "for",
      "htmlFor",
      "data-id",
      "dataId",
      "aria-label",
      "ariaLabel",
      "title",
    ]);
    expect(defaultSanitizeSchema.tagNames).toEqual(originalTags);
    expect(defaultSanitizeSchema.tagNames).not.toContain("widget");
  });

  it("keeps existing allowed attributes when extending a standard tag", () => {
    const schema = buildSchema({ code: ["data-language"] }, defaultLinkSafety);

    expect(schema.attributes?.code).toContain("className");
    expect(schema.attributes?.code).toContain("data-language");
    expect(schema.attributes?.code).toContain("dataLanguage");
  });

  it("synchronizes href and src protocols with the link policy", () => {
    const schema = buildSchema(undefined, {
      allowedProtocols: ["https", "ipfs"],
      allowedLinkPrefixes: ["*"],
      allowedImagePrefixes: ["*"],
      allowDataImages: true,
    });

    expect(schema.protocols?.href).toEqual(["https", "ipfs"]);
    expect(schema.protocols?.src).toEqual(["https", "ipfs", "data"]);
  });

  it("does not permit data sources when data images are disabled", () => {
    const schema = buildSchema(undefined, {
      ...defaultLinkSafety,
      allowDataImages: false,
    });

    expect(schema.protocols?.src).not.toContain("data");
  });
});
