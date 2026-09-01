---
title: Link safety
description: Restrict protocols and destinations for links and images rendered from untrusted Markdown.
---

# Link safety

Sanitization decides which HTML can exist. Link safety separately decides
where anchors and images can point. Use both for untrusted model output.

## Defaults

HyperMarkdown permits `http`, `https`, `mailto`, and `tel` URLs by default.
Links open in a new tab with `rel="noreferrer"`. Images load lazily, decode
asynchronously, and use `referrerPolicy="no-referrer"`.

Data images are permitted by default. Narrow that policy when model output
must not embed arbitrary image data.

## Restrict destinations

```tsx
<HyperMarkdown
  md={markdown}
  linkSafety={{
    allowedProtocols: ["https"],
    allowedLinkPrefixes: ["https://docs.example.com/"],
    allowedImagePrefixes: ["https://images.example.com/"],
    allowDataImages: false,
  }}
/>
```

Use `allowedLinkPrefixes: ["*"]` or `allowedImagePrefixes: ["*"]` to allow
any destination that already passed the protocol check.

## Footnotes are local

Footnote references and back-references are recognized separately. They update
the page hash rather than opening a new tab, preserving normal footnote
navigation.

## Defense in depth

URL filtering cannot control what an allowed remote server returns. Combine
the renderer policy with a Content Security Policy and an image proxy when the
application has a strict trust boundary.

## Related guides

- [Security and sanitization](/docs/security)
- [Tables and GFM](/docs/features/gfm)
- [Custom components](/docs/components)

