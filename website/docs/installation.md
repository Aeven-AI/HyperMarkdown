---
sidebar_position: 2
title: Installation
sidebar_label: Getting Started
description: Install HyperMarkdown, import its stylesheet, render your first document, and choose optional plugins.
---

# Getting Started

Install HyperMarkdown and render your first document in a few minutes.

## Requirements

- React 18 or React 19
- React DOM matching your React major version
- A bundler or framework that supports ES modules and CSS imports

## Install

```bash
npm install @aeven-ai/hypermarkdown
```

React 18 or 19 is required as a peer dependency.

## Import the stylesheet

Import the component stylesheet once in your application entry point:

```tsx
import "@aeven-ai/hypermarkdown/styles.css";
```

In Next.js App Router projects, put this import in `app/layout.tsx`. With the
Pages Router, import it from `pages/_app.tsx`.

## Render your first document

```tsx
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

export function Article({ markdown }: { markdown: string }) {
  return <HyperMarkdown md={markdown} />;
}
```

Updating `md` replaces the finished document. Use this mode for articles,
previews, and saved message history.

For a model response that is still arriving, mount one streaming renderer and
write deltas through its ref:

```tsx
import { useRef } from "react";
import {
  HyperMarkdown,
  type HyperMarkdownHandle,
} from "@aeven-ai/hypermarkdown";

const renderer = useRef<HyperMarkdownHandle>(null);

<HyperMarkdown ref={renderer} streaming />;
```

Continue with [Streaming and delta rendering](/docs/streaming) for the complete
write, finalize, and reset contract.

## Add optional features

Math, syntax highlighting, diagrams, and CJK-friendly emphasis are optional. Install only the extras you render; see [Plugins](/docs/plugins).

KaTeX and highlight.js also need their own stylesheets when those plugins are enabled:

```tsx
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
```

| If you need… | Install and read |
| --- | --- |
| Syntax highlighting | [Code highlighting](/docs/plugins/code) |
| Inline and display math | [KaTeX math](/docs/plugins/math) |
| Mermaid diagrams | [Mermaid diagrams](/docs/plugins/mermaid) |
| CJK-friendly emphasis | [CJK emphasis](/docs/plugins/cjk) |

## Next steps

Using Next.js? See [SSR, hydration, and Next.js](/docs/ssr) for App Router and
Pages Router setup, client boundaries, plugins, and streaming.

- [Basic usage](/docs/finished)
- [Streaming and delta rendering](/docs/streaming)
- [Configuration](/docs/configuration)
