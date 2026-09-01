---
title: SSR, hydration, and Next.js
---

# SSR, hydration, and Next.js

HyperMarkdown supports React 18 and React 19 server rendering. Finished
Markdown can be included in the server HTML and hydrated in the browser:

```tsx
<HyperMarkdown md={savedMessage} />
```

The initial render does not require `window` or `document`. Browser-only block
interactions, effects, and the imperative streaming handle activate after
hydration. HyperMarkdown supplies a server snapshot to `useSyncExternalStore`,
so its initial output does not depend on a layout effect.

## Next.js App Router

HyperMarkdown's public component entry is marked `"use client"`. You can
therefore import it into a Server Component without adding a local boundary.
Next.js still prerenders the Client Component to HTML on the initial request
and hydrates that markup in the browser.

Import the stylesheet once from the root layout:

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

A Server Component can fetch or load the Markdown and pass the resulting
string across the client boundary:

```tsx title="app/articles/[slug]/page.tsx"
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await loadArticle(slug);

  return <HyperMarkdown md={article.markdown} />;
}
```

The `md` string is serializable, so it can cross from the Server Component
graph into HyperMarkdown's client boundary.

### Plugins, component overrides, and callbacks

Functions cannot cross a React Server Component boundary. Plugin objects,
custom React component functions, refs, and callbacks such as `scrollDown`
must be created inside the client graph. Add a small wrapper when you need
them:

```tsx title="app/components/article-markdown.tsx"
"use client";

import { HyperMarkdown } from "@aeven-ai/hypermarkdown";
import { highlightPlugin } from "@aeven-ai/hypermarkdown/plugins/code";

const plugins = { code: highlightPlugin() };

export function ArticleMarkdown({ markdown }: { markdown: string }) {
  return <HyperMarkdown md={markdown} plugins={plugins} />;
}
```

The Server Component can pass `markdown` to `ArticleMarkdown`; the plugin
never crosses the boundary. Define plugin objects and component overrides at
module scope, or memoize them, so their identities remain stable.

### Streaming responses

The imperative handle is a client-side integration. Mount the active answer
inside a Client Component and write transport deltas there:

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
for the active answer. See [Streaming and delta rendering](/docs/streaming)
for the delta and finalization contract.

### Do not disable SSR by default

HyperMarkdown guards its browser integrations and does not normally need
`dynamic(..., { ssr: false })`. Disabling SSR removes the Markdown from the
initial HTML. Use a client-only dynamic import only if your own component
override or third-party plugin reads browser globals during render.

## Next.js Pages Router

The Pages Router can render finished Markdown through its normal SSR path:

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

## What the test suite covers

The SSR suite checks that HyperMarkdown:

- renders complete and unfinished Markdown with `react-dom/server`
- renders with no DOM or browser runtime
- hydrates static and syntax-highlighted output without recoverable errors
- adopts existing server DOM nodes rather than replacing them
- detects a deliberately introduced mismatch, proving the checks are active
- accepts serializable Markdown through a Next.js-style client boundary
- updates finished Markdown after hydration without remounting its root
- accepts streaming deltas after hydration

Run the dedicated coverage with:

```bash
npm test -- tests/ui/ssr.test.tsx tests/coverage/runtime-server.test.ts
```
