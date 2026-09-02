---
title: Block controls
description: Configure copy, fullscreen, Mermaid pan and zoom, HTML preview, translations, icons, and host callbacks for rich Markdown blocks.
---

# Block controls and interactivity

HyperMarkdown supplies browser interactions for code blocks, tables, Mermaid
diagrams, and reasoning panels. Server rendering produces stable content;
these controls become active after hydration.

## Default controls

| Block | Controls |
| --- | --- |
| Code | Copy, fullscreen, and HTML preview for finished `html` fences |
| Table | Copy and fullscreen |
| Mermaid | Copy diagram source, fullscreen, pan, zoom, and reset view |
| Reasoning | Expand and collapse |

## Configure each block

```tsx
<HyperMarkdown
  md={markdown}
  controls={{
    reasoning: true,
    code: { copy: true, fullscreen: true, preview: false },
    table: { copy: true, fullscreen: false },
    diagram: { copy: true, fullscreen: true, panZoom: false },
  }}
/>
```

Passing `false` for code, table, or diagram disables that block's controls.
Set `diagram.panZoom` to `false` to disable the diagram's zoom buttons,
Ctrl/⌘ wheel zoom, and pointer or touch panning. Passing `reasoning: false` keeps the
reasoning content but removes its disclosure wrapper.

## Host callbacks

```tsx
<HyperMarkdown
  md={markdown}
  onFullscreenChange={(fullscreen) => setChromeHidden(fullscreen)}
  onAlert={(alert) => showAlert(alert)}
/>
```

- `onFullscreenChange` reports fullscreen changes from code, table, and
  diagram blocks.
- `onAlert` lets the host present pending or unavailable HTML preview messages
  instead of relying on renderer-owned UI.
- `scrollDown` runs after each committed streaming update, when the new DOM can
  be measured.

## Labels and icons

All renderer-owned strings can be changed through `translations`, and toolbar
icons can be replaced with inline SVG markup through `icons`. See
[Localization](/docs/features/localization) for the complete pattern.

## Related guides

- [Configuration](/docs/configuration)
- [Code blocks](/docs/features/code-blocks)
- [Reasoning blocks](/docs/reasoning)
