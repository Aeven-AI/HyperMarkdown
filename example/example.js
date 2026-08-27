/**
 * The same shape as the app's ChatTest view, with the app taken away.
 *
 * A transcript of finished turns from test-content.json, then one more
 * assistant turn streamed chunk by chunk out of test-markdown-stress-two.json
 * — the recorded deltas, replayed at their original size. No build step and no
 * framework beyond React: the component is loaded from ../dist.
 */
import {
  createElement as h,
  memo,
  StrictMode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";

import { HyperMarkdown } from "hypermarkdown";
import { katexPlugin } from "hypermarkdown/plugins/math";
import { highlightPlugin } from "hypermarkdown/plugins/code";
import { mermaidPlugin } from "hypermarkdown/plugins/mermaid";
import { cjkPlugin } from "hypermarkdown/plugins/cjk";

import { preloadFonts } from "./font-preloader.js";

/** Built once: a new plugin object would rebuild every pipeline. */
const plugins = {
  math: katexPlugin(),
  code: highlightPlugin(),
  // The same configuration the app gives it: mermaid draws the diagram
  // itself, so its theme and font come from here rather than from CSS.
  diagram: mermaidPlugin({
    theme: "neutral",
    fontFamily: "Geist",
    themeVariables: {
      primaryColor: "#ca75ad",
    },
  }),
  cjk: cjkPlugin(),
};

/** How fast to replay the recording, in milliseconds between chunks. */
const SPEED = 20;

const [, transcript, recording] = await Promise.all([
  preloadFonts(),
  fetch("./test-content.json").then((r) => r.json()),
  fetch("./test-markdown-stress-two.json").then((r) => r.json()),
]);

/** The recorded deltas, in order, with the empty terminator dropped. */
const chunks = recording
  .map((row) => row?.data?.choices?.[0]?.delta?.content ?? "")
  .filter((content) => content !== "");

const Turn = memo(function Turn({ row }) {
  if (row.type === "user") {
    return h(
      "div",
      { className: "content-block user" },
      h("div", { className: "content-block-container" }, row.messageContent),
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
});

function StreamedTurn({ playing, onProgress }) {
  const renderer = useRef(null);
  const thinking = useRef(null);
  const index = useRef(0);
  const reportedPercent = useRef(-1);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const timer = setInterval(() => {
      let percent;

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
      percent = Math.round((index.current / chunks.length) * 100);

      if (percent !== reportedPercent.current) {
        reportedPercent.current = percent;
        onProgress(index.current);
      }
    }, SPEED);

    return () => {
      clearInterval(timer);
    };
  }, [playing, onProgress]);

  return h(
    "div",
    { className: "content-block system" },
    h("div", { className: "content-block-thinking", ref: thinking }),
    h(
      "div",
      { className: "content-block-container" },
      h(HyperMarkdown, {
        ref: renderer,
        streaming: true,
        animation: true,
        plugins,
        preload: true,
        reasoningTarget: () => thinking.current,
        scrollDown,
      }),
    ),
  );
}

let scroller = null;
let userScroll = false;
let currentScrollHeight = 0;

// How far the reader may drift from the bottom before we stop following.
const SCROLL_MARGIN = 100;

/*
 * The component calls this after every render. Scrolling only when the height
 * actually changed keeps it cheap, and behavior: "instant" matters: the
 * container sets scroll-behavior: smooth for the reader, so a plain scrollTop
 * write would start an animation that the next chunk immediately invalidates.
 */
function scrollDown() {
  if (userScroll === true || !scroller) {
    return;
  }

  if (currentScrollHeight !== scroller.scrollHeight) {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "instant" });
    currentScrollHeight = scroller.scrollHeight;
  }
}

// Following stops when the reader scrolls up, and resumes at the bottom.
function scrollDownListener() {
  if (!scroller) {
    return;
  }

  userScroll =
    scroller.scrollTop + scroller.clientHeight <=
    scroller.scrollHeight - SCROLL_MARGIN;
}

function App() {
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(0);
  const [run, setRun] = useState(0);
  const view = useRef(null);

  useEffect(() => {
    const el = view.current;

    scroller = el;
    el.addEventListener("scroll", scrollDownListener, { passive: true });

    return () => {
      el.removeEventListener("scroll", scrollDownListener);
    };
  }, []);

  const percent = Math.round((done / chunks.length) * 100);

  return h(
    "div",
    { className: "chat" },
    h(
      "div",
      { className: "chat-messages-container", ref: view },
      h(
        "div",
        { className: "status" },
        h("span", null, `${chunks.length} chunks · ${percent}%`),
        h("span", null, playing ? "streaming" : "paused"),
        h(
          "button",
          { onClick: () => setPlaying((p) => !p) },
          playing ? "Pause" : "Resume",
        ),
        h(
          "button",
          {
            onClick: () => {
              userScroll = false;
              currentScrollHeight = 0;
              setDone(0);
              setRun((r) => r + 1);
              setPlaying(true);
            },
          },
          "Replay",
        ),
      ),
      transcript.map((row, idx) => h(Turn, { key: idx, row })),
      h(StreamedTurn, { key: run, playing, onProgress: setDone }),
    ),
  );
}

createRoot(document.getElementById("root")).render(h(StrictMode, null, h(App)));
