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

The app itself still uses Suisse, so glyph metrics differ slightly between this
page and `/chat-test` — everything driven by CSS matches, but anything measured
in `ch` (the list indent) will not. That is expected and is the only difference
between the two.

## Verifying against the app

The component's stylesheet is meant to reproduce the app's rendering exactly.
The check is a computed-style diff: 44 selectors × 21 properties on this page
against the same on the app's `/chat-test`, expecting every one to match.
