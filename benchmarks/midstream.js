import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
for (const k of ["HTMLElement","Element","Node","SVGElement","DOMParser"]) globalThis[k] = dom.window[k];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
globalThis.ResizeObserver ??= class { observe(){} unobserve(){} disconnect(){} };
globalThis.IntersectionObserver ??= class { observe(){} unobserve(){} disconnect(){} };

const { flushSync } = await import("react-dom");
const { createRoot } = await import("react-dom/client");
const { byName } = await import("./renderers/index.js");

const md = readFileSync("./fixtures/table-large.md", "utf8");
const settle = () => new Promise(r => setImmediate(r));

for (const name of ["HyperMarkdown", "markstream-react", "Streamdown"]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const s = byName.get(name).create();

  const checkpoints = {};
  const chunks = [];
  for (let i = 0; i < md.length; i += 64) chunks.push(md.slice(i, i + 64));

  for (let i = 0; i < chunks.length; i++) {
    s.write(chunks[i]);
    flushSync(() => root.render(s.element()));
    await settle();
    const pct = Math.round(((i + 1) / chunks.length) * 100);
    if ([25, 50, 75].includes(pct) && !checkpoints[pct]) {
      checkpoints[pct] = {
        tr: host.querySelectorAll("tr").length,
        nodes: host.querySelectorAll("*").length,
        chars: host.textContent.length,
      };
    }
  }
  s.finish();
  flushSync(() => root.render(s.element()));
  await settle();

  console.log(name.padEnd(17),
    "25%:", JSON.stringify(checkpoints[25]),
    "50%:", JSON.stringify(checkpoints[50]),
    "final tr:", host.querySelectorAll("tr").length,
    "final chars:", host.textContent.length);

  flushSync(() => root.unmount());
  host.remove();
}
