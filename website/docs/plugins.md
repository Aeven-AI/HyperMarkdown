---
title: Plugin overview
sidebar_label: Overview
description: Configure HyperMarkdown's optional code, math, Mermaid, and CJK plugins without adding unused engines to the core bundle.
---

# Optional plugins

Math, syntax highlighting, diagrams, and CJK-friendly emphasis are optional.
Install only what your interface renders. A missing plugin has a readable
fallback instead of making the renderer fail.

| Plugin | Adds | Guide |
| --- | --- | --- |
| Code | highlight.js syntax colors for settled blocks and streamed lines | [Code highlighting](/docs/plugins/code) |
| Math | KaTeX rendering for inline and display TeX | [KaTeX math](/docs/plugins/math) |
| Diagram | Lazy-loaded Mermaid fences | [Mermaid diagrams](/docs/plugins/mermaid) |
| CJK | Emphasis rules that work around CJK punctuation | [CJK emphasis](/docs/plugins/cjk) |

## Install

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
import "highlight.js/styles/github-dark.css";

const plugins = {
  math: katexPlugin(),
  code: highlightPlugin(),
  diagram: mermaidPlugin({ theme: "neutral" }),
  cjk: cjkPlugin(),
};

<HyperMarkdown md={markdown} plugins={plugins} />
```

Build plugin objects once or memoize them. A new object can require new processing pipelines.

## Graceful fallbacks

| Missing plugin | Result |
| --- | --- |
| Math | `$x$` remains literal text |
| Code | Code remains cached with controls and line numbers, but unhighlighted |
| Diagram | Mermaid fences render as ordinary code |
| CJK | Standard CommonMark emphasis rules apply |

## Mermaid loading

Mermaid is dynamically imported on first use. A document without diagrams
never downloads it. The opening Mermaid fence starts loading while the rest of
the diagram is still arriving; set `preload` when diagrams are expected
immediately.

## Keep plugin identities stable

Create plugins at module scope or memoize them. HyperMarkdown reuses frozen
processing pipelines, and a new plugin object can require new pipelines. The
Mermaid plugin also retains its loaded engine inside the plugin object.

## Custom feature plugins

The exported `MathPlugin`, `CodeHighlighterPlugin`, `DiagramPlugin`, and
`CjkPlugin` interfaces let you replace the default engines without exposing
arbitrary processor mutation through the component API.
