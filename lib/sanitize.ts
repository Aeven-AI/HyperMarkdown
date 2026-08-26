import { defaultSchema } from "rehype-sanitize";

import type { Options as SanitizeSchema } from "rehype-sanitize";

/** Extra attributes to permit on a tag, keyed by tag name. */
export type AllowedTags = Record<string, string[]>;

/**
 * What the renderer allows through when it sanitizes.
 *
 * Sanitization runs immediately after raw HTML is parsed and before anything
 * this renderer generates itself — maths, highlighting, diagram elements and
 * word-animation spans are all produced from already-clean content, so none of
 * them has to be whitelisted here.
 */
export const defaultSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,

  // remark-rehype already prefixes footnote ids and backref hrefs with
  // `user-content-`. hast-util-sanitize's own clobberPrefix is the same, which
  // would double-prefix the ids while leaving the hrefs pointing at the
  // undoubled anchors.
  clobberPrefix: "",

  // Drop these elements *with* their contents. The default only does this for
  // <script>, which leaves a stripped <style> spilling its CSS into the page as
  // visible text — and CSS from untrusted markdown is not harmless either: a
  // fixed-position rule can cover the page with whatever it likes.
  strip: [...defaultSchema.strip!, "style"],

  attributes: {
    ...defaultSchema.attributes,
    // A fence's language is what tells the diagram and highlight stages what
    // they are looking at.
    code: [...defaultSchema.attributes!["code"]!, "className"],
    span: ["className"],
  },
};

/** Where links and images are allowed to point. */
export interface LinkSafetyConfig {
  /** URL schemes permitted on href and src. */
  allowedProtocols?: string[] | undefined;
  /** Link targets must start with one of these. `["*"]` allows any. */
  allowedLinkPrefixes?: string[] | undefined;
  /** Image sources must start with one of these. `["*"]` allows any. */
  allowedImagePrefixes?: string[] | undefined;
  /** Permit `data:` image sources, which prefixes alone cannot express. */
  allowDataImages?: boolean | undefined;
}

/** The same settings once defaults have been filled in. */
export interface ResolvedLinkSafety {
  allowedProtocols: string[];
  allowedLinkPrefixes: string[];
  allowedImagePrefixes: string[];
  allowDataImages: boolean;
}

export const defaultLinkSafety: ResolvedLinkSafety = {
  allowedProtocols: ["http", "https", "mailto", "tel"],
  allowedLinkPrefixes: ["*"],
  allowedImagePrefixes: ["*"],
  allowDataImages: true,
};

/**
 * hast-util-sanitize matches on hast property names, not HTML attribute names
 * — `className`, not `class`; `dataId`, not `data-id`. Callers should not have
 * to know that, so both spellings are accepted and both are added.
 */
function propertyNames(attribute: string): string[] {
  if (attribute === "class") {
    return [attribute, "className"];
  }

  if (attribute === "for") {
    return [attribute, "htmlFor"];
  }

  if (/^(data|aria)-/.test(attribute)) {
    return [
      attribute,
      attribute.replace(/-([a-z0-9])/g, (_m, ch) => String(ch).toUpperCase()),
    ];
  }

  return [attribute];
}

/**
 * Build the sanitization schema for a given configuration.
 *
 * The protocol lists have to be kept in step with the link-safety settings:
 * sanitization runs first, so a scheme it strips never reaches the link check,
 * no matter what that check would have allowed.
 */
export function buildSchema(
  allowedTags: AllowedTags | undefined,
  linkSafety: ResolvedLinkSafety,
): SanitizeSchema {
  const tagNames = [...defaultSanitizeSchema.tagNames!];
  const attributes = { ...defaultSanitizeSchema.attributes };

  for (const tag of Object.keys(allowedTags ?? {})) {
    if (!tagNames.includes(tag)) {
      tagNames.push(tag);
    }

    const extra = allowedTags![tag]!.flatMap(propertyNames);
    attributes[tag] = [...(attributes[tag] ?? []), ...extra];
  }

  const src = [...linkSafety.allowedProtocols];

  if (linkSafety.allowDataImages) {
    src.push("data");
  }

  return {
    ...defaultSanitizeSchema,
    tagNames,
    attributes,
    protocols: {
      ...defaultSanitizeSchema.protocols,
      href: [...linkSafety.allowedProtocols],
      src,
    },
  };
}

export function resolveLinkSafety(
  config: LinkSafetyConfig | undefined,
): ResolvedLinkSafety {
  return {
    allowedProtocols:
      config?.allowedProtocols ?? defaultLinkSafety.allowedProtocols,
    allowedLinkPrefixes:
      config?.allowedLinkPrefixes ?? defaultLinkSafety.allowedLinkPrefixes,
    allowedImagePrefixes:
      config?.allowedImagePrefixes ?? defaultLinkSafety.allowedImagePrefixes,
    allowDataImages:
      config?.allowDataImages ?? defaultLinkSafety.allowDataImages,
  };
}
