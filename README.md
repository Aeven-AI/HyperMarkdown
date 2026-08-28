# HyperMarkdown

A streaming-aware markdown renderer for React. It is built for token-by-token
model output: incomplete markup is never shown as raw text, and settled content
is not re-parsed on every chunk.

## Install

```bash
pnpm add @aeven/hypermarkdown
```

React 18 or 19 is a peer dependency. Maths, syntax highlighting and diagrams
are not installed — see [Plugins](#plugins).

```tsx
import { HyperMarkdown, type HyperMarkdownHandle } from "@aeven/hypermarkdown";
```

## Rendering a finished document

```tsx
<HyperMarkdown md={markdown} />
```

## Rendering a stream

Hold a ref and push chunks in as they arrive. The component keeps its own
buffer, so pass each delta rather than the accumulated text.

```tsx
const renderer = useRef<HyperMarkdownHandle>(null);

for await (const delta of stream) {
  renderer.current?.write(delta);
}
renderer.current?.write("", true); // finalize

<HyperMarkdown ref={renderer} streaming animation scrollDown={pinToBottom} />;
```

| prop | type | meaning |
| --- | --- | --- |
| `md` | `string` | Markdown to render in one go. Ignored while `streaming`. |
| `streaming` | `boolean` | Take content through the imperative `write()` API instead of `md`. |
| `animation` | `boolean` | Fade words in as they arrive. |
| `scrollDown` | `() => void` | Called after each render, to keep the view pinned. |
| `onFullscreenChange` | `(fullscreen: boolean) => void` | A code block, table or diagram entered or left fullscreen. Hide your own navigation and input chrome here, or the block ends up fullscreen underneath it. |
| `onAlert` | `(alert: { header, content, buttonText }) => void` | A block wants to tell the reader something. Without a handler the message is dropped, since the component has no dialog of its own. |
| `plugins` | `PluginConfig` | Maths, syntax highlighting and diagrams. See below — none is bundled. |
| `preload` | `boolean` | Start fetching the diagram engine on mount rather than when a diagram appears. |
| `sanitize` | `boolean` | Turn sanitization off. Only for content you produced yourself. Default `true`. |
| `allowedTags` | `Record<string, string[]>` | Extra tags and attributes to let through sanitization. |
| `linkSafety` | `LinkSafetyConfig` | Which URL schemes and prefixes links and images may use. |
| `translations` | `Partial<Translations>` | Override any of the strings the toolbars show. |
| `icons` | `Partial<IconMap>` | Override any toolbar icon, as inline `<svg>` markup. |
| `controls` | `ControlsConfig` | Which buttons each kind of block offers; `false` hides a block's toolbar. |
| `lineNumbers` | `boolean` | The line-number gutter on code blocks. Default `true`. |
| `codeBlockMaxHeight` | `number \| string` | Height at which a code block starts scrolling. Numbers are px. |
| `tableMaxHeight` | `number \| string` | Height at which a table starts scrolling. Numbers are px. |
| `className` | `string` | Class for a wrapping `<div>`. Without one, blocks render into a fragment. |

## Plugins

Maths, syntax highlighting and diagrams are the three heavy dependencies —
katex, highlight.js and mermaid between them dwarf everything else here. None
of them is a dependency of this package. Install the ones you want and pass
them in:

```bash
npm install katex remark-math rehype-katex   # maths
npm install rehype-highlight                 # syntax highlighting
npm install mermaid                          # diagrams
npm install remark-cjk-friendly              # CJK-friendly emphasis
```

```tsx
import { katexPlugin } from "@aeven/hypermarkdown/plugins/math";
import { highlightPlugin } from "@aeven/hypermarkdown/plugins/code";
import { mermaidPlugin } from "@aeven/hypermarkdown/plugins/mermaid";
import { cjkPlugin } from "@aeven/hypermarkdown/plugins/cjk";

// Build once: a new plugin object rebuilds every pipeline.
const plugins = {
  math: katexPlugin(),
  code: highlightPlugin(),
  diagram: mermaidPlugin(),
  cjk: cjkPlugin(),
};

<HyperMarkdown md={md} plugins={plugins} />;
```

Each slot degrades rather than breaks when left empty:

| missing | what happens |
| --- | --- |
| `math` | `$x$` stays literal text, and the `\(…\)` normalisation is skipped |
| `code` | code blocks render with their toolbar and line numbers, unhighlighted |
| `diagram` | a ```` ```mermaid ```` fence renders as an ordinary code block |
| `cjk` | `**日本語（説明）**続き` keeps its asterisks — CommonMark's flanking rules do not fit CJK |

Mermaid is imported dynamically, so a document with no diagrams never pays for
it. When one does appear, the fetch starts as soon as its opening fence is
seen — seconds before the diagram can render — so the download overlaps the
rest of the stream instead of stalling it. Pass `preload` to start that fetch
on mount instead, which is worth it for a view that usually shows diagrams.

Mermaid configuration goes to the plugin, not the host:

```tsx
mermaidPlugin({ theme: "neutral", fontFamily: "Inter" });
```

`startOnLoad` and `suppressErrorRendering` are fixed: the first would have
mermaid scan the page behind the component's back, and the second stops a
half-written diagram — which is every diagram, mid-stream — from painting an
error graphic. Write your own plugin against `MathPlugin`,
`CodeHighlighterPlugin` or `DiagramPlugin` to swap in a different engine.

## Reasoning

A model's thinking, wrapped in `<think>`, `<thinking>` or `<reasoning>`, is
recognised as a block of its own rather than left to render as prose beside the
answer. It streams into a collapsible panel — open while the model is thinking,
collapsed once it finishes, and reopenable by the reader.

```
<think>
Checking the constraints first.
</think>

The answer is 42.
```

The markdown inside is rendered as markdown, so a trace with lists or code in
it reads the way it was written, and a half-arrived tag (`<thi`) is withheld
rather than flashed as text. `controls={{ reasoning: false }}` renders the
contents without the wrapper; `translations.thinking` and
`translations.thoughtFor` change the labels.

By default the block renders where the tag appeared. To put it somewhere else
— above the message rather than inside it — give it an element to render into:

```tsx
<div ref={thinking} className="content-block-thinking" />
<div className="content-block-container">
  <HyperMarkdown reasoningTarget={() => thinking.current} … />
</div>
```

It renders in place whenever the target is absent or returns null, so a ref
that is still empty on the first pass is fine.

## Untrusted input

Markdown from a model is untrusted input. Raw HTML in it is parsed, then
sanitized with `rehype-sanitize` before anything else runs — `<script>`,
`<style>`, `<iframe>`, `<form>` and every event-handler attribute are removed.
Link and image targets are then checked separately: by default only `http`,
`https`, `mailto` and `tel` are allowed, plus `data:` images, and a disallowed
link keeps its text and loses only its destination.

Sanitization runs *before* maths, highlighting, diagram and animation stages,
so everything those produce is generated from already-clean content and none of
it has to be whitelisted.

To widen it:

```tsx
<HyperMarkdown
  md={md}
  allowedTags={{ mention: ["data-user-id"] }}
  linkSafety={{ allowedLinkPrefixes: ["https://ours.example"] }}
/>
```

`sanitize={false}` turns it off entirely. Only do that for content you
generated yourself.

Call `write(delta)` for each chunk, then call `write("", true)` once when the
stream ends so any buffered block is flushed.

## What it does while streaming

- **Incomplete constructs are withheld, not guessed.** A half-typed link,
  autolink, HTML tag or maths expression is held back until it can render,
  rather than appearing as `[text](htt` or linking to a truncated URL.
- **Emphasis resolves eagerly.** `**bold` styles as soon as it is unambiguous,
  through CommonMark delimiter runs with flanking rules and the rule of three,
  so `**Bold *italic***` closes correctly.
- **Settled content is cached.** Code lines, table rows and list items are
  parsed once and reused, so a long table or code block does not re-parse on
  every chunk.
- **The finished render matches a whole-document parse.** Verified across the
  fixture corpus in `tests/`.

## Supported

GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks,
footnotes), KaTeX maths, Mermaid diagrams, syntax highlighting, and raw HTML.


## Development

```bash
pnpm install
pnpm test        # behavioural suite over the fixture corpus
pnpm typecheck
pnpm build
```

## Layout

```
index.tsx                     the component — the only public entry

lib/
  renderer.tsx                owns the buffers and decides what to re-render
  components.tsx              which tags become which components
  processors.ts               the unified pipelines
  patterns.ts                 every pattern the renderer matches against
  math-notation.ts            the notations models emit for maths → $ … $
  icons.ts   runtime.ts   types.ts

  remark/footnotes.ts
  rehype/{element-data,mermaid,animate-words,link-safety}.ts

  stream/                     what to render, and when
    detect-block-type.ts      what kind of block is this
    find-block-boundary.ts    where does it end
    list-structure.ts   definitions.ts   references.ts

  repair/                     completing markup a chunk cut in half
    process-inline-syntax.ts  the settle loop everything else feeds
    emphasis.ts  inline-tokens.ts  code-spans.ts  links.ts
    math.ts      tables.ts        setext.ts       escapes.ts
    entities.ts  list-markers.ts  task-lists.ts   utils.ts   types.ts

  cache/                      sub-block caches, so a long block is not requoted
    code.tsx  list.tsx  table.tsx  utils.ts

  config.ts   sanitize.ts   plugin-types.ts
  plugins/{math,code,mermaid}.ts

  code/{index,header,line-numbers}.tsx
  table/{index,header,shape}.tsx
  mermaid/{index,header}.tsx
  link.tsx  image.tsx  tooltip.tsx
```

No barrel files: every import names the module it comes from.
