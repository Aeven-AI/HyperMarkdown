---
title: Migration from react-markdown
---

# Migration from react-markdown

Finished content is a component swap:

```tsx
// Before
<ReactMarkdown>{markdown}</ReactMarkdown>

// After
<HyperMarkdown md={markdown} />
```

Streaming changes the ownership model:

```tsx
// Before: rebuild the growing document through React.
const [markdown, setMarkdown] = useState("");
setMarkdown((current) => current + delta);
<ReactMarkdown>{markdown}</ReactMarkdown>

// After: deliver only the new fragment.
renderer.current?.write(delta);
<HyperMarkdown ref={renderer} streaming />
```

| Previous pattern | HyperMarkdown |
| --- | --- |
| Markdown passed as children | `md={markdown}` |
| Growing text prop | `write(delta)` |
| Clear state | `reset()` |
| End-of-stream flag | `write("", true)` |
| GFM remark plugin | Built in |
| Component mapping | `components={{ ... }}` |
| Math, highlighting, Mermaid | Typed optional plugins |
| Raw HTML plugin | Built in and sanitized by default |

HyperMarkdown does not accept arbitrary `remarkPlugins` or `rehypePlugins`. Use typed feature plugins and component overrides. Verify any custom AST transform before removing the old renderer.
