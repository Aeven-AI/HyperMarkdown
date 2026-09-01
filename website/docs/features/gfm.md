---
title: Tables and GFM
description: Use GitHub Flavored Markdown tables, task lists, strikethrough, autolinks, footnotes, and hard breaks with HyperMarkdown.
---

# Tables and GitHub Flavored Markdown

GitHub Flavored Markdown is built into the core renderer. No plugin is needed
for tables, task lists, strikethrough, autolinks, or footnotes.

## Tables

```markdown
| Model | Status | Latency |
| :--- | :---: | ---: |
| Alpha | Ready | 180 ms |
| Beta | Streaming | 240 ms |
```

Table rows are cached individually while a table streams. HyperMarkdown can
also repair a temporarily missing header or delimiter so stable rows remain
visible until the real structure arrives.

Constrain tall tables and configure their toolbar independently:

```tsx
<HyperMarkdown
  md={markdown}
  tableMaxHeight="60vh"
  controls={{ table: { copy: true, fullscreen: true } }}
/>
```

The copy control uses the browser's rendered row and cell boundaries, so the
result can be pasted back into spreadsheet-like tools as a table.

## Task lists

```markdown
- [x] Parse settled blocks
- [ ] Render the active frontier
  - [x] Preserve nested structure
```

Incomplete task markers and nested list structure are repaired while the list
is still arriving. Settled list items move into the list cache.

## Strikethrough and autolinks

```markdown
~~obsolete~~ current

https://example.com
support@example.com
```

Rendered URLs still pass through HyperMarkdown's link policy. See
[Link safety](/docs/features/link-safety) before narrowing protocols or hosts.

## Footnotes

```markdown
The answer has a source.[^1]

[^1]: Supporting detail.
```

Footnote references and back-references stay within the page instead of
opening a new tab.

## Related guides

- [Incomplete Markdown](/docs/features/incomplete-markdown)
- [Block controls](/docs/features/interactivity)
- [Link safety](/docs/features/link-safety)

