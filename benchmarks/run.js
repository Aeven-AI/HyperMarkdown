/**
 * Head-to-head streaming benchmark.
 *
 * Every renderer gets the same document, the same chunk size and the same
 * React root, and is measured doing the thing that matters while a model is
 * talking: taking one more chunk and getting it on screen.
 *
 * Each frame is rendered inside act(), so the time includes React's
 * reconciliation, not just the markdown parse — a renderer that parses fast
 * but rebuilds the whole tree every chunk should not look good here, because
 * it does not feel good in a browser either.
 *
 * Each measurement runs in its own process (see worker.js) under
 * NODE_ENV=production, so the numbers reflect the React build you ship rather
 * than the development one, which is several times slower.
 *
 *   node run.js                                  the default sweep
 *   node run.js --chunk=24 --runs=3 --warmup=1   slower, steadier
 *   node run.js --only=HyperMarkdown,Streamdown  a subset
 *   node run.js --fixture=table                  fixtures matching a substring
 *   node run.js --only=HyperMarkdown --merge \
 *     --from=results/partial-only-HyperMarkdown.json
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const processors = cpus();
const environment = {
  node: process.version,
  platform: platform(),
  release: release(),
  arch: arch(),
  cpu: processors[0]?.model ?? "unknown",
  cores: processors.length,
  memoryGiB: Math.round(totalmem() / 1024 / 1024 / 1024),
};

const arg = (name, fallback) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found === undefined ? fallback : found.split("=").slice(1).join("=");
};

// Captured streams are replayed at the chunk size they actually arrived in;
// the synthetic fixtures use a coarser one. Pass --chunk to override both.
const chunkOverride = arg("chunk", "");
const chunkFor = (file) =>
  chunkOverride || (file.startsWith("real-") ? "8" : "64");
const runs = arg("runs", "1");
const warmup = arg("warmup", "0");
const only = arg("only", "");
const fixtureFilter = arg("fixture", "");
const from = arg("from", "");

// Re-measure some renderers and keep the rest of `latest` as it stands. The
// point of a benchmark is that the numbers next to each other were taken the
// same way, so this refuses to merge a run whose shape differs from the one on
// disk, and the report says which rows are new and which carried over.
const merge = process.argv.includes("--merge");

const { RENDERERS } = await import("./renderers/index.js");

const allFixtures = readdirSync(join(here, "fixtures"))
  .filter((f) => f.endsWith(".md"))
  .sort();

const renderers = only
  ? RENDERERS.filter((r) =>
      only.split(",").some((n) => r.name.toLowerCase().includes(n.toLowerCase()))
    )
  : RENDERERS;

const fixtures = readdirSync(join(here, "fixtures"))
  .filter((f) => f.endsWith(".md"))
  .filter((f) => f.includes(fixtureFilter))
  .sort();

const tty = process.stderr.isTTY === true;
let lastPrinted = 0;
const results = [];
let completedAt = null;

const totalJobs = fixtures.length * renderers.length;
let job = 0;

if (from) {
  const sourcePath = resolve(here, from);

  if (!existsSync(sourcePath)) {
    process.stderr.write(`\n--from file does not exist: ${sourcePath}\n`);
    process.exit(1);
  }

  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  const environmentMismatch = Object.entries(environment)
    .filter(([key, value]) => source.environment?.[key] !== value)
    .map(([key, value]) => `${key} ${source.environment?.[key]} vs ${value}`);
  const mismatch = [
    source.runs !== Number(runs) ? `runs ${source.runs} vs ${runs}` : null,
    source.warmup !== Number(warmup) ? `warmup ${source.warmup} vs ${warmup}` : null,
    typeof source.completedAt !== "string" ? "missing completedAt" : null,
    ...environmentMismatch,
  ].filter(Boolean);

  if (mismatch.length > 0) {
    process.stderr.write(
      `\n--from refused: the saved run does not match this invocation ` +
        `(${mismatch.join(", ")}).\n`
    );
    process.exit(1);
  }

  const expected = new Set(
    fixtures.flatMap((file) => renderers.map((renderer) => `${file}\0${renderer.name}`))
  );
  const seen = new Set();
  const unexpected = [];

  for (const row of source.results ?? []) {
    const key = `${row.fixture}\0${row.renderer}`;

    if (!expected.has(key) || seen.has(key)) {
      unexpected.push(`${row.fixture} / ${row.renderer}`);
      continue;
    }

    seen.add(key);
    results.push(row);
  }

  const missing = [...expected].filter((key) => !seen.has(key));

  if (unexpected.length > 0 || missing.length > 0) {
    process.stderr.write(
      `\n--from refused: saved rows do not match the selected fixture/renderer set` +
        `${unexpected.length ? `; unexpected or duplicate: ${unexpected.join(", ")}` : ""}` +
        `${missing.length ? `; missing: ${missing.map((key) => key.replace("\0", " / ")).join(", ")}` : ""}.\n`
    );
    process.exit(1);
  }

  completedAt = source.completedAt;
  process.stderr.write(`\nLoaded ${results.length} measured row(s) from ${sourcePath}.\n`);
} else {
  for (const file of fixtures) {
    const path = join(here, "fixtures", file);
    const text = readFileSync(path, "utf8");
    const chunk = chunkFor(file);
    const frames = Math.ceil(text.length / Number(chunk));

    process.stderr.write(`\n${file}  ${text.length} chars, ${frames} chunks of ${chunk}\n`);

    for (const renderer of renderers) {
      job++;
      const measured = await measure(renderer, path, job, chunk);
      results.push({ fixture: file, renderer: renderer.name, ...measured });
      print(renderer, measured);
    }
  }
}

completedAt ??= new Date().toISOString();

mkdirSync(join(here, "results"), { recursive: true });

let carried = null;

if (merge) {
  const latestPath = join(here, "results", "latest.json");

  if (!existsSync(latestPath)) {
    process.stderr.write("\n--merge needs an existing results/latest.json.\n");
    process.exit(1);
  }

  const previous = JSON.parse(readFileSync(latestPath, "utf8"));
  const refreshed = new Set(renderers.map((r) => r.name));
  const measuredFixtures = new Set(fixtures);

  // Merging across different settings would put numbers side by side that were
  // not taken the same way, which is the one thing the table must not do.
  const mismatch = [
    previous.runs !== Number(runs) ? `runs ${previous.runs} vs ${runs}` : null,
    previous.warmup !== Number(warmup) ? `warmup ${previous.warmup} vs ${warmup}` : null,
    previous.environment?.cpu !== environment.cpu
      ? `cpu ${previous.environment?.cpu} vs ${environment.cpu}`
      : null,
    previous.environment?.node !== environment.node
      ? `node ${previous.environment?.node} vs ${environment.node}`
      : null,
  ].filter(Boolean);

  if (mismatch.length > 0) {
    process.stderr.write(
      `\n--merge refused: this run does not match results/latest.json ` +
        `(${mismatch.join(", ")}).\n`
    );
    process.exit(1);
  }

  // Every fixture the refreshed renderers appear in has to have been measured,
  // or the merged table would mix new rows with stale ones for the same name.
  const stale = previous.results.filter(
    (row) => refreshed.has(row.renderer) && !measuredFixtures.has(row.fixture)
  );

  if (stale.length > 0) {
    process.stderr.write(
      `\n--merge refused: ${stale.length} row(s) for the refreshed renderer(s) ` +
        `were not re-measured (${[...new Set(stale.map((r) => r.fixture))].join(", ")}). ` +
        `Drop --fixture so every one is covered.\n`
    );
    process.exit(1);
  }

  if (from) {
    const shapeChanges = results.flatMap((row) => {
      const old = previous.results.find(
        (candidate) =>
          candidate.fixture === row.fixture && candidate.renderer === row.renderer
      );

      if (!old) {
        return [`${row.fixture} / ${row.renderer} is missing from latest`];
      }

      const changed = ["frames", "nodes", "chars"].filter(
        (field) => old[field] !== row[field]
      );

      return changed.length
        ? [`${row.fixture} / ${row.renderer}: ${changed.join(", ")}`]
        : [];
    });

    if (shapeChanges.length > 0) {
      process.stderr.write(
        `\n--from refused: rendered output shape differs from results/latest.json ` +
          `(${shapeChanges.join("; ")}). Re-run the benchmark instead of promoting it.\n`
      );
      process.exit(1);
    }
  }

  const replacementByKey = new Map(
    results.map((row) => [`${row.fixture}\0${row.renderer}`, row])
  );
  const missingBaseline = results.filter(
    (row) =>
      !previous.results.some(
        (candidate) =>
          candidate.fixture === row.fixture && candidate.renderer === row.renderer
      )
  );

  if (missingBaseline.length > 0) {
    process.stderr.write(
      `\n--merge refused: ${missingBaseline.length} refreshed row(s) have no ` +
        `matching row in results/latest.json. Run the complete benchmark instead.\n`
    );
    process.exit(1);
  }

  const kept = previous.results.filter((row) => !refreshed.has(row.renderer));
  const mergedResults = previous.results.map(
    (row) => replacementByKey.get(`${row.fixture}\0${row.renderer}`) ?? row
  );

  carried = {
    refreshed: [...refreshed],
    refreshedAt: completedAt,
    previousCompletedAt: previous.completedAt,
    keptRenderers: [...new Set(kept.map((row) => row.renderer))],
  };

  results.splice(0, results.length, ...mergedResults);
}

// A partial run must never overwrite a full one unless --merge was explicit
// and passed the compatibility checks above. Anything else narrower writes to
// a name that says what it was, so a --fixture or --only run cannot silently
// destroy the report someone spent an hour measuring.
const complete =
  merge ||
  (fixtures.length === allFixtures.length && renderers.length === RENDERERS.length);

const stem = complete
  ? "latest"
  : "partial-" +
    [
      fixtureFilter ? `fixture-${fixtureFilter}` : null,
      only ? `only-${only.replace(/[^a-z0-9]+/gi, "-")}` : null,
    ]
      .filter(Boolean)
      .join("-");

if (!complete) {
  process.stderr.write(
    `\nPartial run (${fixtures.length}/${allFixtures.length} fixtures, ` +
      `${renderers.length}/${RENDERERS.length} renderers) — ` +
      `writing results/${stem}.md, leaving results/latest.md alone.\n`
  );
}

writeFileSync(
  join(here, "results", `${stem}.json`),
  JSON.stringify(
    {
      runs: Number(runs),
      warmup: Number(warmup),
      aggregation: "median-total run",
      completedAt,
      environment,
      ...(carried ? { merged: carried } : {}),
      results,
    },
    null,
    2
  ) + "\n"
);
writeFileSync(join(here, "results", `${stem}.md`), report());
process.stderr.write(`\nWrote results/${stem}.md\n`);

function measure(renderer, path, index, chunk) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--expose-gc",
        "--max-old-space-size=6144",
        join(here, "worker.js"),
        `--fixture=${path}`,
        `--renderer=${renderer.name}`,
        `--chunk=${chunk}`,
        `--runs=${runs}`,
        `--warmup=${warmup}`,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        // The React build being measured should be the one you ship.
        env: { ...process.env, NODE_ENV: "production" },
      }
    );

    let out = "";
    let errLine = "";
    let pass = "";

    child.stdout.on("data", (buf) => {
      out += buf;
    });

    child.stderr.on("data", (buf) => {
      errLine += buf;
      const lines = errLine.split("\n");
      errLine = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("{")) {
          continue;
        }

        let event;

        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }

        if (event.kind === "pass" && event.of > 1) {
          pass = ` pass ${event.run}/${event.of}`;
        }

        if (event.kind === "progress") {
          progress(renderer.name, index, event, pass);
        }
      }
    });

    child.on("close", () => {
      if (tty) {
        process.stderr.write("\r" + " ".repeat(78) + "\r");
      }

      try {
        resolve(JSON.parse(out));
      } catch {
        resolve({ failed: out.slice(0, 120) || "no output" });
      }
    });
  });
}

function progress(name, index, { frame, frames, elapsed }, pass) {
  const share = frame / frames;
  const width = 24;
  const filled = Math.round(share * width);
  const eta = share > 0 ? (elapsed / share - elapsed) / 1000 : 0;

  const bar = "\u2588".repeat(filled) + "\u00b7".repeat(width - filled);
  const line =
    `  [${index}/${totalJobs}] ${name.padEnd(17)} ` +
    `${bar} ${String(Math.round(share * 100)).padStart(3)}%  ` +
    `${frame}/${frames} frames  ${(elapsed / 1000).toFixed(1)}s` +
    (share < 1 ? `  eta ${eta.toFixed(0)}s` : "") +
    pass;

  if (tty) {
    process.stderr.write("\r" + line.padEnd(78).slice(0, 78));
    return;
  }

  // Not a terminal: one line per decile instead of a redrawn bar.
  const decile = Math.floor(share * 10);

  if (decile > lastPrinted || frame === frames) {
    lastPrinted = frame === frames ? 0 : decile;
    process.stderr.write(line.trimEnd() + "\n");
  }
}

/**
 * Share of the document a renderer got on screen. Anything materially short
 * of the best is doing less work, and gets marked so the time next to it is
 * not read as a like-for-like win.
 */
