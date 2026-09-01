---
sidebar_position: 2
title: Installation
---

# Installation

```bash
npm install @aeven-ai/hypermarkdown
```

React 18 or 19 is required as a peer dependency.

Import the component stylesheet once in your application entry point:

```tsx
import "@aeven-ai/hypermarkdown/styles.css";
```

Then import the component:

```tsx
import {
  HyperMarkdown,
  type HyperMarkdownHandle,
} from "@aeven-ai/hypermarkdown";
```

Math, syntax highlighting, diagrams, and CJK-friendly emphasis are optional. Install only the extras you render; see [Plugins](/docs/plugins).

KaTeX and highlight.js also need their own stylesheets when those plugins are enabled:

```tsx
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
```

Using Next.js? See [SSR, hydration, and Next.js](/docs/ssr) for App Router and
Pages Router setup, client boundaries, plugins, and streaming.

Next: [Finished Markdown](/docs/finished) or [Streaming and delta rendering](/docs/streaming).
