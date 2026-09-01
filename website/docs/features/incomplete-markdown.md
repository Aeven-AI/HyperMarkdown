---
title: Incomplete Markdown
description: How HyperMarkdown keeps partial links, code fences, tables, lists, HTML, and math stable while tokens arrive.
---

# Incomplete Markdown

Model output rarely stops at a Markdown boundary. A delta can end halfway
through a delimiter, link destination, HTML tag, table row, or TeX expression.
HyperMarkdown treats those intermediate states as normal input.

## What happens while content is incomplete

| Incoming content | Streaming behavior |
| --- | --- |
| Half-written links and autolinks | Withheld until the destination is safe to expose |
| Partial HTML tags | Withheld instead of flashing as text |
| Open code fences | Complete lines render; the changing line stays at the frontier |
| Growing tables | Settled rows render and are cached |
| Growing lists | Settled items render and are cached |
| Incomplete math | Held until the configured math plugin can parse it safely |
| Unambiguous emphasis | Rendered as soon as CommonMark delimiter rules allow it |

## Chunk boundaries do not matter

These two sequences produce the same finalized output:

```ts
handle.write("A **strong** answer");
handle.write(" with [a link](https://example.com)", true);
```

```ts
handle.write("A **str");
handle.write("ong** answer with [a li");
handle.write("nk](https://example.com)", true);
```

You do not need to buffer deltas until a paragraph or block closes. Pass each
fragment exactly once and finalize the stream when the transport ends.

## Finalization

The visible result may look complete while the renderer still has an active
paragraph, table, list, fence, or reasoning block. Finalize once to settle it:

```ts
renderer.current?.write("", true);
```

Finalized streaming output is tested against whole-document rendering across
the correctness fixture suite.

## Related guides

- [Streaming and delta rendering](/docs/streaming)
- [Performance and caching](/docs/performance)
- [Security and sanitization](/docs/security)

