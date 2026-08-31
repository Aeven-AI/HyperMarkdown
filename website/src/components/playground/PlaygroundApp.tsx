import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HyperMarkdown,
  type HyperMarkdownHandle,
} from "@aeven-ai/hypermarkdown";
import { pluginsFor } from "../markdown/sitePlugins";
import {
  cjkDemo,
  mathDemo,
  mermaidDemo,
  playgroundDemo,
  proseDemo,
} from "../../data/demoMarkdown";
import useBaseUrl from "@docusaurus/useBaseUrl";
import "@aeven-ai/hypermarkdown/styles.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.min.css";

type Mode = "stream" | "static";

interface Flags {
  math: boolean;
  code: boolean;
  mermaid: boolean;
  cjk: boolean;
}

const examples: { id: string; label: string; load: (base: string) => Promise<string> }[] = [
  { id: "demo", label: "Streaming demo", load: async () => playgroundDemo },
  { id: "prose", label: "Mixed prose", load: async () => proseDemo },
  {
    id: "code",
    label: "Captured AI code",
    load: (base) => fetch(`${base}examples/real-code-os.md`).then((r) => r.text()),
  },
  {
    id: "table",
    label: "Captured AI table",
    load: (base) => fetch(`${base}examples/real-table-head.md`).then((r) => r.text()),
  },
  { id: "math", label: "Math", load: async () => mathDemo },
  { id: "mermaid", label: "Mermaid", load: async () => mermaidDemo },
  { id: "cjk", label: "CJK", load: async () => cjkDemo },
];

function readState(search: string) {
  const params = new URLSearchParams(search);
  const flags: Flags = {
    math: params.get("math") !== "0",
    code: params.get("code") !== "0",
    mermaid: params.get("mermaid") !== "0",
    cjk: params.get("cjk") === "1",
  };
  return {
    example: examples.some((item) => item.id === (params.get("example") ?? "demo"))
      ? (params.get("example") ?? "demo")
      : "demo",
    mode: (params.get("mode") === "static" ? "static" : "stream") as Mode,
    chunk: Number(params.get("chunk") || 16) || 16,
    delay: Number(params.get("delay") || 20) || 20,
    animation: params.get("animation") !== "0",
    flags,
  };
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index]!;
}

