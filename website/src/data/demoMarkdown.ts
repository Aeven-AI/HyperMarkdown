export const homepageDemo = `# HyperMarkdown

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

export const playgroundDemo = `# HyperMarkdown

**Parse the change. Not the conversation.**

HyperMarkdown is a *streaming-native* Markdown renderer for React. It takes **deltas**, not the accumulated document — so a growing answer does not become a growing parse.

Inline math is first-class: Euler's identity $e^{i\\pi} + 1 = 0$, the Gaussian integral $\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$, and $E = mc^2$.

## Streaming API

Mount one renderer. Write each fragment. Finalize the open tail.

\`\`\`tsx
import { useRef } from "react";
import { HyperMarkdown, type HyperMarkdownHandle } from "@aeven-ai/hypermarkdown";

const Chat = () => {
  const ref = useRef<HyperMarkdownHandle>(null);
  return <HyperMarkdown ref={ref} streaming animation />;
};

for await (const delta of stream) {
  ref.current?.write(delta);
}
ref.current?.write("", true);
\`\`\`

## What stays cached

| Unit | Cached when | Cost if you re-parse |
| --- | --- | --- |
| Code line | The line receives its newline | Grows with fence length |
| Table row | The row is complete | Grows with column count |
| List item | The next item or block starts | Grows with nested depth |

## Mathematics

Schrödinger's equation in a display block:

$$
i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r}, t) = \\hat{H}\\Psi(\\mathbf{r}, t)
$$

Maxwell's equations, aligned:

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
\\nabla \\cdot \\mathbf{B} &= 0 \\\\
\\nabla \\times \\mathbf{E} &= -\\frac{\\partial \\mathbf{B}}{\\partial t} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}
$$

A linear map as a matrix product:

$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}
$$

TeX delimiters work too: \\(a^2 + b^2 = c^2\\) and

\\[
\\sum_{n=1}^{N} n = \\frac{N(N+1)}{2}
\\]

## Why it is fast

- [x] Sub-block caches for *code*, *tables*, and *lists*
- [x] Incomplete Markdown is withheld, not guessed
- [x] Optional plugins for math, highlighting, Mermaid, and CJK
- [ ] Re-parsing the whole conversation on every token

## Architecture

\`\`\`mermaid
flowchart LR
  delta[New delta] --> block[Active block]
  block --> lines[Cached code lines]
  block --> rows[Cached table rows]
  block --> items[Cached list items]
  block --> frontier[Changing frontier]
\`\`\`

> Completed work stays completed. A 1,000-line fence is not a 1,000-line problem every time another token arrives.
`;

export const mathDemo = `Inline math $e^{i\\pi} + 1 = 0$, a Gaussian integral, and a Cauchy–Schwarz glance $\\lvert \\langle x, y \\rangle \\rvert \\le \\lVert x \\rVert\\,\\lVert y \\rVert$.

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

Maxwell, aligned:

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}
$$

A $2 \\times 2$ rotation:

$$
R(\\theta) = \\begin{pmatrix}
\\cos\\theta & -\\sin\\theta \\\\
\\sin\\theta & \\cos\\theta
\\end{pmatrix}
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
