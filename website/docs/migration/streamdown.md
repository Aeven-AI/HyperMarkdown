---
title: Migration from Streamdown
---

# Migration from Streamdown

Streamdown commonly receives the accumulated string as children. HyperMarkdown's finished mode maps directly, but its fastest streaming path uses a ref:

```tsx
// Streamdown
<Streamdown isAnimating={status === "streaming"}>
  {accumulatedText}
</Streamdown>

// HyperMarkdown
<HyperMarkdown ref={renderer} streaming animation />
```

Move accumulation out of React state and call `write(delta)` from the same callback that receives provider events.

| Streamdown | HyperMarkdown |
| --- | --- |
| Children / accumulated text | `write(delta)` while streaming, `md` when finished |
| `isAnimating` | `streaming` plus `write("", true)` at the end |
| `parseIncompleteMarkdown` | Built in |
| Plugin packages | `plugins={{ math, code, diagram, cjk }}` |
| Component overrides | `components` with stable identities |
| Tailwind typography | Import `@aeven-ai/hypermarkdown/styles.css` and theme with `--hm-*` variables |

Import the stylesheet once. Map optional Streamdown packages into the `plugins` object rather than passing remark/rehype arrays.

If a provider only gives cumulative snapshots, convert them to deltas at the boundary; see [Streaming and delta rendering](/docs/streaming).
