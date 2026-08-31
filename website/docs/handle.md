---
sidebar_position: 5
title: Imperative ref API
---

# Imperative ref API

Streaming mode is driven by a React ref, not by rewriting props.

```ts
interface HyperMarkdownHandle {
  write(delta: string, finalize?: boolean): void;
  reset(): void;
  readonly store: HyperMarkdownStore;
  /** @deprecated Use `store`. */
  readonly stream: HyperMarkdownStore;
}
```

## write

`write(delta)` appends one fragment to the active stream. Pass `true` as the second argument once, when the provider is finished:

```tsx
renderer.current?.write(delta);
renderer.current?.write("", true);
```

An empty first argument is valid. The empty delta carries the finalization signal without duplicating content.

## reset

`reset()` discards rendered content and starts a new stream on the same mounted instance. Call it when a new assistant message begins, not on every token.

## store

Most integrations only need `write()` and `reset()`. `store` is the rendering engine behind the component: version counter, subscription, and advanced host integration. The deprecated `stream` alias points at the same object.

Keep the ref on one component for the life of an answer. Creating a new instance rebuilds processors and drops caches.
