import { useState } from "react";
import Link from "@docusaurus/Link";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Layout from "@theme/Layout";
import { benchmark } from "../data/benchmark.generated";

const renderers = [
  ["HyperMarkdown", "HyperMarkdown"],
  ["markstream-react", "Markstream"],
  ["streamdown", "Streamdown"],
  ["deepseek-harness", "DeepSeek Harness"],
  ["react-markdown", "react-markdown"],
] as const;

const features = [
  ["Sub-block cache", "Settled code lines, table rows, and list items are not parsed again."],
  ["Incomplete Markdown", "Half-written links, tags, and math are withheld until they are safe."],
  ["GFM built in", "Tables, task lists, autolinks, strikethrough, and footnotes."],
  ["Optional plugins", "KaTeX, highlight.js, Mermaid, and CJK load only when you ask."],
  ["Reasoning blocks", "<think>, <thinking>, and <reasoning> stream into a collapsible panel."],
  ["React 18 and 19", "Finished Markdown can render on the server; the handle stays on the client."],
];

function formatMs(value: number) {
  return `${value.toLocaleString("en-US")} ms`;
}

function InstallCommand() {
  const command = "npm install @aeven-ai/hypermarkdown";
  const [copied, setCopied] = useState(false);

  return (
    <div className="install-cmd">
      <span>$</span>
      <code>{command}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
          } catch {
            window.prompt("Copy install command", command);
          }
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function Home() {
  const code = benchmark.fixtures.find((row) => row.fixture === "real-code-os.md")!;
  const table = benchmark.fixtures.find((row) => row.fixture === "real-table-head.md")!;

  return (
    <Layout
      title="Ridiculously fast Markdown for React and AI"
      description="Streaming-native Markdown renderer that caches settled code, tables, and lists so growing LLM output does not re-parse finished work."
    >
      <div className="home">
        <header className="home-hero">
          <div className="home-wrap">
            <p className="home-kicker">Streaming Markdown · React · AI</p>
            <h1>Ridiculously fast Markdown for React and AI.</h1>
            <p className="tagline">Parse the change. Not the conversation.</p>
            <div className="home-actions">
              <Link className="home-btn primary" to="/playground">
                Open playground
              </Link>
              <Link className="home-btn ghost" to="/docs/introduction">
                Read the docs
              </Link>
              <a
                className="home-btn ghost"
                href="https://www.npmjs.com/package/@aeven-ai/hypermarkdown"
              >
                npm
              </a>
            </div>
            <InstallCommand />

            <p className="home-kicker">Performance overview</p>
            <div className="headline-compare" style={{ margin: "0.8rem 0 1.1rem" }}>
              <div className="compare-pill">
                <strong>1.6×–10.6×</strong>
                <span>Faster than the nearest streaming renderer across the suite.</span>
              </div>
              <div className="compare-pill">
                <strong>{formatMs(code.values.HyperMarkdown)}</strong>
                <span>
                  vs {formatMs(code.values["markstream-react"])} on a captured AI
                  code stream.
                </span>
              </div>
              <div className="compare-pill">
                <strong>{formatMs(table.values.HyperMarkdown)}</strong>
                <span>Captured AI table. Streamdown: {formatMs(table.values.streamdown)}.</span>
              </div>
            </div>
            <article className="bench-card">
              <header>
                <div>
                  <h2>Production streaming benchmark</h2>
                  <p className="bench-meta">
                    {benchmark.environment.cpu}, Node {benchmark.environment.node}.
                    Chunk processing plus synchronous React commit. Same Markdown.
                    Same stream.
                  </p>
                </div>
                <Link className="bench-meta" to="/docs/benchmarks">
                  Methodology →
                </Link>
              </header>
              <div style={{ overflowX: "auto" }}>
                <table className="bench-table">
                  <thead>
                    <tr>
                      <th>Workload</th>
                      {renderers.map(([key, label]) => (
                        <th key={key}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {benchmark.fixtures.map((fixture) => (
                      <tr key={fixture.fixture}>
                        <td>{fixture.label}</td>
                        {renderers.map(([key]) => {
                          const value = fixture.values[key];
                          const best = Math.min(...Object.values(fixture.values));
                          return (
                            <td
                              key={key}
                              className={value === best ? "bench-best" : undefined}
                            >
                              {value === best ? <strong>{formatMs(value)}</strong> : formatMs(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </header>

        <BrowserOnly fallback={<div className="section" />}>
          {() => {
            const LiveDemo = require("../components/home/LiveDemo").default;
            return <LiveDemo />;
          }}
        </BrowserOnly>

        <section className="section">
          <div className="home-wrap">
            <article className="cache-card">
              <header>
                <h2>Completed work stays completed</h2>
                <p className="bench-meta">
                  Block-level freezing cannot help a 1,000-line fence that is
                  still open. HyperMarkdown caches inside the active block.
                </p>
              </header>
              <div className="cache-flow">
                <div className="cache-col">
                  <h3>Typical stream renderer</h3>
                  <ul>
                    <li>new token</li>
                    <li>growing active block</li>
                    <li>parse the block again</li>
                    <li>render again</li>
                  </ul>
                </div>
                <div className="cache-arrow" aria-hidden="true">
                  →
                </div>
                <div className="cache-col fast">
                  <h3>HyperMarkdown</h3>
                  <ul>
                    <li className="cached">settled code lines → cached</li>
                    <li className="cached">settled table rows → cached</li>
                    <li className="cached">settled list items → cached</li>
                    <li>changing frontier → parse</li>
                  </ul>
                </div>
              </div>
              <div className="cache-anim">
                <div className="token">
                  <i /> new token
                </div>
                <ol>
                  <li>
                    const line = alreadySettled;
                    <span>cached line</span>
                  </li>
                  <li>
                    | already | settled |
                    <span>cached row</span>
                  </li>
                  <li>
                    - already a list item
                    <span>cached item</span>
                  </li>
                  <li>
                    const frontier = stillGrowing
                    <span>parse</span>
                  </li>
                </ol>
              </div>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="home-wrap install-grid">
            <article className="install-card">
              <h2>Installation</h2>
              <p>React 18 or 19 as a peer. Heavy engines stay optional.</p>
              <pre>
                <code>npm install @aeven-ai/hypermarkdown</code>
              </pre>
              <pre>
                <code>{`import "@aeven-ai/hypermarkdown/styles.css";
import { HyperMarkdown } from "@aeven-ai/hypermarkdown";

<HyperMarkdown md={markdown} />`}</code>
              </pre>
            </article>
            <article className="install-card">
              <h2>Streaming example</h2>
              <p>Mount one renderer. Write each delta. Finalize once.</p>
              <pre>
                <code>{`const ref = useRef<HyperMarkdownHandle>(null);

for await (const delta of stream) {
  ref.current?.write(delta);
}
ref.current?.write("", true);

<HyperMarkdown ref={ref} streaming />`}</code>
              </pre>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="home-wrap">
            <div className="feature-grid">
              {features.map(([title, body]) => (
                <article className="feature-card" key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
            <article className="used-by">
              <h2>Used by Æven</h2>
              <p>
                HyperMarkdown is the official Markdown component used by Æven
                and integrates with the DeepSeek Harness (DSH) architecture. It
                was built around long answers, dense code, wide tables,
                reasoning traces, and many small deltas — not adapted from a
                finished-document renderer after the fact. The captured AI
                workloads in the benchmark suite come from that environment.
              </p>
            </article>
          </div>
        </section>
      </div>
    </Layout>
  );
}
