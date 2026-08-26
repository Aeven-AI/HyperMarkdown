# Vendored source

`deepseek-incremental.ts` is `packages/client/ui-primitives/src/markdown/incremental.ts`
from https://github.com/deepseek-ai/deepseek-harness, copied verbatim.

Only the incremental *parsing strategy* is vendored, not their renderer:
`render.tsx` depends on their CodeBlock component, their KaTeX wrapper and CSS
modules from inside that repo. The strategy is the part that decides how much
work a streaming chunk costs, which is what this benchmark measures — see the
note in `../renderers/deepseek.jsx` about what that does and does not tell you.
