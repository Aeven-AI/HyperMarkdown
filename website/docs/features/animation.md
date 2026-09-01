---
title: Word animation
description: Fade newly arriving words into streaming HyperMarkdown output and understand its rendering tradeoffs.
---

# Word animation

Set `animation` on a streaming renderer to fade newly arriving words in as
they mount:

```tsx
<HyperMarkdown ref={renderer} streaming animation />
```

The animation stylesheet is included in
`@aeven-ai/hypermarkdown/styles.css`; no additional import is required.

## How it behaves

HyperMarkdown adds animation metadata to eligible text while the active block
is processed. React reconciliation keeps settled elements stable, so existing
words do not restart their animation when a new delta arrives.

Code blocks, Mermaid output, and KaTeX roots are kept structurally intact.
Links retain their own metadata while their visible text can participate in
the word transition.

## Highlighting tradeoff

Word animation and streamed syntax highlighting both transform the active
text. When `animation` is enabled, streamed syntax highlighting is paused so
the two transformations do not compete. Finished fenced code is still handled
by the configured code plugin after the block settles.

For maximum throughput and the smallest DOM, leave animation off. Enable it
when the softer visual arrival is worth the additional spans.

## Reduced motion

Respect the user's motion preference in the host application. The shipped
styles can be overridden in your existing reduced-motion rule:

```css
@media (prefers-reduced-motion: reduce) {
  .hypermarkdown [data-animate-key] {
    animation: none !important;
  }
}
```

## Related guides

- [Configuration](/docs/configuration)
- [Streaming and delta rendering](/docs/streaming)
- [Performance and caching](/docs/performance)