function coverage(chars, expected) {
  const share = expected > 0 ? chars / expected : 1;

  if (share >= 0.95) {
    return "full";
  }

  return `**${Math.round(share * 100)}%**`;
}

function print(renderer, measured) {
  if (measured.failed) {
    process.stderr.write(`  ${renderer.name.padEnd(18)} FAILED — ${measured.failed}\n`);
    return;
  }

  process.stderr.write(
    `  ${renderer.name.padEnd(18)} ${measured.total.toFixed(0).padStart(7)}ms` +
      `   p50 ${measured.p50.toFixed(2).padStart(6)}ms` +
      `   p95 ${measured.p95.toFixed(2).padStart(7)}ms` +
      `   max ${measured.max.toFixed(0).padStart(5)}ms` +
      `   ${String(measured.nodes).padStart(6)} nodes\n`
  );
}

function report() {
  const out = [
    "# Streaming benchmark",
    "",
    "Generated by `npm run bench`. These are numbers from one machine:",
    "regenerate them rather than trusting the absolutes. The ratios are",
    "the part that travels.",
    "",
    `Environment: ${environment.cpu}, ${environment.cores} cores, ` +
      `${environment.memoryGiB} GiB, Node ${environment.node}, ` +
      `${environment.platform} ${environment.release} (${environment.arch}).`,
    "",
    `Median-total run of ${runs} measured run(s) after ${warmup} warm-up,`,
    "each measurement in its own process under `NODE_ENV=production`. A frame is",
    "one chunk arriving and being rendered through React inside `flushSync()`,",
    "so the time includes reconciliation, not just parsing. `write()` is inside",
    "the timed region too: for renderers that parse on write it *is* the parse.",
    "",
    "The slowest renderers also vary most between runs — a renderer spending",
    "80 ms a frame is at the mercy of GC in a way one spending 1 ms is not, so",
    "read their figures as a band, not a point.",
    "",
    "**Read the DOM-nodes column before the times.** The renderers do not all",
    "put the same thing on screen. A renderer that defers or skeletons a block",
    "is doing less work, and its time should be read that way rather than as a",
    "like-for-like win.",
    "",
  ];

  if (carried) {
    out.push(
      `**Partial refresh.** ${carried.refreshed.join(", ")} ` +
        `${carried.refreshed.length === 1 ? "was" : "were"} re-measured in the run of ` +
        `${carried.refreshedAt}; ` +
        `${carried.keptRenderers.join(", ")} carry over unchanged from the run of ` +
        `${carried.previousCompletedAt}. Same machine, same settings, but the rows ` +
        "were not taken on the same day — regenerate the lot with `npm run bench` " +
        "before quoting the ratios anywhere that matters.",
      ""
    );
  }

  for (const file of fixtures) {
    const rows = results.filter((r) => r.fixture === file);
    const ok = rows.filter((r) => !r.failed);
    const fastest = Math.min(...ok.map((r) => r.total));
    const text = readFileSync(join(here, "fixtures", file), "utf8");

    out.push(
      `## ${file}`,
      "",
      `${text.length} characters, ` +
        `${Math.ceil(text.length / Number(chunkFor(file)))} frames of ` +
        `${chunkFor(file)} characters.`,
      "",
      "| renderer | strategy | median total | measured range | vs best | p50 frame | p95 frame | worst frame | DOM nodes | text chars | rendered |",
      "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
    );

    // How much of the document each renderer actually put on screen, against
    // what the others managed. A renderer that virtualises or defers scores
    // well below 100% and its time is not comparable with the rest of the row.
    const charCounts = ok.map((r) => r.chars).sort((a, b) => a - b);
    const expected = charCounts[charCounts.length - 1] ?? 1;

    for (const row of [...rows].sort((a, b) => (a.total ?? 1e12) - (b.total ?? 1e12))) {
      let maxTotal;
      let minTotal;
      let totals;
      // RENDERERS, not the filtered list: a merged report still has to name
      // the strategy of a renderer this run did not re-measure.
      const strategy = RENDERERS.find((r) => r.name === row.renderer)?.strategy ?? "";

      if (row.failed) {
        out.push(`| ${row.renderer} | ${strategy} | failed | | | | | | | ${row.failed} |`);
        continue;
      }

      totals = row.samples?.map((sample) => sample.total) ?? [row.total];
      minTotal = Math.min(...totals);
      maxTotal = Math.max(...totals);

      out.push(
        `| ${row.renderer} | ${strategy} | ${row.total.toFixed(0)} ms | ` +
          `${minTotal.toFixed(0)}\u2013${maxTotal.toFixed(0)} ms | ` +
          `${(row.total / fastest).toFixed(1)}\u00d7 | ${row.p50.toFixed(2)} ms | ` +
          `${row.p95.toFixed(2)} ms | ${row.max.toFixed(0)} ms | ${row.nodes} | ` +
          `${row.chars} | ${coverage(row.chars, expected)} |`
      );
    }

    out.push("");
  }

  return out.join("\n");
}
