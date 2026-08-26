# Renderer correctness corpus

These tests exercise public Markdown behavior above the isolated unit boundary.
They run real HyperMarkdown renderers and deliberately avoid assertions about
private parser data structures.

The initial corpus adapts portable cases from Markstream Vue's root test suite,
reviewed at commit `255900c26037b1f41f08cd95e75bb050e6dfc44c`:

<https://github.com/Simon-He95/markstream-vue/tree/main/test>

Relevant source areas include `markdown-midstates`, fixture parsing, blockquote
regressions, trailing fences, link parsing, numeric/JSON documents, math false
positives, inline-code math protection, adjacent HTML, and unknown HTML tags.
Vue/component internals and Markstream-only syntax are intentionally not copied.

The corpus also adapts renderer-neutral cases from Streamdown's tests, reviewed
at commit `5578e89281d57de0a449125d2a6b45a8812223a6`:

<https://github.com/vercel/streamdown/tree/main/packages/streamdown/__tests__>

Those additions cover fence length, indentation and marker identity; code/math
separation; false footnote detection; URL protocols; email data; CJK punctuation;
and balanced nested HTML. Streamdown-specific controls, React lifecycle behavior,
and optional syntax with no HyperMarkdown equivalent remain out of scope.

Run the corpus with:

```sh
npm run test:correctness
```

Correctness and coverage are separate gates. `test:coverage:unit` measures the
deterministic unit surface; this corpus checks public renderer behavior in both
whole-document and incremental modes.
