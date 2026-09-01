---
title: Next.js and server rendering
sidebar_label: Next.js and SSR
description: Use HyperMarkdown with the Next.js App Router or Pages Router, including SSR, hydration, plugins, and streaming responses.
---

# Next.js and server rendering

HyperMarkdown supports React 18 and React 19 server rendering. Finished
Markdown can be included in the initial HTML and hydrated in the browser—no
client-only dynamic import is needed for the standard component.

```tsx
<HyperMarkdown md={savedMessage} />
```

:::info Short answer for Next.js

Import the stylesheet in your root layout, then import `HyperMarkdown` directly
where you need it. Its public component entry already defines the client
boundary, while Next.js still prerenders finished Markdown to HTML.

:::

## Pick the right pattern

| Use case | Recommended pattern |
| --- | --- |
| Article, preview, or saved message | Pass `md` from a Server Component |
| Plugins or component overrides | Create them in a small Client Component wrapper |
| Active model response | Mount a Client Component and send deltas to `write()` |
| Settled chat history | Render each message in finished mode with `md` |
| Browser-dependent third-party plugin | Isolate that plugin in a client-only wrapper if it reads browser globals during render |

## App Router

### 1. Import the stylesheet once

Import HyperMarkdown's global stylesheet from the root layout. Add plugin
styles here too when every route uses them; otherwise import them from the
nearest layout shared by those routes.

```tsx title="app/layout.tsx"
import "@aeven-ai/hypermarkdown/styles.css";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 2. Render finished Markdown from a Server Component

Fetch or load the Markdown on the server and pass the resulting string to
HyperMarkdown:

```tsx title="app/articles/[slug]/page.tsx"
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

export default async function ArticlePage({
  params,
}: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await loadArticle(slug);

  return <HyperMarkdown md={article.markdown} />;
}
```

The `md` string is serializable, so it can cross from the Server Component
graph into HyperMarkdown's client boundary. The rendered Markdown is present
in the server response and becomes interactive after hydration.

### Why importing a Client Component still produces HTML

HyperMarkdown's public component entry is marked `"use client"` because its
interactions and streaming handle need browser-side React. In the App Router,
that boundary does not mean “render nothing on the server.” Next.js prerenders
the Client Component on the initial request, sends its HTML, and then hydrates
it in the browser.

The initial render does not require `window` or `document`. HyperMarkdown uses
a server snapshot for its external store, so its initial output does not
depend on a layout effect.

## Plugins and component overrides

Functions cannot cross a React Server Component boundary. Plugin objects,
custom React component functions, refs, and callbacks such as `scrollDown`
must be created inside the client graph.

Add a small wrapper when you need them:

```tsx title="app/components/article-markdown.tsx"
"use client";

import { HyperMarkdown } from "@aeven-ai/hypermarkdown";
import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";

const plugins = { code: highlightPlugin() };

export function ArticleMarkdown({ markdown }: { markdown: string }) {
  return <HyperMarkdown md={markdown} plugins={plugins} />;
}
```

Then keep data loading in the Server Component:

```tsx title="app/articles/[slug]/page.tsx"
import { ArticleMarkdown } from "@/app/components/article-markdown";

export default async function ArticlePage() {
  const article = await loadArticle();
  return <ArticleMarkdown markdown={article.markdown} />;
}
```

Define plugin objects and component overrides at module scope, or memoize them,
so their identities remain stable.

:::note Optional plugin styles

KaTeX and highlight.js require their own stylesheets in addition to the
HyperMarkdown stylesheet:

```tsx
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
```

:::

## Streaming a model response

The imperative handle is a client-side integration. Mount one renderer for
the active answer and write transport deltas there:

```tsx title="app/components/streaming-answer.tsx"
"use client";

import { useRef } from "react";
import {
  HyperMarkdown,
  type HyperMarkdownHandle,
} from "@aeven-ai/hypermarkdown";

export function StreamingAnswer() {
  const renderer = useRef<HyperMarkdownHandle>(null);

  async function generate() {
    renderer.current?.reset();

    try {
      for await (const delta of readResponseDeltas()) {
        renderer.current?.write(delta);
      }
    } finally {
      renderer.current?.write("", true);
    }
  }

  return (
    <>
      <button onClick={generate}>Generate</button>
      <HyperMarkdown ref={renderer} streaming />
    </>
  );
}
```

Keep settled message history in finished mode and use one streaming instance
for the active answer. The `write()` method accepts only the new fragment—not
the accumulated response. See [Streaming and delta rendering](/docs/streaming)
for the complete delta and finalization contract.

## Pages Router

The Pages Router renders finished Markdown through its normal SSR path:

```tsx title="pages/articles/[slug].tsx"
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

export const getServerSideProps = (async ({ params }) => {
  const article = await loadArticle(String(params?.slug));
  return { props: { markdown: article.markdown } };
}) satisfies GetServerSideProps<{ markdown: string }>;

export default function ArticlePage({
  markdown,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <HyperMarkdown md={markdown} />;
}
```

Import `@aeven-ai/hypermarkdown/styles.css` once in `pages/_app.tsx`.

## Avoid hydration mismatches

Server and client renders must receive the same initial inputs:

- Keep the initial Markdown and rendering options deterministic.
- Configure the same plugins and component overrides for both renders.
- Do not derive rendered Markdown from `Date.now()`, `Math.random()`, viewport
  size, storage, or the browser URL during render.
- Pass browser-derived values after mount when they truly need to differ.
- Keep plugin objects and component overrides stable to avoid remounting
  rendered blocks.

After hydration, changing `md` replaces a finished document normally. The
imperative `write()` API is for delta streams rather than route-level Markdown
updates.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Markdown has no formatting | Import `@aeven-ai/hypermarkdown/styles.css` from the root layout or `_app.tsx` |
| Next.js reports a non-serializable prop | Move plugins, callbacks, refs, and component overrides into a Client Component |
| Hydration mismatch warning | Ensure the first client render receives the same Markdown and options as the server render |
| Content appears only after mount | Remove `dynamic(..., { ssr: false })` unless your own plugin requires browser globals during render |
| Streaming text repeats | Pass each delta once instead of passing the accumulated response to `write()` |
| Last paragraph or fence does not settle | Finalize once with `write("", true)` |

## What the SSR test suite covers

The automated SSR and hydration suite verifies that HyperMarkdown:

- renders complete and unfinished Markdown with `react-dom/server`
- renders with no DOM or browser runtime
- hydrates static and syntax-highlighted output without recoverable errors
- adopts existing server DOM nodes rather than replacing them
- detects a deliberately introduced mismatch, proving the checks are active
- accepts serializable Markdown through a Next.js-style client boundary
- updates finished Markdown after hydration without remounting its root
- accepts streaming deltas after hydration

Run the focused tests with:

```bash
npm test -- tests/ui/ssr.test.tsx tests/coverage/runtime-server.test.ts
```

## Related guides

- [Installation](/docs/installation)
- [Streaming and delta rendering](/docs/streaming)
- [Plugins](/docs/plugins)
- [Component overrides](/docs/components)
- [Styling](/docs/styling)
