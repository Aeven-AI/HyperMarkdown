import { useCallback, useEffect, useRef, useState } from "react";
import {
  HyperMarkdown,
  type HyperMarkdownHandle,
} from "@aeven-ai/hypermarkdown";
import { pluginsFor } from "../markdown/sitePlugins";
import { homepageDemo } from "../../data/demoMarkdown";
import "@aeven-ai/hypermarkdown/styles.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.min.css";

const DELAY_MS = 8;
const TOKENS_PER_TICK = 3;
const REPLAY_PAUSE_MS = 1800;
const SCROLL_MARGIN = 100;

const tokens = homepageDemo.match(/\S+\s*|\s+/g) ?? [homepageDemo];
const homepagePlugins = pluginsFor({ mermaid: false, cjk: false });

export default function LiveDemo() {
  const renderer = useRef<HyperMarkdownHandle>(null);
  const frame = useRef<HTMLDivElement>(null);
  const userScroll = useRef(false);
  const currentScrollHeight = useRef(0);
  const [running, setRunning] = useState(true);
  const offset = useRef(0);
  const timer = useRef<number | null>(null);

  const scrollDown = useCallback(() => {
    const el = frame.current;
    if (!el || userScroll.current) return;
    if (currentScrollHeight.current === el.scrollHeight) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
    currentScrollHeight.current = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;

    const onScroll = () => {
      userScroll.current =
        el.scrollTop + el.clientHeight <= el.scrollHeight - SCROLL_MARGIN;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function stop() {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    }

    function tick() {
      const handle = renderer.current;
      if (!handle) return;

      if (offset.current === 0) {
        userScroll.current = false;
        currentScrollHeight.current = 0;
        handle.reset();
        frame.current?.scrollTo({ top: 0, behavior: "instant" });
      }

      const next = tokens
        .slice(offset.current, offset.current + TOKENS_PER_TICK)
        .join("");
      offset.current += TOKENS_PER_TICK;

      if (offset.current >= tokens.length) {
        handle.write(next, true);
        offset.current = 0;
        timer.current = window.setTimeout(tick, REPLAY_PAUSE_MS);
        return;
      }

      handle.write(next);
      timer.current = window.setTimeout(tick, DELAY_MS);
    }

    if (running) tick();
    return stop;
  }, [running]);

  return (
    <section className="section demo-section">
      <div className="home-wrap">
        <article className="demo-card">
          <header>
            <div>
              <h2>The same component, streaming</h2>
              <p className="bench-meta">
                A full Markdown document written as deltas, with word animation
                on. HyperMarkdown still only parses the frontier.
              </p>
            </div>
            <button
              className="demo-pause"
              type="button"
              onClick={() => setRunning((value) => !value)}
            >
              {running ? "Pause" : "Play"}
            </button>
          </header>
          <div className="demo-frame" ref={frame}>
            <HyperMarkdown
              ref={renderer}
              streaming
              animation
              plugins={homepagePlugins}
              scrollDown={scrollDown}
              className="assistant-message"
            />
          </div>
        </article>
      </div>
    </section>
  );
}
