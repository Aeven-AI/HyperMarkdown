# Example

A static page that streams a recorded conversation through the built
component. No build step: open it from any static server.

```sh
npm run build          # in the parent, produces dist/
npx http-server ..     # serve the repo root
# then open /example/index.html
```

It is the app's `ChatTest` view with the app taken away — a transcript of
finished turns from `test-content.json`, then one more assistant turn streamed
chunk by chunk out of `test-markdown-stress-two.json`, replaying the recorded
deltas at their original size.

## What styles what

`../dist/hypermarkdown.css` styles everything inside a message. That is the
point of the demo: if a table, code block, diagram or formula looks right here,
it looks right anywhere the package is installed.

`example.css` only does page chrome — the centred column, the user bubbles, the
status bar — plus two things the component deliberately leaves to the host:

- **Fonts.** The package names no typeface of its own; it reads `--hm-font` and
  `--hm-font-mono`. This page loads Geist and Geist Mono and points those
  variables at them.
- **KaTeX's stylesheet**, from a CDN. The maths plugin does not inline it. Note
  it comes from jsdelivr rather than esm.sh, which serves `.css` with a MIME
  type browsers refuse for a stylesheet.

Mermaid is configured in `example.js`, not in CSS — it draws the diagram itself,
so its theme and font are passed to `mermaidPlugin()`.

## Fonts

`assets/fonts/` holds Geist and Geist Mono, under the **SIL Open Font License
1.1** (`LICENSE-Geist.txt`). Geist is a Swiss neo-grotesque and Geist Mono is
drawn to match it, which is why they are here rather than the app's Suisse
Int'l: near enough in feel, and free to redistribute.

Both are the **variable** cuts — one `wght`-axis woff2 per family covering
100-900, so every weight the page uses costs one request between them, and
intermediate values render as real instances rather than synthesised ones. The
page's default text weight is **450** (book), set on `body` in `example.css`,
which also lifts the package's three mono rules (`code`, code-block `code`, the
line-number gutter) from 400 to 450 so code matches the prose. The package's own
rules still decide the rest — 600 for headings, for instance. Blockquote
paragraphs, which the package pins to 400, are lifted to 450 here too, so all
prose on the page sits at book weight.

Tracking is **normal** throughout. The package's three tracking variables
(`--hm-tracking` 0.2px, `--hm-title-tracking` -0.2px, `--hm-code-tracking`
-0.5px) are reset on `.hypermarkdown`, `body` drops its own 0.2px, and the mono
override clears the -0.1px the package hard-codes on inline `code`. The files are woff2-only, which every browser that
can run this page's ESM imports supports.

The app itself still uses Suisse, so glyph metrics differ slightly between this
page and `/chat-test` — everything driven by CSS matches, but anything measured
in `ch` (the list indent) will not. That is expected and is the only difference
between the two.

## Verifying against the app

The component's stylesheet is meant to reproduce the app's rendering exactly.
The check is a computed-style diff: 44 selectors × 21 properties on this page
against the same on the app's `/chat-test`, expecting every one to match.
