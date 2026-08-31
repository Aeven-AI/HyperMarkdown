---
sidebar_position: 4
title: Streaming and delta rendering
---

# Streaming and delta rendering

HyperMarkdown is fastest when the transport boundary preserves deltas. If an SDK emits `"Hello"` and then `" world"`, write those two values directly.

```tsx
import { useRef } from "react";
import {
  HyperMarkdown,
  type HyperMarkdownHandle,
} from "@aeven-ai/hypermarkdown";

export function Answer() {
  const renderer = useRef<HyperMarkdownHandle>(null);

  async function generate() {
    renderer.current?.reset();

    try {
      for await (const delta of createResponseStream()) {
        renderer.current?.write(delta);
      }
    } finally {
      renderer.current?.write("", true);
    }
  }

  return (
    <>
      <button onClick={generate}>Generate</button>
      <HyperMarkdown ref={renderer} streaming />
    </>
  );
}
```

`write()` appends. Pass each delta exactly once:

```tsx
renderer.current?.write(delta);     // correct
renderer.current?.write(fullText);  // wrong: repeats previous content
```

## Finalize every stream

The last open paragraph, table, list, code fence, or reasoning block must be settled exactly once:

```tsx
renderer.current?.write("", true);
```

You can combine the last fragment and finalization:

```tsx
renderer.current?.write(lastDelta, true);
```

Finalization matters even when the output already looks complete. It closes the active frontier and finishes incomplete-block bookkeeping.

## Reset between answers

Reuse the mounted component and reset its store:

```tsx
renderer.current?.reset();
```

Do not change the component's React `key` during an answer. A new key creates a new, empty renderer.

## Convert cumulative snapshots

Some providers emit `"Hello"`, then `"Hello world"`. Convert snapshots into deltas once, at the boundary:

```tsx
let previous = "";

function begin() {
  previous = "";
  renderer.current?.reset();
}

function writeSnapshot(next: string, final = false) {
  const handle = renderer.current;
  if (!handle) return;

  if (!next.startsWith(previous)) {
    handle.reset();
    previous = "";
  }

  handle.write(next.slice(previous.length), final);
  previous = next;
}
```

## Avoid the React state loop

Do not accumulate the full answer in React state solely to pass it back on every token. In streaming mode, HyperMarkdown owns the buffer. Your surrounding component tree remains stable while only the active Markdown frontier changes.

## Incomplete Markdown

Chunk boundaries can land inside links, tags, emphasis, math, tables, or code fences. HyperMarkdown treats that as normal input:

- unsafe partial syntax is withheld
- stable code lines, table rows, and list items are cached
- the changing frontier is repaired and rendered
- final output matches whole-document parsing
