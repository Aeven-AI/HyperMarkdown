---
title: React 18/19 and SSR
---

# React 18/19 and SSR

HyperMarkdown supports React 18 and React 19.

## Server rendering

Finished Markdown can render on the server:

```tsx
<HyperMarkdown md={savedMessage} />
```

Effects and browser-only block interactions activate after hydration. Keep model output deterministic between server and client to avoid hydration mismatches.

## Streaming UI boundaries

The imperative handle is a client-side integration. In frameworks with server and client component boundaries, mount the active response in a client component and deliver transport deltas there.

HyperMarkdown's `useSyncExternalStore` integration supplies a server snapshot, so the component does not depend on layout effects to produce its initial output.

## Multiple messages

Use finished mode for settled history and one streaming instance for the active answer:

```tsx
{messages.map((message) => (
  <HyperMarkdown key={message.id} md={message.content} />
))}

<HyperMarkdown ref={activeRenderer} streaming />
```

Do not reuse one store for unrelated simultaneous streams. Each mounted component owns its own rendering state and event bus.
