# HyperMarkdown

A streaming-aware markdown renderer for React. It is built for token-by-token
model output: incomplete markup is never shown as raw text, and settled content
is not re-parsed on every chunk.

## Install

```bash
pnpm add hypermarkdown
```

React 18 or 19 is a peer dependency.

```tsx
import { HyperMarkdown, type HyperMarkdownHandle } from "hypermarkdown";
import "katex/dist/katex.min.css";
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

## A note on untrusted input

Raw HTML is rendered. If the markdown you pass can be influenced by someone
untrusted, sanitize before rendering — this package does not do it for you.

## Development

```bash
pnpm install
pnpm test        # behavioural suite over the fixture corpus
pnpm typecheck
pnpm build
```
