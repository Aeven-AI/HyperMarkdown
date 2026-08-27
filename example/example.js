/**
 * The same shape as the app's ChatTest view, with the app taken away.
 *
 * A transcript of finished turns from test-content.json, then one more
 * assistant turn streamed chunk by chunk out of test-markdown-stress-two.json
 * — the recorded deltas, replayed at their original size. No build step and no
 * framework beyond React: the component is loaded from ../dist.
 */
import { createElement as h, StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { HyperMarkdown } from "hypermarkdown";
import { katexPlugin } from "hypermarkdown/plugins/math";
import { highlightPlugin } from "hypermarkdown/plugins/code";
import { mermaidPlugin } from "hypermarkdown/plugins/mermaid";
import { cjkPlugin } from "hypermarkdown/plugins/cjk";

/** Built once: a new plugin object would rebuild every pipeline. */
const plugins = {
  math: katexPlugin(),
  code: highlightPlugin(),
  diagram: mermaidPlugin({ theme: "neutral" }),
  cjk: cjkPlugin(),
};

/** How fast to replay the recording, in milliseconds between chunks. */
const SPEED = 8;

const [transcript, recording] = await Promise.all([
  fetch("./test-content.json").then((r) => r.json()),
  fetch("./test-markdown-stress-two.json").then((r) => r.json()),
]);

/** The recorded deltas, in order, with the empty terminator dropped. */
const chunks = recording
  .map((row) => row?.data?.choices?.[0]?.delta?.content ?? "")
  .filter((content) => content !== "");

function Turn({ row }) {
  if (row.type === "user") {
    return h(
      "div",
      { className: "content-block user" },
      h("div", { className: "chat-message" }, row.messageContent),
    );
  }

  return h(
    "div",
    { className: "content-block system" },
    h(HyperMarkdown, {
      md: row.messageContent,
      streaming: false,
      animation: false,
      plugins,
    }),
  );
}

function StreamedTurn({ playing, onProgress }) {
  const renderer = useRef(null);
  const thinking = useRef(null);
  const index = useRef(0);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const timer = setInterval(() => {
      const handle = renderer.current;

      if (!handle) {
        return;
      }

      if (index.current >= chunks.length) {
        handle.write("", true);
        onProgress(chunks.length);
        clearInterval(timer);
        return;
      }

      handle.write(chunks[index.current], false);
      index.current += 1;
      onProgress(index.current);
    }, SPEED);

    return () => {
      clearInterval(timer);
    };
  }, [playing, onProgress]);

  return h(
    "div",
    { className: "content-block system" },
    h("div", { className: "content-block-thinking", ref: thinking }),
    h("div", { className: "content-block-container" },
      h(HyperMarkdown, {
        ref: renderer,
        streaming: true,
        animation: true,
        plugins,
        preload: true,
        reasoningTarget: () => thinking.current,
        scrollDown: scrollToBottom,
      }),
    ),
  );
}

let scroller = null;
let pinned = true;

function scrollToBottom() {
  if (!scroller || !pinned) {
    return;
  }

  scroller.scrollTop = scroller.scrollHeight;
}

function App() {
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(0);
  const [run, setRun] = useState(0);
  const view = useRef(null);

  useEffect(() => {
    scroller = view.current;

    const onScroll = () => {
      const el = view.current;

      if (!el) {
        return;
      }

      // Stop following once the reader scrolls away from the bottom.
      pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    view.current?.addEventListener("scroll", onScroll);

    return () => {
      view.current?.removeEventListener("scroll", onScroll);
    };
  }, []);

  const percent = Math.round((done / chunks.length) * 100);

  return h(
    "div",
    { className: "transcript", ref: view },
    h(
      "div",
      { className: "transcript-inner" },
      h(
        "div",
        { className: "status" },
        h("span", null, `${chunks.length} chunks · ${percent}%`),
        h("span", null, playing ? "streaming" : "paused"),
        h("button", { onClick: () => setPlaying((p) => !p) },
          playing ? "Pause" : "Resume"),
        h("button", {
          onClick: () => {
            pinned = true;
            setDone(0);
            setRun((r) => r + 1);
            setPlaying(true);
          },
        }, "Replay"),
      ),
      transcript.map((row, idx) => h(Turn, { key: idx, row })),
      h(StreamedTurn, { key: run, playing, onProgress: setDone }),
    ),
  );
}

createRoot(document.getElementById("root")).render(
  h(StrictMode, null, h(App)),
);
