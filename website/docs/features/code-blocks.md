---
title: Code blocks
description: Configure streamed code blocks, syntax highlighting, line numbers, sizing, copy, fullscreen, and HTML preview controls.
---

# Code blocks

Fenced code blocks work without an optional plugin. They include per-line
streaming caches, a language header, line numbers, copy controls, fullscreen,
and an HTML preview action.

````markdown
```tsx
export function Answer() {
  return <strong>Ready</strong>;
}
```
````

## Syntax highlighting

Add the code plugin when you want highlight.js token colors:

```bash
npm install rehype-highlight
```

```tsx
import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";
import "highlight.js/styles/github-dark.css";

const plugins = { code: highlightPlugin() };

<HyperMarkdown md={markdown} plugins={plugins} />
```

See [Code highlighting](/docs/plugins/code) for plugin options and streaming
behavior.

## Line numbers and height

Line numbers are enabled by default. Disable them or constrain tall blocks:

```tsx
<HyperMarkdown
  md={markdown}
  lineNumbers={false}
  codeBlockMaxHeight={480}
/>
```

Numbers are pixels. CSS lengths such as `"60vh"` or `"32rem"` are used as
written.

## Controls

```tsx
<HyperMarkdown
  md={markdown}
  controls={{
    code: {
      copy: true,
      fullscreen: true,
      preview: false,
    },
  }}
/>
```

Pass `code: false` to hide the complete code toolbar.

The preview control is shown only for `html` fences. Previewing is delayed
until the fence finishes; use `onAlert` when the host should render its own
pending or unavailable message.

## Streaming behavior

Complete lines move into the code cache while the final line remains active.
With the highlight.js plugin, declared languages can be highlighted line by
line during streaming. Undeclared or unknown languages remain readable as
plain code.

## Related guides

- [Code highlighting](/docs/plugins/code)
- [Block controls](/docs/features/interactivity)
- [Styling](/docs/styling)

