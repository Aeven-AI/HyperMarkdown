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

## HTML previews

A code block holding HTML offers a **Preview** button. By default the block opens that HTML as a page of its own, from a blob URL: a real document with a real address, which reloads, inspects and views source like any other page, and runs in its own scope rather than the app's. It needs no route, no storage and no navigation from the host.

If no window can be opened — a blocked popup, or a host embedded without `allow-popups` — the block reports it through `onAlert` instead.

To send previews to a page you serve, give `preview` a `url`. The HTML is written to `localStorage` first, and your page reads it back.

```tsx
<HyperMarkdown md={markdown} preview={{ url: "/preview-code/{id}" }} />
```

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` or `(id) => string` | The page to open. `{id}` is replaced with the block's id. Unset means the built-in preview. |
| `storageKey` | `string` or `(id) => string` | Key the HTML is written to. Defaults to `preview-{id}`. Only used with `url`. |

Both accept a function when substitution is not enough, for a hash route or an encoded query.

The previewed HTML runs with your origin. Serving your own preview page is what lets you decide how far to trust it — rendering it inside a sandboxed iframe, for instance.

## Host callbacks

- `scrollDown()` runs after every committed update.
- `onFullscreenChange(value)` lets the host hide surrounding chrome.
- `onAlert(alert)` lets the host present preview errors or pending messages.

Keep callbacks stable when possible. HyperMarkdown updates late-bound streaming options without rebuilding its processing pipeline.
