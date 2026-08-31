---
title: API reference
---

# API reference

## HyperMarkdown props

| Prop | Type | Purpose |
| --- | --- | --- |
| `md` | `string` | Finished Markdown; ignored in streaming mode. |
| `streaming` | `boolean` | Receive content through the imperative handle. |
| `animation` | `boolean` | Fade arriving words in. |
| `plugins` | `PluginConfig` | Optional math, code, diagram, and CJK plugins. |
| `preload` | `boolean` | Load the configured diagram engine on mount. |
| `components` | `RendererComponents` | Stable tag-to-component overrides. |
| `html` | `sanitize \| literal \| raw` | Raw HTML policy. |
| `allowedTags` | `Record<string, string[]>` | Additional sanitized tags and attributes. |
| `linkSafety` | `LinkSafetyConfig` | Allowed URL protocols and prefixes. |
| `reasoningTarget` | element or callback | Optional reasoning portal target. |
| `controls` | `ControlsConfig` | Configure block toolbars and reasoning. |
| `translations` | `Partial<Translations>` | Override user-facing strings. |
| `icons` | `Partial<IconMap>` | Override toolbar SVG markup. |
| `lineNumbers` | `boolean` | Show code line numbers; defaults to true. |
| `codeBlockMaxHeight` | number or CSS length | Code scrolling threshold. |
| `tableMaxHeight` | number or CSS length | Table scrolling threshold. |
| `scrollDown` | callback | Runs after each committed update. |
| `onFullscreenChange` | callback | Reports fullscreen block state. |
| `onAlert` | callback | Presents preview alerts through the host. |
| `className` | `string` | Additional root class. |

## Imperative handle

```ts
interface HyperMarkdownHandle {
  write(delta: string, finalize?: boolean): void;
  reset(): void;
  readonly store: HyperMarkdownStore;
  /** @deprecated */
  readonly stream: HyperMarkdownStore;
}
```

Most integrations only need `write()` and `reset()`. The store is exposed for advanced subscriptions and direct integration.

## Exports

The main entry exports `HyperMarkdown`, its props and handle types, configuration and plugin types, `convertMath`, and the deprecated `MarkdownStream` compatibility engine.

Plugin entry points are separate:

```tsx
import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";
import { katexPlugin } from "@aeven-ai/hypermarkdown/plugins/math";
import { mermaidPlugin } from "@aeven-ai/hypermarkdown/plugins/mermaid";
import { cjkPlugin } from "@aeven-ai/hypermarkdown/plugins/cjk";
```
