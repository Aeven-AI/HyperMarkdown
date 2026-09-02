# HyperMarkdown

[![CI](https://github.com/Aeven-AI/HyperMarkdown/actions/workflows/ci.yml/badge.svg)](https://github.com/Aeven-AI/HyperMarkdown/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@aeven-ai/hypermarkdown)](https://www.npmjs.com/package/@aeven-ai/hypermarkdown)
[![site](https://img.shields.io/badge/site-aeven--ai.github.io-111113)](https://aeven-ai.github.io/HyperMarkdown/)

### Ridiculously fast Markdown for React and AI.

**Parse the change. Not the conversation.**

HyperMarkdown is a streaming-native Markdown renderer built for LLM output.
It caches settled content down to code lines, table rows, and list items, so
growing responses do not keep paying to parse and render work that is already
finished.

## Performance

**1.8×–11.0× faster than the nearest streaming renderer across our benchmark
suite.**

| Workload | HyperMarkdown | Markstream | Streamdown | DeepSeek Harness | react-markdown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Large code block | **216 ms** | 769 ms | 3,242 ms | 4,416 ms | 2,054 ms |
| Mixed prose | **140 ms** | 313 ms | 559 ms | 249 ms | 2,629 ms |
| Captured AI code stream (`real-code-os`) | **533 ms** | 4,417 ms | 12,511 ms | 14,621 ms | 8,008 ms |
| Captured AI table stream (`real-table-head`) | **666 ms** | 4,948 ms | 11,621 ms | 19,644 ms | 10,236 ms |
| Large table | **846 ms** | 9,276 ms | 33,142 ms | 55,918 ms | 29,747 ms |

The captured model fixtures are not generated stress cases: their content is
real AI output, replayed in controlled 8-character frames. HyperMarkdown
renders the code stream in **533 ms** versus **4,417 ms** for the next closest
streaming renderer, and the table stream in **666 ms** versus **4,948 ms**.

On a large streaming table, HyperMarkdown completes the workload in **under
one second**.

- Streamdown: **33 seconds**
- DeepSeek Harness strategy: **56 seconds**
- react-markdown: **30 seconds**

Same Markdown. Same stream. Very different architecture.

> Production React benchmark on an Apple M2 Max, including chunk processing
> and synchronous render/commit. Absolute timings vary; the ratios are the
> useful comparison. HyperMarkdown was refreshed on 2026-09-01; comparison
> rows carry over from the same-machine, same-settings run on 2026-08-31.

[Read the methodology](./benchmarks/README.md) ·
[View the full benchmark results](./benchmarks/results/latest.md)

## Why is it so fast?

Most streaming Markdown renderers optimize at the document or block level.
HyperMarkdown goes further.

```text
Traditional streaming renderer

new token
   ↓
growing active block
   ↓
parse the active block again
   ↓
render again
```

HyperMarkdown:

```text
new token
   ↓
active block
   │
   ├── settled code lines    → cached
   ├── settled table rows    → cached
   ├── settled list items    → cached
   └── changing frontier     → parse
```

A 1,000-line code block does not become a 1,000-line parsing problem every
time another token arrives.

**Completed work stays completed.**

## Built for AI streaming

- Sub-block caching for code, tables, and lists
- Streaming-safe handling of incomplete Markdown
- GFM tables, task lists, autolinks, and footnotes
- Reasoning blocks written as `<think>`, `<thinking>`, or `<reasoning>`
- KaTeX math
- Mermaid diagrams
- Syntax highlighting
- Raw HTML with sanitization
- React 18 and React 19
- SSR and hydration, including a Next.js App Router client boundary
- Lightweight core with heavy features loaded as optional plugins
- Production integration with DeepSeek Harness / DSH architecture

## Used by Æven

HyperMarkdown is the official Markdown component used by Æven and integrates
with the DeepSeek Harness (DSH) architecture. It was built around the demands
of an agent harness—long answers, dense code, wide tables, reasoning traces,
and many small deltas—not adapted from a finished-document renderer after the
fact.

The captured AI workloads in the benchmark suite come from that environment.
They exercise the content shapes a renderer encounters in a real model
response, with controlled chunk sizes that keep comparisons reproducible.

## Install

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

## Quick start

### Finished Markdown

Use the `md` prop when the complete document already exists:

```tsx
<HyperMarkdown md={markdown} />
```

Updating `md` replaces the document. This mode works naturally for stored
messages, previews, and server-rendered content.

### Streaming Markdown

Mount one renderer for the active response and write each incoming **delta**
to its imperative handle:

```tsx
import { useRef } from "react";
import {
  HyperMarkdown,
  type HyperMarkdownHandle,
} from "@aeven-ai/hypermarkdown";

function Chat() {
  const renderer = useRef<HyperMarkdownHandle>(null);

  async function generate(prompt: string) {
    // Reuse the mounted component for a new response.
    renderer.current?.reset();

    const deltas = await createResponseStream(prompt);

    try {
      for await (const delta of deltas) {
        renderer.current?.write(delta);
      }
    } finally {
      // Flush the final open paragraph, fence, list, table, or reasoning block.
      renderer.current?.write("", true);
    }
  }

  return (
    <HyperMarkdown
      ref={renderer}
      streaming
      animation
    />
  );
}
```

`createResponseStream()` above represents your SDK or transport. It only needs
to yield the text fragments produced since the previous event.

### The delta contract

`write()` appends. Pass the new fragment exactly once:

```tsx
renderer.current?.write(delta);     // correct
renderer.current?.write(fullText);  // wrong: repeats everything already written
```

When the stream ends, finalize it exactly once. Either form is valid:

```tsx
renderer.current?.write("", true);          // separate finalization
renderer.current?.write(lastDelta, true);   // final delta and finalization
```

Finalization matters even when the visible text looks complete: it settles the
active frontier and lets the renderer finish incomplete-block bookkeeping.

Before using the same mounted component for another response, call `reset()`.
Keep the component and its `ref` mounted during a response; changing its React
`key` creates a new, empty renderer.

### If your source emits cumulative snapshots

Some APIs emit `"Hello"`, then `"Hello world"`, rather than `"Hello"`, then
`" world"`. Convert those snapshots to deltas at the boundary:

```tsx
let previous = "";

function startSnapshotStream() {
  previous = "";
  renderer.current?.reset();
}

function writeSnapshot(next: string, final = false) {
  const handle = renderer.current;
  if (!handle) return;

  if (!next.startsWith(previous)) {
    // The provider revised an earlier prefix. Rebuild from the new snapshot.
    handle.reset();
    previous = "";
  }

  handle.write(next.slice(previous.length), final);
  previous = next;
}
```

Call `startSnapshotStream()` before the first snapshot of each response.

Do not put the growing Markdown string in React state just to feed it back as a
prop on every token. In streaming mode, HyperMarkdown owns that buffer so your
component tree does not have to.

## Next.js

HyperMarkdown supports Next.js server rendering and hydration. Its public
component entry includes `"use client"`, so an App Router Server Component can
import it directly. The Client Component is still prerendered into the initial
HTML and hydrated in the browser.

Import the stylesheet once in the root layout:

```tsx
// app/layout.tsx
import "@aeven-ai/hypermarkdown/styles.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Then render finished Markdown from a Server Component:

```tsx
// app/page.tsx
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

export default async function Page() {
  const markdown = await loadMarkdown();
  return <HyperMarkdown md={markdown} />;
}
```

The `md` prop is serializable and can cross the Server Component boundary.
Create plugins, component overrides, refs, and callbacks inside a Client
Component because they contain functions. Streaming through the imperative
handle also belongs in a Client Component.

HyperMarkdown does not normally need `dynamic(..., { ssr: false })`; disabling
SSR removes the rendered Markdown from the initial HTML.

See the full [SSR, hydration, and Next.js guide](https://aeven-ai.github.io/HyperMarkdown/docs/ssr)
for App Router plugins and streaming, Pages Router SSR, and hydration-mismatch
guidance.

## Migrating

### From react-markdown or another prop-based renderer

For finished documents, the migration is a component swap:

```tsx
// Before
<ReactMarkdown>{markdown}</ReactMarkdown>

// After
<HyperMarkdown md={markdown} />
```

For streaming, the architectural change is more important. A typical
prop-based loop rebuilds an accumulated string and reparses it on every chunk:

```tsx
// Before: full document goes back through React on every delta.
const [markdown, setMarkdown] = useState("");

for await (const delta of stream) {
  setMarkdown((current) => current + delta);
}

<ReactMarkdown>{markdown}</ReactMarkdown>
```

Replace that state loop with one stable `HyperMarkdown` instance:

```tsx
// After: only the new fragment enters the renderer.
const renderer = useRef<HyperMarkdownHandle>(null);

for await (const delta of stream) {
  renderer.current?.write(delta);
}
renderer.current?.write("", true);

<HyperMarkdown ref={renderer} streaming />
```

Common migration mappings:

| Previous pattern | HyperMarkdown |
| --- | --- |
| Markdown passed as `children` | `md={markdown}` for finished content |
| Accumulated text prop updated per token | `write(delta)` with `streaming` |
| Clear state before a new answer | `ref.current?.reset()` |
| End-of-stream state flag | `write("", true)` |
| GFM remark plugin | Built in |
| Custom element renderers | `components={{ ... }}` |
| Math, highlighting, Mermaid | Optional `plugins` slots |
| Raw HTML plugin | Built in; sanitized by default |

HyperMarkdown does not accept arbitrary `remarkPlugins` or `rehypePlugins`
through the component API. Use its typed feature plugins and component
overrides; if you depend on a custom AST transform, verify that transform
before replacing the old renderer.

### From the legacy `MarkdownStream` export

`MarkdownStream` remains exported for compatibility but is deprecated. Mount
`HyperMarkdown`, hold a `HyperMarkdownHandle`, and replace direct engine calls
with `write(delta)`, `write("", true)`, and `reset()`. The component owns the
store and subscribes React to it safely.

## Optional plugins

Math, syntax highlighting, diagrams, and CJK-friendly emphasis are optional.
Install only what your application uses:

```bash
npm install katex remark-math rehype-katex
npm install rehype-highlight
npm install mermaid
npm install remark-cjk-friendly
```

```tsx
import { katexPlugin } from "@aeven-ai/hypermarkdown/plugins/math";
import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";
import { mermaidPlugin } from "@aeven-ai/hypermarkdown/plugins/mermaid";
import { cjkPlugin } from "@aeven-ai/hypermarkdown/plugins/cjk";
import "katex/dist/katex.min.css";

// Build this once. A new plugin object rebuilds the processing pipelines.
const plugins = {
  math: katexPlugin(),
  code: highlightPlugin(),
  diagram: mermaidPlugin({ theme: "neutral", fontFamily: "Inter" }),
  cjk: cjkPlugin(),
};

<HyperMarkdown md={markdown} plugins={plugins} />
```

Each missing plugin degrades gracefully:

| Missing plugin | Behavior |
| --- | --- |
| `math` | `$x$` remains literal text |
| `code` | Code blocks retain caching, controls, and line numbers but are not highlighted |
| `diagram` | A `mermaid` fence renders as an ordinary code block |
| `cjk` | Standard CommonMark emphasis rules apply |

Mermaid is dynamically imported. With `preload` off, loading starts when an
opening Mermaid fence appears, overlapping the rest of the stream. Set
`preload` when a view is very likely to contain diagrams and should begin the
download on mount.

## Incomplete Markdown

LLM chunks end in inconvenient places. HyperMarkdown treats partial syntax as
a normal state, not an error:

- Half-written links, autolinks, HTML tags, and math are withheld until safe
  to render.
- Emphasis resolves eagerly when the CommonMark delimiter rules make it
  unambiguous.
- Open code fences, tables, and lists render their stable content while the
  unfinished frontier continues changing.
- A finalized stream matches the whole-document parse across the correctness
  fixture suite.

## Reasoning blocks

Model reasoning wrapped in `<think>`, `<thinking>`, or `<reasoning>` becomes a
collapsible block. It stays open while tokens arrive and collapses when the
block finishes.

```markdown
<think>
Checking the constraints first.
</think>

The answer is 42.
```

Markdown inside the reasoning block is rendered normally. A partial opening
tag such as `<thi` is withheld instead of flashing as text.

To place reasoning outside the answer container, provide a portal target:

```tsx
const reasoning = useRef<HTMLDivElement>(null);

return (
  <>
    <div ref={reasoning} />
    <HyperMarkdown
      ref={renderer}
      streaming
      reasoningTarget={() => reasoning.current}
    />
  </>
);
```

Set `controls={{ reasoning: false }}` to render the content without the
collapsible wrapper. Override `translations.thinking` and
`translations.thoughtFor` to localize its labels.

## HTML and untrusted model output

Markdown produced by a model is untrusted input. HyperMarkdown defaults to
`html="sanitize"`: raw HTML is parsed, then cleaned before math, syntax
highlighting, diagrams, or animation run. Scripts, styles, iframes, forms, and
event-handler attributes are removed.

Links and images are checked separately. By default, `http`, `https`,
`mailto`, and `tel` protocols are allowed, as are `data:` images.

Choose the policy explicitly when needed:

```tsx
<HyperMarkdown md={markdown} html="literal" />
```

| `html` mode | Behavior |
| --- | --- |
| `"sanitize"` | Default. Parse raw HTML and remove anything outside the schema. |
| `"literal"` | Render raw HTML as visible text. Strongest option for untrusted output. |
| `"raw"` | Parse without sanitization. Use only for content you control. |

To widen the default policy without disabling it:

```tsx
<HyperMarkdown
  md={markdown}
  allowedTags={{ mention: ["data-user-id"] }}
  linkSafety={{ allowedLinkPrefixes: ["https://docs.example.com/"] }}
/>
```

`sanitize={false}` is retained for compatibility and selects raw mode when
`html` is not set. Prefer the clearer `html` prop in new code.

## Styling

The shipped stylesheet is scoped under `.hypermarkdown`. Customize it with
CSS variables rather than overriding internal selectors:

```css
.assistant-message {
  --hm-font: Inter, sans-serif;
  --hm-font-mono: "Geist Mono", monospace;
  --hm-color: #171717;
  --hm-background: #f5f5f5;
  --hm-link-color: #2563eb;
  --hm-radius: 16px;
  --hm-max-width: 100%;
}
```

```tsx
<HyperMarkdown className="assistant-message" md={markdown} />
```

The root always receives `hypermarkdown`; `className` is added alongside it.
KaTeX requires its own stylesheet when the math plugin is enabled.

## Component overrides

Replace rendered tags with stable React component references:

```tsx
const components = {
  a: AppLink,
  img: ProxiedImage,
  code: Code,
};

<HyperMarkdown md={markdown} components={components} />
```

HyperMarkdown already provides specialized renderers for links, images, code
blocks, tables, and diagrams. An override wins over the built-in component.
Keep the object and component functions stable—recreating them on every render
can remount rendered elements.

## API

### `HyperMarkdown` props

| Prop | Type | Description |
| --- | --- | --- |
| `md` | `string` | Finished Markdown. Ignored while `streaming` is true. |
| `streaming` | `boolean` | Receive content through the imperative handle. |
| `animation` | `boolean` | Fade arriving words in. |
| `plugins` | `PluginConfig` | Optional math, code, diagram, and CJK plugins. |
| `preload` | `boolean` | Begin loading the configured diagram engine on mount. |
| `components` | `RendererComponents` | Stable tag-to-component overrides. |
| `html` | `"sanitize" \| "literal" \| "raw"` | Raw HTML policy. Defaults to `"sanitize"`. |
| `allowedTags` | `Record<string, string[]>` | Additional sanitized tags and attributes. |
| `linkSafety` | `LinkSafetyConfig` | Allowed URL protocols and prefixes. |
| `reasoningTarget` | `HTMLElement \| null \| () => HTMLElement \| null` | Optional portal target for reasoning. |
| `controls` | `ControlsConfig` | Configure or hide reasoning, code, table, and diagram controls. Diagrams add `panZoom`. |
| `translations` | `Partial<Translations>` | Override UI strings. |
| `icons` | `Partial<IconMap>` | Override toolbar icons with inline SVG strings. |
| `lineNumbers` | `boolean` | Show code line numbers. Defaults to `true`. |
| `codeBlockMaxHeight` | `number \| string` | Height at which code blocks scroll; numbers are pixels. |
| `tableMaxHeight` | `number \| string` | Height at which tables scroll; numbers are pixels. |
| `preview` | `PreviewConfig` | Where a code block's HTML preview opens. Defaults to a page of its own. |
| `scrollDown` | `() => void` | Runs after each committed update for host scroll management. |
| `onFullscreenChange` | `(fullscreen: boolean) => void` | Reports code, table, or diagram fullscreen changes. |
| `onAlert` | `(alert: HyperMarkdownAlert) => void` | Lets the host present block alerts. |
| `className` | `string` | Additional class on the `.hypermarkdown` root. |

### Diagram pan and zoom

A diagram can be zoomed and panned in place, so a wide flowchart or a dense
sequence diagram stays readable without opening it fullscreen. The toolbar
carries **Zoom in**, **Zoom out** and **Reset zoom and pan**; the wheel zooms
and dragging pans, by mouse or touch.

It is on by default. Turn it off and the diagram keeps its copy and fullscreen
buttons:

```tsx
<HyperMarkdown
  md={markdown}
  plugins={plugins}
  controls={{ diagram: { copy: true, fullscreen: true, panZoom: false } }}
/>
```

`panZoom` is the one control diagrams have that code blocks and tables do not,
which is why `controls.diagram` takes a `DiagramControls` rather than the
`BlockControls` the others use. Its three labels — `zoomIn`, `zoomOut` and
`resetView` — and its three icons are overridable like any others through
`translations` and `icons`.

### HTML previews

A code block holding HTML offers a **Preview** button. By default the block
opens that HTML as a page of its own — a blob URL, so it is a real document
with a real address that reloads, inspects and views source like any other
page, and runs in its own scope rather than the app's. Nothing is required of
the host: no route, no storage, no navigation of your own.

If the window cannot be opened — a blocked popup, or a host embedded without
`allow-popups` — the block reports it through `onAlert` instead.

To send previews to a page you serve, give `preview` a `url`. The HTML is
written to `localStorage` first, and the page reads it back:

```tsx
<HyperMarkdown md={markdown} preview={{ url: "/preview-code/{id}" }} />
```

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string \| (id: string) => string` | The page to open. `{id}` is replaced with the block's id. Unset means the built-in preview. |
| `storageKey` | `string \| (id: string) => string` | Key the HTML is written to. Defaults to `preview-{id}`. Only used with `url`. |

Both accept a function when substitution is not enough:

```tsx
<HyperMarkdown
  md={markdown}
  preview={{
    url: (id) => `/preview#${encodeURIComponent(id)}`,
    storageKey: (id) => `preview:${id}`,
  }}
/>
```

The previewed HTML runs with your origin. Serving your own preview page lets
you decide how far to trust it — rendering it inside a sandboxed iframe, for
instance.

### `HyperMarkdownHandle`

| Member | Description |
| --- | --- |
| `write(delta, finalize?)` | Append one delta; pass `true` once at end of stream. |
| `reset()` | Discard rendered content and start a new stream. |
| `store` | The component's rendering store for advanced integrations. |
| `stream` | Deprecated alias for `store`. |

## Supported Markdown

CommonMark plus GitHub Flavored Markdown: tables, task lists, strikethrough,
autolinks, and footnotes. Optional plugins add KaTeX math, Mermaid diagrams,
syntax highlighting, and CJK-friendly emphasis. Raw HTML is supported under
the selected safety policy.

## Development

```bash
npm install
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run benchmark
npm run website:dev
```

The documentation site and playground live in `website/` and deploy to
[GitHub Pages](https://aeven-ai.github.io/HyperMarkdown/) from
`.github/workflows/pages.yml`. Set the repository Pages source to **GitHub
Actions**.

Pull requests and pushes to `main` run lint, typecheck (React 18 and 19), unit
and full coverage, and a production build. Both coverage gates are 100%
statements, lines, functions, and branches. Coverage reports are uploaded as
artifacts and posted on pull requests. Mark the CI job as a required status
check on `main` if you want GitHub to block merges on a red build.

The correctness suite compares finished streaming output with whole-document
rendering across the fixture corpus. The benchmark harness validates DOM
output and measures chunk processing plus synchronous React commits.

### Releasing

The account publishes under two-factor auth, which no runner can satisfy, so
the publish itself is local:

1. Bump `version` in `package.json` (and the lockfile). `npm version`
   also refreshes `website/package-lock.json` so the docs site records
   that same version.
2. Commit, tag `vX.Y.Z`, and push.
3. Create a GitHub Release from that tag. That deploys the documentation
   site from the release tag (the playground and docs build that
   released library).
4. Run `npm publish` locally, from the tag, and complete the 2FA prompt.

A release therefore does not publish. Set up trusted publishing if you want it
to — see the [publish workflow](.github/workflows/publish.yml), which carries
the steps and is otherwise only run on demand.

The [publish workflow](.github/workflows/publish.yml) re-runs the CI gates and
publishes `@aeven-ai/hypermarkdown` with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
(OIDC, no long-lived token, provenance generated automatically). Do not set
`NODE_AUTH_TOKEN` (even to an empty string) or `setup-node`'s `registry-url`;
those force classic auth and the publish fails with `E404` or `ENEEDAUTH`.
The Trusted Publisher **Environment name** on npmjs.com must be `npm`, matching
the GitHub Environment this workflow deploys to. Leaving that field blank
makes OIDC token exchange fail.

One-time setup on [npmjs.com](https://www.npmjs.com/package/@aeven-ai/hypermarkdown)
→ package Settings → Trusted Publisher:

| Field | Value |
| --- | --- |
| Organization or user | `Aeven-AI` |
| Repository | `HyperMarkdown` |
| Workflow filename | `publish.yml` |
| Environment name | `npm` |
| Allowed actions | `npm publish` |

Create a GitHub Environment named `npm` if it does not exist. Optional
required reviewers on that environment add a human approval step before npm
sees the package.

<details>
<summary>Project layout</summary>

```text
index.tsx                     public React component and types

lib/
  renderer.tsx                buffers, caching, and incremental rendering
  processors.ts               Markdown and HTML processing pipelines
  stream/                     block detection and boundaries
  repair/                     safe handling of incomplete inline syntax
  cache/                      code-line, table-row, and list-item caches
  plugins/                    optional math, code, Mermaid, and CJK adapters
  code/  table/  mermaid/     rich block renderers and controls
  reasoning/                  streamed reasoning UI
  sanitize.ts                 HTML and URL safety policy

styles/hypermarkdown.scss     scoped component stylesheet
tests/                        correctness, streaming, API, UI, and security
benchmarks/                   fixtures, competing renderers, and results
example/                      browser example using the built package
```

</details>

## License

MIT
