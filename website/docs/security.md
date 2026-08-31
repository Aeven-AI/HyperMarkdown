---
title: Security and sanitization
---

# Security and sanitization

Treat model output as untrusted input. HyperMarkdown defaults to `html="sanitize"`: raw HTML is parsed and cleaned before math, highlighting, diagrams, or animation run.

Scripts, styles, iframes, forms, and event-handler attributes are removed.

## HTML policies

| Mode | Behavior |
| --- | --- |
| `sanitize` | Default. Parse HTML and remove anything outside the schema. |
| `literal` | Show raw markup as text. Strongest choice for untrusted output. |
| `raw` | Parse without sanitization. Only for content you control. |

```tsx
<HyperMarkdown md={markdown} html="literal" />
```

`sanitize={false}` remains for compatibility and selects raw mode when `html` is not provided. Prefer the explicit `html` prop.

## Extend the schema

```tsx
<HyperMarkdown
  md={markdown}
  allowedTags={{ mention: ["data-user-id"] }}
  linkSafety={{
    allowedLinkPrefixes: ["https://docs.example.com/"],
    allowedImagePrefixes: ["https://images.example.com/"],
    allowDataImages: false,
  }}
/>
```

By default, `http`, `https`, `mailto`, and `tel` protocols are permitted, along with data images. Narrow those defaults when your product has a stricter trust boundary.

Sanitization is not a substitute for controlling what external URLs a browser may request. Combine link safety with your Content Security Policy and image proxy where appropriate.
