export const homepageDemo = `<think>
Show the architecture, a table, a code sample, and a formula — the shapes a model actually streams.
</think>

# HyperMarkdown

**Parse the change. Not the conversation.**

HyperMarkdown is a *streaming-native* Markdown renderer for React. It was built for AI interfaces where content arrives token-by-token, but it works just as well for a finished document.

Most streaming renderers re-parse the active block on every update. HyperMarkdown caches settled **code lines**, **table rows**, and **list items**, and only parses the changing frontier.

## Getting started

Install the package, import the stylesheet once, then write deltas into a mounted handle.

\`\`\`tsx
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

const Chat = () => {
  const ref = useRef<HyperMarkdownHandle>(null);
  return <HyperMarkdown ref={ref} streaming animation />;
};
\`\`\`

\`write(delta)\` appends. \`write("", true)\` finalizes the open tail.

## What stays cached

| Unit | Cached when |
| --- | --- |
| Code line | The line receives its newline |
| Table row | The row is complete |
| List item | The next item or block starts |

## Why it is fast

- [x] Sub-block caches for *code*, *tables*, and *lists*
- [x] Incomplete Markdown is withheld, not guessed
- [x] Optional plugins for math, highlighting, Mermaid, and CJK
- [ ] Re-parsing the whole conversation

The quadratic formula still holds:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

> Completed work stays completed. A 1,000-line fence is not a 1,000-line problem every time another token arrives.
`;

export const mathDemo = `Inline math $e^{i\\pi} + 1 = 0$ and a display block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

TeX delimiters work too: \\(a^2 + b^2 = c^2\\) and

\\[
\\sum_{n=1}^{N} n = \\frac{N(N+1)}{2}
\\]
`;

export const mermaidDemo = `A small flowchart while it is still arriving:

\`\`\`mermaid
flowchart LR
  delta[New delta] --> block[Active block]
  block --> lines[Cached code lines]
  block --> rows[Cached table rows]
  block --> items[Cached list items]
  block --> frontier[Changing frontier]
\`\`\`
`;

export const reasoningDemo = `<think>
I should check whether the stream can withhold an incomplete tag.
A partial \`<thi\` must not flash as text.
</think>

The answer is the cached frontier, not the whole conversation.
`;

export const cjkDemo = `日本語の強調は \`**日本語（説明）**続き\` のように括弧を挟んでも切れません。

**強調（説明）**とその続き、そして *片側* の処理を確認します。
`;

export const proseDemo = `## Streaming Markdown

HyperMarkdown takes **deltas**, not the accumulated document.

- Write each fragment once
- Finalize the open tail
- Keep one renderer mounted

> Completed work stays completed.
`;
