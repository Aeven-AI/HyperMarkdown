---
title: Performance architecture
---

# Performance architecture

HyperMarkdown parses the change, not the conversation.

## Sub-block caching

Document-level memoization cannot help when one giant code block or table remains active for thousands of chunks. HyperMarkdown settles smaller units:

- complete code lines
- complete table rows
- complete list items
- the changing trailing frontier

Those units retain their parsed output and React identity. New input only pays for work that can still change.

```text
Traditional streaming renderer

new token
   ↓
growing active block
   ↓
parse the active block again
   ↓
render again
```

HyperMarkdown:

```text
new token
   ↓
active block
   │
   ├── settled code lines    → cached
   ├── settled table rows    → cached
   ├── settled list items    → cached
   └── changing frontier     → parse
```

A 1,000-line code block does not become a 1,000-line parsing problem every time another token arrives.

## Integration guidance

To preserve the architecture's advantage:

1. Write deltas rather than accumulated snapshots.
2. Keep one renderer mounted for the duration of an answer.
3. Finalize exactly once.
4. Build plugin objects and component maps once.
5. Avoid mirroring the active Markdown buffer through React state.
6. Leave word animation off unless you need it; it grows the DOM and pauses streamed highlighting.
7. Coalesce tiny tokens (rAF or 16–32 ms) so parse+commit is per frame, not per character.

See [Benchmark methodology](/docs/benchmarks) for how the numbers on the homepage were measured.
