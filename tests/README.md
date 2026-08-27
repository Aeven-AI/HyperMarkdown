# HyperMarkdown tests

The suite is split by test boundary so failures explain what broke and coverage
figures remain comparable over time.

## Unit tests

`tests/unit/` exercises deterministic modules directly. It does not mount the
renderer, create a browser DOM, or replay an entire stream. The dedicated
configuration measures the explicitly listed unit-testable source surface and
enforces a coverage floor.

```sh
npm run test:unit
npm run test:coverage:unit
```

Coverage is written to `coverage/unit/` as terminal text, JSON summary, and an
HTML report. The declared unit source surface is gated at 100% statements,
lines, functions, and branches. Add new deterministic modules to that surface as
they move behind direct unit tests; do not lower the gate to make a change pass.

## Layout

The staged reorganization is complete — nothing is left at the root.

| suite | what belongs there | run |
| --- | --- | --- |
| `unit/` | deterministic modules, called directly; no DOM, no stream replay | `npm run test:unit` |
| `correctness/` | public Markdown behaviour through real renderers, no private structures | `npm run test:correctness` |
| `streaming/` | the engine: caching, block boundaries, stream-vs-document parity | `npm run test:streaming` |
| `ui/` | mounted components: toolbars, fullscreen, translations, icons, controls | `npm run test:ui` |
| `api/`, `plugins/` | the public surface: props, the imperative handle, plugin slots and their degradation | `npm run test:api` |
| `security/` | sanitization and link safety end to end | `npm run test:security` |

`helpers/render.js` holds the shared render helpers; `fixtures/` holds the
captured streams the streaming suites replay.

`streaming/regression.test.js` is the original monolith. It is still one file
because its cases share a page of local helpers, and splitting it is a
mechanical job better done when something in it next needs changing — not as
its own risky commit.

Browser integration, accessibility checks, and renderer comparison fixtures
belong in later suites rather than the unit gate.

## Test design

- Prefer table-driven cases for syntax families and edge conditions.
- Assert exact values for pure functions and structural invariants for mutable
  trees.
- Include settled, incomplete, escaped, protected, and adversarial input.
- Keep fixtures close to the smallest suite that owns them.
- Every fixed parser regression should gain the smallest direct unit case and,
  when relevant, a streaming regression.
