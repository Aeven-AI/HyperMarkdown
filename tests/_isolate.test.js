import { beforeAll, describe, it } from "vitest";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

let Renderer;
beforeAll(async () => { Renderer = (await import("/Users/Mac/Projects/Nodejs/Aeven/clients/client/HyperMarkdown/lib/renderer.tsx")).default; });

function engineOnly(md, chunk = 64) {
  const r = new Renderer({ streaming: true, plugins: {} });
  let renderCalls = 0;

  // count how often the table cache actually parses a row
  const cache = r.tableCache;
  const origRow = Object.getPrototypeOf(cache).renderRow;
  Object.getPrototypeOf(cache).renderRow = function (...a) { renderCalls++; return origRow.apply(this, a); };

  const t0 = performance.now();
  for (let i = 0; i < md.length; i += chunk) r.streamMd(md.slice(i, i + chunk), true, false, false);
  r.streamMd("", true, false, true);
  const parseMs = performance.now() - t0;

  // now time just building the react element tree repeatedly
  const t1 = performance.now();
  for (let i = 0; i < 100; i++) r.render();
  const renderMs = (performance.now() - t1) / 100;

  Object.getPrototypeOf(cache).renderRow = origRow;
  return { parseMs, renderMs, renderCalls, rows: r.tableCache.data.length };
}

describe("isolate", () => {
  it("table-large engine only", () => {
    const md = readFileSync("/Users/Mac/Projects/Nodejs/Aeven/clients/client/HyperMarkdown/benchmarks/fixtures/table-large.md", "utf8");
    const r = engineOnly(md);
    console.log("TABLE  stream(engine only):", r.parseMs.toFixed(0), "ms |",
                "renderRow calls:", r.renderCalls, "| rows:", r.rows,
                "| render() build:", r.renderMs.toFixed(2), "ms");
  });

  it("code-large engine only", () => {
    const md = readFileSync("/Users/Mac/Projects/Nodejs/Aeven/clients/client/HyperMarkdown/benchmarks/fixtures/code-large.md", "utf8");
    const rr = new Renderer({ streaming: true, plugins: {} });
    const t0 = performance.now();
    for (let i = 0; i < md.length; i += 64) rr.streamMd(md.slice(i, i + 64), true, false, false);
    rr.streamMd("", true, false, true);
    console.log("CODE   stream(engine only):", (performance.now() - t0).toFixed(0), "ms | lines:", rr.codeCache.data.length);
  });
});
