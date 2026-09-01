---
title: Code highlighting
description: Add highlight.js syntax highlighting to finished and streaming code blocks.
---

# Code highlighting

Code blocks, line numbers, caching, and controls are part of HyperMarkdown's
core. The optional code plugin adds highlight.js token colors.

## Install

```bash
npm install rehype-highlight
```

## Configure

```tsx
import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";
import "highlight.js/styles/github-dark.css";

const plugins = {
  code: highlightPlugin(),
};

<HyperMarkdown md={markdown} plugins={plugins} />
```

Choose any highlight.js-compatible theme stylesheet. HyperMarkdown does not
force a light or dark code theme.

## Pass highlight.js options

`highlightPlugin()` forwards its options to `rehype-highlight`:

```tsx
const plugins = {
  code: highlightPlugin({
    detect: false,
    subset: ["javascript", "typescript", "json", "bash"],
  }),
};
```

Build the plugin object once. Recreating it during render can rebuild the
processing pipelines.

## Streaming behavior

When a fence declares its language, complete lines can be highlighted as they
move into the streaming cache. A line with an unknown or missing language is
left plain rather than guessed independently and given unstable colors.

Word animation pauses streamed highlighting because both features transform
the active text. A finished fence is still processed normally after it
settles.

## Without the plugin

Code remains readable and keeps line numbers, copy, fullscreen, HTML preview,
height limits, and per-line caching. Only syntax token colors are absent.

## Related guides

- [Code blocks](/docs/features/code-blocks)
- [Word animation](/docs/features/animation)
- [Plugin overview](/docs/plugins)

