---
sidebar_position: 1
title: Introduction
description: Start here to understand HyperMarkdown's finished and streaming modes, sub-block cache, and recommended path through the documentation.
---

import Link from "@docusaurus/Link";

# Introduction

HyperMarkdown is a streaming-native Markdown renderer for React applications
and AI interfaces. It renders finished documents, but its architecture is
designed around the harder case: a response that changes every few
milliseconds and is often syntactically incomplete.

<div className="docs-quickstart">
  <span>Install</span>
  <code>npm install @aeven-ai/hypermarkdown</code>
  <Link to="/docs/installation">Installation guide →</Link>
</div>

## Choose your path

<div className="docs-path-grid">
  <Link className="docs-path-card" to="/docs/finished">
    <span>01</span>
    <strong>I have complete Markdown</strong>
    <p>Render articles, saved messages, previews, and other finished content with the <code>md</code> prop.</p>
    <b>Finished mode →</b>
  </Link>
  <Link className="docs-path-card" to="/docs/streaming">
    <span>02</span>
    <strong>I receive model deltas</strong>
    <p>Mount one renderer, append each new fragment with <code>write()</code>, and finalize the response once.</p>
    <b>Streaming mode →</b>
  </Link>
  <Link className="docs-path-card" to="/docs/ssr">
    <span>03</span>
    <strong>I use Next.js</strong>
    <p>Server-render finished Markdown, place plugins in the client graph, and hydrate without disabling SSR.</p>
    <b>Next.js and SSR →</b>
  </Link>
</div>

## The core idea

Most renderers receive one growing string. Each token changes that string, so
the active document is parsed and reconciled again—even when nearly all of it
is already finished. HyperMarkdown takes a different input: the **change**.

```text
new delta
   ↓
active block
   ├── settled code lines  → cached
   ├── settled table rows  → cached
   ├── settled list items  → cached
   └── changing frontier   → parsed
```

Completed work stays completed. A thousand-line code block does not become a
thousand-line parsing problem every time another fragment arrives.

## Two rendering modes

Use finished mode when the complete Markdown already exists:

```tsx
import "@aeven-ai/hypermarkdown/styles.css";
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

<HyperMarkdown md={markdown} />
```

Use streaming mode while an answer is arriving:

```tsx
<HyperMarkdown ref={renderer} streaming />
```

Write each new fragment to the mounted renderer. HyperMarkdown owns the active
buffer and exposes stable React output through its internal store.

:::tip The important contract

`write()` accepts **deltas**, not the complete accumulated response. Call
`write("", true)` once when the stream ends so the final open block can settle.

:::

## What is included

| Capability | Support |
| --- | --- |
| Markdown | CommonMark, GFM tables, task lists, autolinks, strikethrough, and footnotes |
| Streaming | Incomplete syntax handling and caches for code lines, table rows, and list items |
| AI output | Collapsible `<think>`, `<thinking>`, and `<reasoning>` blocks |
| Safety | Sanitized raw HTML and configurable link safety controls |
| Optional plugins | highlight.js, KaTeX, Mermaid, and CJK-friendly emphasis |
| React | React 18 and 19, server rendering, hydration, and Next.js |

Heavy features are optional. A project that never renders a Mermaid diagram
never downloads Mermaid.

## Documentation map

| If you want to… | Read |
| --- | --- |
| Install the package and styles | [Installation](/docs/installation) |
| Render complete Markdown | [Finished Markdown](/docs/finished) |
| Connect a model or transport | [Streaming and delta rendering](/docs/streaming) |
| Control an active renderer | [Imperative handle](/docs/handle) |
| Use the App Router or Pages Router | [Next.js and SSR](/docs/ssr) |
| Enable code, math, diagrams, or CJK | [Plugins](/docs/plugins) |
| Understand partial syntax while streaming | [Incomplete Markdown](/docs/features/incomplete-markdown) |
| Configure code and table toolbars | [Block controls](/docs/features/interactivity) |
| Restrict external links and images | [Link safety](/docs/features/link-safety) |
| Theme the output | [Styling](/docs/styling) |
| Compare performance fairly | [Benchmarks](/docs/benchmarks) |
| Move from another renderer | [Migration guides](/docs/migration/streamdown) |