export default function PlaygroundApp() {
  const baseUrl = useBaseUrl("/");
  const initial = useMemo(
    () => readState(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const renderer = useRef<HyperMarkdownHandle>(null);
  const [source, setSource] = useState(playgroundDemo);
  const [example, setExample] = useState(initial.example);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [chunk, setChunk] = useState(initial.chunk);
  const [delay, setDelay] = useState(initial.delay);
  const [animation, setAnimation] = useState(initial.animation);
  const [flags, setFlags] = useState<Flags>(initial.flags);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [frames, setFrames] = useState(0);
  const [chars, setChars] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [p50, setP50] = useState(0);
  const [p95, setP95] = useState(0);
  const offset = useRef(0);
  const started = useRef(0);
  const samples = useRef<number[]>([]);
  const timer = useRef<number | null>(null);

  const plugins = useMemo(() => pluginsFor(flags), [flags]);

  useEffect(() => {
    const params = new URLSearchParams({
      example,
      mode,
      chunk: String(chunk),
      delay: String(delay),
      animation: animation ? "1" : "0",
      math: flags.math ? "1" : "0",
      code: flags.code ? "1" : "0",
      mermaid: flags.mermaid ? "1" : "0",
      cjk: flags.cjk ? "1" : "0",
    });
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", next);
  }, [example, mode, chunk, delay, animation, flags]);

  useEffect(() => {
    const spec = examples.find((item) => item.id === example) ?? examples[0]!;
    spec
      .load(baseUrl)
      .then((text) => {
        setSource(text);
        stopTimer();
        setPlaying(false);
        setPaused(false);
        resetMetrics();
        renderer.current?.reset();
      })
      .catch(() => setSource(playgroundDemo));
  }, [example, baseUrl]);

  const stopTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const resetMetrics = () => {
    offset.current = 0;
    samples.current = [];
    setFrames(0);
    setChars(0);
    setElapsed(0);
    setP50(0);
    setP95(0);
  };

  const record = (ms: number, size: number) => {
    samples.current.push(ms);
    setFrames((count) => count + 1);
    setChars((count) => count + size);
    setElapsed(performance.now() - started.current);
    setP50(percentile(samples.current, 50));
    setP95(percentile(samples.current, 95));
  };

  const reset = useCallback(() => {
    stopTimer();
    setPlaying(false);
    setPaused(false);
    resetMetrics();
    renderer.current?.reset();
  }, []);

  const step = useCallback(() => {
    const handle = renderer.current;
    if (!handle) return;
    const start = performance.now();
    if (offset.current >= source.length) {
      handle.write("", true);
      record(performance.now() - start, 0);
      setPlaying(false);
      setPaused(false);
      stopTimer();
      return;
    }
    const slice = source.slice(offset.current, offset.current + chunk);
    offset.current += slice.length;
    handle.write(slice, offset.current >= source.length);
    record(performance.now() - start, slice.length);
    if (offset.current < source.length) {
      timer.current = window.setTimeout(step, delay);
    } else {
      setPlaying(false);
      setPaused(false);
    }
  }, [chunk, delay, source]);

  const start = () => {
    stopTimer();
    renderer.current?.reset();
    resetMetrics();
    started.current = performance.now();
    setPlaying(true);
    setPaused(false);
    if (mode === "static") {
      const startAt = performance.now();
      renderer.current?.reset();
      renderer.current?.write(source, true);
      record(performance.now() - startAt, source.length);
      setPlaying(false);
      return;
    }
    offset.current = 0;
    timer.current = window.setTimeout(step, delay);
  };

  const pause = () => {
    setPaused(true);
    setPlaying(false);
    stopTimer();
  };

  const resume = () => {
    if (offset.current >= source.length) return;
    setPaused(false);
    setPlaying(true);
    timer.current = window.setTimeout(step, delay);
  };

  useEffect(() => () => stopTimer(), []);

  const snippet = `const ref = useRef<HyperMarkdownHandle>(null);

// ${mode === "static" ? "Finished document" : `Streaming ${chunk}-character deltas`}
ref.current?.write(delta${mode === "static" ? ", true" : ""});
${mode === "stream" ? `ref.current?.write("", true);` : ""}

<HyperMarkdown ref={ref} ${mode === "stream" ? "streaming " : ""}${animation ? "animation " : ""}plugins={plugins} />`;

  return (
    <div className="playground">
      <div className="playground-toolbar">
        <label>
          Example
          <select value={example} onChange={(event) => setExample(event.target.value)}>
            {examples.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="stream">Streaming</option>
            <option value="static">Static</option>
          </select>
        </label>
        <label>
          Chunk size
          <input
            type="number"
            min={1}
            max={256}
            value={chunk}
            onChange={(event) => setChunk(Number(event.target.value) || 1)}
          />
        </label>
        <label>
          Delay (ms)
          <input
            type="number"
            min={0}
            max={500}
            value={delay}
            onChange={(event) => setDelay(Number(event.target.value) || 0)}
          />
        </label>
        <div className="toggles">
          <label>
            <input
              type="checkbox"
              checked={animation}
              onChange={(event) => setAnimation(event.target.checked)}
            />
            animation
          </label>
          {(["math", "code", "mermaid", "cjk"] as const).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={(event) =>
                  setFlags((current) => ({ ...current, [key]: event.target.checked }))
                }
              />
              {key}
            </label>
          ))}
        </div>
        <button type="button" onClick={start}>
          Start
        </button>
        <button className="secondary" type="button" onClick={paused ? resume : pause}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="secondary" type="button" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="playground-metrics">
        <div className="metric">
          <b>{frames}</b>
          <span>Frames</span>
        </div>
        <div className="metric">
          <b>{Math.round(elapsed)} ms</b>
          <span>Elapsed</span>
        </div>
        <div className="metric">
          <b>{p50.toFixed(2)} ms</b>
          <span>p50 write</span>
        </div>
        <div className="metric">
          <b>{p95.toFixed(2)} ms</b>
          <span>p95 write</span>
        </div>
        <div className="metric">
          <b>{chars.toLocaleString("en-US")}</b>
          <span>Characters</span>
        </div>
      </div>

      <div className="playground-grid">
        <div className="playground-editor">
          <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
        </div>
        <div className="playground-output">
          <HyperMarkdown
            ref={renderer}
            streaming={mode === "stream" || playing}
            animation={animation}
            md={mode === "static" && !playing ? source : undefined}
            plugins={plugins}
            className="assistant-message"
          />
        </div>
      </div>

      <div className="playground-code">
        <p className="bench-meta">Delta API next to the output. State is stored in the URL.</p>
        <pre>
          <code>{snippet}</code>
        </pre>
      </div>
    </div>
  );
}
