---
title: Styling
---

# Styling

Import the package stylesheet once:

```tsx
import "@aeven-ai/hypermarkdown/styles.css";
```

The stylesheet is scoped under `.hypermarkdown`. Theme it through CSS variables instead of depending on internal selectors:

```css
.assistant-message {
  --hm-font: Inter, sans-serif;
  --hm-font-mono: "Geist Mono", monospace;
  --hm-color: #171717;
  --hm-background: #f5f5f5;
  --hm-link-color: #2563eb;
  --hm-radius: 16px;
  --hm-max-width: 100%;
}
```

```tsx
<HyperMarkdown className="assistant-message" md={markdown} />
```

The custom class is added alongside the `hypermarkdown` root class.

## Host responsibilities

The package does not choose your application font or page layout. The host controls the surrounding message bubble, spacing, scroll container, and typography variables.

KaTeX requires its own stylesheet when the math plugin is enabled. Syntax highlighting similarly requires a highlight.js-compatible theme if you want token colors.

## Dark mode

Set variables in your application's existing dark-mode selector:

```css
[data-theme="dark"] .assistant-message {
  --hm-color: #f4f4f5;
  --hm-background: #18181b;
  --hm-link-color: #8ab4ff;
}
```

This avoids coupling HyperMarkdown to a particular theme library or class convention.

To replace rendered tags rather than colors, see [Custom components](/docs/components).
