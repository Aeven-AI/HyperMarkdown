---
title: Localization
description: Translate HyperMarkdown's UI labels and replace toolbar icons without changing renderer internals.
---

# Localization

HyperMarkdown keeps every renderer-owned string in the `translations` prop.
Override only the labels your application needs; omitted values retain their
English defaults.

```tsx
<HyperMarkdown
  md={markdown}
  translations={{
    table: "Tabel",
    diagram: "Diagram",
    copy: "Kopiëren",
    thinking: "Denken…",
    thoughtFor: "Dacht {seconds}s na",
  }}
/>
```

The `{seconds}` placeholder in `thoughtFor` is replaced with the measured
reasoning duration.

## Translation keys

| Area | Keys |
| --- | --- |
| Block titles | `table`, `diagram` |
| Reasoning | `thinking`, `thoughtFor` |
| Actions | `copy`, `copyCode`, `fullScreen`, `exitFullScreen`, `preview`, `dismiss` |
| Diagram view | `zoomIn`, `zoomOut`, `resetView` |
| Copy feedback | `tableCopied`, `tablePartiallyCopied`, `codeCopied`, `codePartiallyCopied` |
| HTML preview | `previewPendingTitle`, `previewPendingBody`, `previewUnavailableTitle`, `previewUnavailableBody` |

## Replace icons

Toolbar icons are inline SVG strings so they can match an existing design
system without adding an icon dependency:

```tsx
<HyperMarkdown
  md={markdown}
  icons={{
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true">…</svg>',
  }}
/>
```

The available icon keys are `copy`, `maximize`, `minimize`, `run`, `zoomIn`,
`zoomOut`, `resetView`, and `chevron`.

## Keep configuration stable

Define translations and icons at module scope, or memoize them. Stable objects
avoid unnecessary work in a component that may receive many streaming
updates.

## Related guides

- [Configuration](/docs/configuration)
- [Block controls](/docs/features/interactivity)
- [Reasoning blocks](/docs/reasoning)
