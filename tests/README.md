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

The existing root-level files remain regression, component, and streaming
tests during the staged reorganization. They still run through `npm test`.
Browser integration, public API contracts, accessibility checks, and renderer
comparison fixtures belong in later suites rather than this unit gate.

## Test design

- Prefer table-driven cases for syntax families and edge conditions.
- Assert exact values for pure functions and structural invariants for mutable
  trees.
- Include settled, incomplete, escaped, protected, and adversarial input.
- Keep fixtures close to the smallest suite that owns them.
- Every fixed parser regression should gain the smallest direct unit case and,
  when relevant, a streaming regression.
