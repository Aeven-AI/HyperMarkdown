import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import MarkdownRenderStore from "./lib/markdown-render-store";
import { emitter, guid } from "./lib/platform/runtime";

// Layout effects warn during server rendering, where there is no DOM to
// measure and nothing to scroll.
const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface HyperMarkdownProps {
  /** Markdown to render in one go. Ignored while `streaming` is true. */
  md?: string;
  /** Take content through the imperative handle instead of the `md` prop. */
  streaming?: boolean;
  /** Fade words in as they arrive. */
  animation?: boolean;
  /** Called after each render, so a host can keep the view pinned to the bottom. */
  scrollDown?: () => void;
  /**
   * A code block, table or diagram entered or left fullscreen.
   *
   * The block covers the viewport on its own, but only the host knows about
   * the rest of its chrome. Wire this up to hide navigation, sidebars and
   * input bars, or the block ends up fullscreen underneath them.
   */
  onFullscreenChange?: (fullscreen: boolean) => void;
  /**
   * A block needs to tell the reader something — a code preview that is not
   * ready yet, or one that could not be opened. Without a handler the message
   * is dropped, since the component has no dialog of its own.
   */
  onAlert?: (alert: HyperMarkdownAlert) => void;
}

export interface HyperMarkdownAlert {
  header: string;
  content: string;
  buttonText?: string;
}

export interface HyperMarkdownHandle {
  /**
   * Push one chunk of a stream.
   *
   * @param md - The delta, not the accumulated text.
   * @param finalize - Pass true once when the stream ends, to flush the
   *   trailing block. The delta may be empty on that call.
   */
  write(md: string, finalize?: boolean): void;
  /** Discard everything rendered so far and start a new stream. */
  reset(): void;
  /** Escape hatch for callers that need the engine itself. */
  readonly stream: MarkdownRenderStore;
}

/**
 * Renders markdown, including markdown that is still arriving.
 *
 * The work happens in {@link MarkdownRenderStore}. This component owns one
 * instance, subscribes to its updates, and renders its current snapshot.
 */
const HyperMarkdown = forwardRef<HyperMarkdownHandle, HyperMarkdownProps>(
  function HyperMarkdown(props, ref) {
    const { md, streaming, animation, scrollDown, onFullscreenChange, onAlert } =
      props;

    // One engine per mounted component, created lazily so a re-render never
    // builds a second one.
    const streamRef = useRef<MarkdownRenderStore | null>(null);

    if (streamRef.current === null) {
      streamRef.current = new MarkdownRenderStore({
        md,
        streaming,
        animation,
        scrollDown,
      });
    }

    const stream = streamRef.current;

    const subscribe = useCallback(
      (onChange: () => void) => stream.subscribe(onChange),
      [stream]
    );

    // The engine mutates in place, so the snapshot is a counter it bumps on
    // every update rather than the rendered output itself.
    const version = useSyncExternalStore(
      subscribe,
      () => stream.version,
      () => stream.version
    );

    // Late-bound props the engine reads while rendering.
    stream.setOptions({ scrollDown, animation, streaming });

    // write() is called from timers and network callbacks, so it reads the
    // props through a ref rather than closing over the ones it was built with.
    const latest = useRef({ streaming, animation });
    latest.current = { streaming, animation };

    useEffect(() => {
      if (streaming !== true && typeof md === "string") {
        stream.setMarkdown(md);
      }
    }, [stream, streaming, md]);

    useImperativeHandle(
      ref,
      () => ({
        write(chunk: string, finalize?: boolean) {
          stream.streamMd(
            chunk,
            latest.current.streaming !== false,
            latest.current.animation === true,
            finalize === true
          );
        },
        reset() {
          stream.reset();
        },
        stream,
      }),
      [stream]
    );

    // Blocks announce these on an internal bus, because they sit deep inside
    // rendered markdown where threading callbacks down is impractical. The bus
    // stops here: what leaves the component is a plain prop.
    useEffect(() => {
      if (!onFullscreenChange) {
        return;
      }

      const id = guid();

      emitter.on("fullscreen:change", id, (payload) => {
        onFullscreenChange(payload === true);
      });

      return () => {
        emitter.off("fullscreen:change", id);
      };
    }, [onFullscreenChange]);

    useEffect(() => {
      if (!onAlert) {
        return;
      }

      const id = guid();

      emitter.on("show:modal", id, (payload) => {
        const alert = payload as HyperMarkdownAlert;
        onAlert({
          header: alert?.header,
          content: alert?.content,
          buttonText: alert?.buttonText,
        });
      });

      return () => {
        emitter.off("show:modal", id);
      };
    }, [onAlert]);

    // Runs after every commit, so scrollDown() and friends measure the DOM
    // they were queued for rather than the one before it.
    useCommitEffect(() => {
      stream.flush();
    });

    void version;

    return stream.render();
  }
);

HyperMarkdown.displayName = "HyperMarkdown";

/** @deprecated Prefer the HyperMarkdown component and its imperative handle. */
export { default as MarkdownStream } from "./lib/markdown-render-store";
/** @deprecated Internal engine options retained for API compatibility. */
export type {
  MarkdownRenderOptions as MarkdownStreamOptions,
} from "./lib/markdown-render-store";
export { HyperMarkdown };
export default HyperMarkdown;
