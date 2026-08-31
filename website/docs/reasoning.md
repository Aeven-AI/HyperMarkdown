---
title: Reasoning blocks
---

# Reasoning blocks

Model reasoning wrapped in `<think>`, `<thinking>`, or `<reasoning>` becomes a collapsible block. It stays open while tokens arrive and collapses when the block finishes.

```markdown
<think>
Checking the constraints first.
</think>

The answer is 42.
```

Markdown inside the block renders normally. Partial opening tags such as `<thi` are withheld instead of flashing as text.

## Portal reasoning elsewhere

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

If the target is absent or returns `null`, reasoning renders in place. This makes it safe to pass a ref before its element has mounted.

## Presentation

Set `controls={{ reasoning: false }}` to render reasoning without the disclosure wrapper. Localize the live and completed labels with `translations.thinking` and `translations.thoughtFor`.
