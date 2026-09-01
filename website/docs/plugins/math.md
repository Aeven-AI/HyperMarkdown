---
title: KaTeX math
description: Render inline and display TeX with the optional KaTeX plugin, including streaming-safe incomplete math.
---

# KaTeX math

The math plugin uses `remark-math` and `rehype-katex` to render inline and
display TeX. Without it, dollar-delimited math remains literal text.

## Install

```bash
npm install katex remark-math rehype-katex
```

## Configure

```tsx
import { katexPlugin } from "@aeven-ai/hypermarkdown/plugins/math";
import "katex/dist/katex.min.css";

const plugins = {
  math: katexPlugin(),
};

<HyperMarkdown md={markdown} plugins={plugins} />
```

The KaTeX stylesheet is required. Import it once from your application entry
point or Next.js root layout.

## Syntax

```markdown
Inline math: $E = mc^2$

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$
```

HyperMarkdown also normalizes common model-friendly TeX delimiters into the
same math nodes used by the dollar syntax.

## KaTeX options

Pass KaTeX-compatible `rehype-katex` options to the factory:

```tsx
const plugins = {
  math: katexPlugin({
    strict: false,
    throwOnError: false,
  }),
};
```

## Streaming behavior

Half-arrived formulas are withheld until they are safe to parse. Animation
does not split the KaTeX root, so equation markup remains structurally intact.
The plugin also normalizes the single-character Celsius symbol to a form for
which KaTeX has glyph metrics.

## Related guides

- [Plugin overview](/docs/plugins)
- [Incomplete Markdown](/docs/features/incomplete-markdown)
- [Styling](/docs/styling)

