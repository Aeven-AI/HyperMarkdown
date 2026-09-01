---
title: FAQ
---

# FAQ

## Can I pass the growing Markdown string as `md`?

It will render, but it bypasses the streaming architecture. Use the imperative handle and write deltas for a live answer.

## Why does the final call contain an empty string?

The empty delta carries the finalization signal. It settles the active paragraph, table, list, fence, or reasoning block without duplicating content.

## Does HyperMarkdown require an AI SDK?

No. Any async iterator, event source, WebSocket, fetch stream, or callback can write deltas.

## Are Mermaid and KaTeX included in the core bundle?

No. Heavy features are optional plugins. Mermaid is dynamically imported on first diagram use.

## Is raw HTML safe?

Sanitized mode is the default, but security depends on your product's trust boundary. Use literal mode for the strongest treatment of untrusted markup and narrow link/image policies where needed.

## Can I provide arbitrary remark and rehype plugins?

Not through the component API. HyperMarkdown's caching pipeline relies on controlled transforms. Use the typed plugin slots and React component overrides.

## Why do component overrides need stable references?

React elements are keyed partly by component identity. Recreating an override function can remount rendered elements and discard their state.

## Does it work on GitHub Pages or other static hosts?

Yes. HyperMarkdown has no backend requirement. It supports SSR and hydration,
and this documentation site and playground are also a static build. See
[SSR, hydration, and Next.js](/docs/ssr) for framework guidance.
