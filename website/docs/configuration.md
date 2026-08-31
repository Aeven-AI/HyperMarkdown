---
title: Configuration
---

# Configuration

HyperMarkdown keeps the common path small while exposing presentation and integration controls as typed props.

## Animation and preload

```tsx
<HyperMarkdown
  ref={renderer}
  streaming
  animation
  preload
  plugins={plugins}
/>
```

`animation` fades arriving words. It also disables streamed syntax highlighting, because both features want to own the same text. `preload` begins loading the configured diagram engine on mount; it does not load plugins you did not configure.

## Block controls

```tsx
<HyperMarkdown
  md={markdown}
  controls={{
    reasoning: true,
    code: { copy: true, fullscreen: true, preview: false },
    table: { copy: true, fullscreen: true },
    diagram: false,
  }}
/>
```

Passing `false` hides a block toolbar. Reasoning `false` renders reasoning without the collapsible wrapper.

## Size limits

```tsx
<HyperMarkdown
  md={markdown}
  lineNumbers={false}
  codeBlockMaxHeight={480}
  tableMaxHeight="60vh"
/>
```

Numbers are interpreted as pixels. CSS length strings are used as written.

## Localization

```tsx
<HyperMarkdown
  md={markdown}
  translations={{
    copy: "Kopiëren",
    thinking: "Denken…",
    thoughtFor: "Dacht {seconds}s na",
  }}
/>
```

Toolbar icons can be replaced with inline SVG strings through `icons`.

## Host callbacks

- `scrollDown()` runs after every committed update.
- `onFullscreenChange(value)` lets the host hide surrounding chrome.
- `onAlert(alert)` lets the host present preview errors or pending messages.

Keep callbacks stable when possible. HyperMarkdown updates late-bound streaming options without rebuilding its processing pipeline.
