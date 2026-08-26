/**
 * Measures one renderer against one fixture, then exits.
 *
 * One process per measurement on purpose: a shared process lets jsdom garbage
 * and React's dev-mode fibers from earlier runs distort later ones, and with
 * five renderers over thousands of frames it exhausts the heap outright. A
 * fresh process also means no renderer benefits from another's JIT warm-up.
 */
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { JSDOM } from "jsdom";

const arg = (name, fallback) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found === undefined ? fallback : found.split("=").slice(1).join("=");
};

const fixturePath = arg("fixture");
const rendererName = arg("renderer");
const chunkSize = Number(arg("chunk", "24"));
const runs = Number(arg("runs", "1"));
const warmup = Number(arg("warmup", "0"));

// How often to report progress back to the parent, in frames.
const progressEvery = Number(arg("progress", "25"));

function report(kind, payload) {
  process.stderr.write(JSON.stringify({ kind, ...payload }) + "\n");
}

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
});
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// flushSync rather than act(): act only exists in React's development build,
// and development React is several times slower than the one you ship. Both
// force the commit to finish before returning, which is what has to be timed.
// Passive effects stay outside the measurement — equally, for every renderer.
const { flushSync } = await import("react-dom");
const { createRoot } = await import("react-dom/client");
const { byName } = await import("./renderers/index.js");

const renderer = byName.get(rendererName);
const text = readFileSync(fixturePath, "utf8");

function chunksOf(source, size) {
  const out = [];
  for (let i = 0; i < source.length; i += size) {
    out.push(source.slice(i, i + size));
  }
  return out;
}

/** One turn of the event loop, so scheduled work is not deferred past the run. */
function settle() {
  return new Promise((resolve) => setImmediate(resolve));
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

async function once() {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const root = createRoot(host);
  const stream = renderer.create();
  const chunks = chunksOf(text, chunkSize);
  const frames = [];

  const started = performance.now();

  report("start", { frames: chunks.length });

  for (let i = 0; i < chunks.length; i++) {
    // write() has to be inside the timed region: for renderers that parse on
    // write (HyperMarkdown) it *is* the parse, while for the ones that just
    // accumulate a string the work lands in element(). Timing only the render
    // would hide half of one design and none of the other.
    const t0 = performance.now();

    stream.write(chunks[i]);
    flushSync(() => {
      root.render(stream.element());
    });

    frames.push(performance.now() - t0);

    // Let effects, timers and rAF callbacks run, as they would between frames
    // in a browser. Some renderers schedule their next step from one.
    await settle();

    if (i % progressEvery === 0 || i === chunks.length - 1) {
      report("progress", {
        frame: i + 1,
        frames: chunks.length,
        elapsed: performance.now() - started,
      });
    }
  }

  stream.finish();
  flushSync(() => {
    root.render(stream.element());
  });

  const total = performance.now() - started;
  const nodes = host.querySelectorAll("*").length;
  const chars = host.textContent.replace(/\s+/g, " ").trim().length;

  flushSync(() => root.unmount());
  host.remove();

  const sorted = [...frames].sort((a, b) => a - b);

  return {
    total,
    frames: frames.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted.at(-1) ?? 0,
    nodes,
    chars,
  };
}

try {
  let measured;
  let measuredRunsSorted;
  const measuredRuns = [];

  for (let run = 0; run < warmup + runs; run++) {
    report("pass", { run: run + 1, of: warmup + runs });

    measured = await once();

    if (run >= warmup) {
      measuredRuns.push(measured);
    }

    globalThis.gc?.();
  }

  measuredRunsSorted = [...measuredRuns].sort((a, b) => a.total - b.total);
  measured = measuredRunsSorted[Math.floor(measuredRunsSorted.length / 2)];

  process.stdout.write(
    JSON.stringify({
      ...measured,
      samples: measuredRuns,
    })
  );
  process.exit(0);
} catch (error) {
  process.stdout.write(
    JSON.stringify({ failed: error?.message || String(error) })
  );
  process.exit(0);
}
