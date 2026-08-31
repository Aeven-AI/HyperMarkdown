---
title: Plugins
---

# Code, math, Mermaid, and CJK plugins

Math, syntax highlighting, diagrams, and CJK-friendly emphasis are optional. Install only what your interface renders.

```bash
npm install katex remark-math rehype-katex
npm install rehype-highlight
npm install mermaid
npm install remark-cjk-friendly
```

## Configure once

```tsx
import { katexPlugin } from "@aeven-ai/hypermarkdown/plugins/math";
import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";
import { mermaidPlugin } from "@aeven-ai/hypermarkdown/plugins/mermaid";
import { cjkPlugin } from "@aeven-ai/hypermarkdown/plugins/cjk";
import "katex/dist/katex.min.css";

const plugins = {
  math: katexPlugin(),
  code: highlightPlugin(),
  diagram: mermaidPlugin({ theme: "neutral" }),
  cjk: cjkPlugin(),
};

<HyperMarkdown md={markdown} plugins={plugins} />
```

Build plugin objects once or memoize them. A new object can require new processing pipelines.

## Graceful fallback

| Missing plugin | Result |
| --- | --- |
| Math | `$x$` remains literal text |
| Code | Code remains cached with controls and line numbers, but unhighlighted |
| Diagram | Mermaid fences render as ordinary code |
| CJK | Standard CommonMark emphasis rules apply |

## Mermaid loading

Mermaid is dynamically imported on first use. A document without diagrams never downloads it. The opening Mermaid fence starts loading while the rest of the diagram is still arriving; set `preload` when diagrams are expected immediately.

## Custom feature plugins

The exported `MathPlugin`, `CodeHighlighterPlugin`, and `DiagramPlugin` interfaces let you replace the default engines without exposing arbitrary processor mutation through the component API.
