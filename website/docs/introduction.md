---
sidebar_position: 1
title: Introduction
---

# Introduction

HyperMarkdown is a streaming-native Markdown renderer for React applications and AI interfaces.

Most renderers receive one growing string. Each token changes that string, so the active document is parsed and reconciled again—even when nearly all of it is already finished. HyperMarkdown takes a different input: the **change**.

```text
new delta
   ↓
active block
   ├── settled code lines  → cached
   ├── settled table rows  → cached
   ├── settled list items  → cached
   └── changing frontier   → parsed
```

Completed work stays completed. A thousand-line code block does not become a thousand-line parsing problem every time another fragment arrives.

## Two rendering modes

Use finished mode when the complete Markdown already exists:

```tsx
<HyperMarkdown md={markdown} />
```

Use streaming mode while an answer is arriving:

```tsx
<HyperMarkdown ref={renderer} streaming />
```

Write each new fragment to the mounted renderer. HyperMarkdown owns the active buffer and exposes stable React output through its internal store.

## What is included

- CommonMark and GitHub Flavored Markdown
- Streaming-safe incomplete Markdown handling
- Per-line code, per-row table, and per-item list caches
- Task lists, autolinks, strikethrough, and footnotes
- Collapsible `<think>`, `<thinking>`, and `<reasoning>` blocks
- Sanitized raw HTML and link safety controls
- Code, KaTeX, Mermaid, and CJK plugins
- React 18 and React 19 support

Heavy features are optional. A project that never renders a Mermaid diagram never downloads Mermaid.

## Where to go next

Start with [Installation](/docs/installation), then read [Streaming and delta rendering](/docs/streaming) before connecting a model provider.
