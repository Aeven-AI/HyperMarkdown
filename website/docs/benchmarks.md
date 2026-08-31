---
title: Benchmark methodology
---

# Benchmark methodology

The repository benchmark is a head-to-head of React markdown renderers doing the thing that matters while a model is talking: taking one more chunk and getting it on screen.

Each renderer × fixture is split into fixed-size chunks and fed one at a time. A frame times **both** the write and the React commit:

```js
const t0 = performance.now();
stream.write(chunk);
flushSync(() => root.render(stream.element()));
frames.push(performance.now() - t0);
```

For renderers that accumulate a string and parse in the component, the work is in `render`. For HyperMarkdown, `write()` is the parse. Timing only one of them flatters one design.

Measurements run in their own process under `NODE_ENV=production`. The report uses the run with the median total time.

## Fixtures

| Fixture | What it stresses |
| --- | --- |
| `code-large.md` | One growing fenced block — block-level freezing cannot help |
| `table-large.md` | Same, plus inline markup in every cell |
| `prose-mixed.md` | Many small blocks, where block-level freezing does help |
| `real-code-os.md` | Captured model output, 8-character frames |
| `real-table-head.md` | Captured model table, 8-character frames |

The captured fixtures are not generated stress cases. Their content is real AI output.

## How to read the table

Absolute milliseconds are from one machine on one day (Apple M2 Max in the published run). Ratios travel; milliseconds do not.

Read the DOM-nodes and rendered-percent columns before the times. A renderer that defers or skeletons a block is doing less work.

Reproduce locally:

```bash
npm install
npm run benchmark
```

Full notes live in [`benchmarks/README.md`](https://github.com/Aeven-AI/HyperMarkdown/blob/main/benchmarks/README.md) and [`benchmarks/results/latest.md`](https://github.com/Aeven-AI/HyperMarkdown/blob/main/benchmarks/results/latest.md).
