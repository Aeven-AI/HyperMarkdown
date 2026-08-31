---
sidebar_position: 3
title: Finished Markdown
---

# Finished Markdown

Use the `md` prop when the complete document already exists:

```tsx
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

export function Article({ markdown }: { markdown: string }) {
  return <HyperMarkdown md={markdown} />;
}
```

Updating `md` replaces the document. This mode is the right fit for stored messages, previews, documentation, and server-rendered content.

Keep history rows on `md` and reserve streaming mode for the one answer still arriving:

```tsx
{messages.map((message) => (
  <HyperMarkdown key={message.id} md={message.content} />
))}
```

Passing a growing string through `md` on every token will render, but it bypasses the streaming architecture. For a live response, use the [imperative handle](/docs/handle).
