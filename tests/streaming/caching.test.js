import { beforeAll, describe, expect, it } from "vitest";

let Renderer;

beforeAll(async () => {
  Renderer = (await import("../lib/renderer")).default;
});

/**
 * Stream a document and watch what happens to already-cached entries.
 *
 * The point of the sub-block caches is that a row or line that has already
 * been rendered is never rendered again — it keeps its element identity, so
 * React reconciles it away. Only the last one, still being written, may change
 * from chunk to chunk.
 */
function churn(md, pick, chunkSize = 24) {
  const renderer = new Renderer({ streaming: true, plugins: {} });

  let previous = [];
  let rerendered = 0;
  let worstFrame = 0;

  for (let i = 0; i < md.length; i += chunkSize) {
    renderer.streamMd(md.slice(i, i + chunkSize), true, false, false);

    const current = [...pick(renderer)];
    let changed = 0;

    // Everything except the trailing entry should be identical by reference.
    for (let k = 0; k < Math.min(previous.length, current.length) - 1; k++) {
      if (previous[k] !== current[k]) {
        changed++;
      }
    }

    rerendered += changed;
    worstFrame = Math.max(worstFrame, changed);
    previous = current;
  }

  renderer.streamMd("", true, false, true);

  return { entries: previous.length, rerendered, worstFrame };
}

function tableWith(header, rows) {
  const out = [header, "|---|---|---|"];

  for (let i = 0; i < rows; i++) {
    out.push(`| a${i} | b${i} | c${i} |`);
  }

  return out.join("\n") + "\n\n";
}

function codeBlock(lines) {
  const out = ["```js"];

  for (let i = 0; i < lines; i++) {
    out.push(`const value${i} = ${i};`);
  }

  return out.concat("```", "").join("\n");
}

describe("sub-block caching", () => {
  it("renders each row of a table with a header exactly once", () => {
    const result = churn(tableWith("| A | B | C |", 40), (r) => r.tableCache.data);

    expect(result.entries).toBeGreaterThan(35);
    expect(result.worstFrame).toBe(0);
    expect(result.rerendered).toBe(0);
  });

  it("renders each row of a headless table exactly once", () => {
    const result = churn(tableWith("| | | |", 40), (r) => r.tableCache.data);

    expect(result.entries).toBeGreaterThan(35);
    expect(result.worstFrame).toBe(0);
    expect(result.rerendered).toBe(0);
  });

  it("renders each line of a code block exactly once", () => {
    const result = churn(codeBlock(40), (r) => r.codeCache.data);

    expect(result.entries).toBeGreaterThan(35);
    expect(result.worstFrame).toBe(0);
    expect(result.rerendered).toBe(0);
  });

  it("keeps rows cached across a table closing", () => {
    const md = tableWith("| A | B | C |", 20);
    const renderer = new Renderer({ streaming: true, plugins: {} });

    for (let i = 0; i < md.length; i += 24) {
      renderer.streamMd(md.slice(i, i + 24), true, false, false);
    }

    const before = [...renderer.tableCache.data];
    renderer.streamMd("", true, false, true);
    const after = renderer.tableCache.data;

    for (let i = 0; i < before.length - 1; i++) {
      expect(after[i]).toBe(before[i]);
    }
  });
});
