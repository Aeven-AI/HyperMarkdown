import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import Renderer from "./lib/renderer";

import type { PluginConfig } from "./lib/plugin-types";
import type { AllowedTags, LinkSafetyConfig } from "./lib/sanitize";
import type { ControlsConfig, IconMap, Translations } from "./lib/config";
import { guid } from "./lib/runtime";

// Layout effects warn during server rendering, where there is no DOM to
// measure and nothing to scroll.
const useCommitEffect =
  /* v8 ignore next -- selected once per module realm; covered in browser and SSR suites */
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface HyperMarkdownProps {
  /** Markdown to render in one go. Ignored while `streaming` is true. */
  md?: string | undefined;
  /** Take content through the imperative handle instead of the `md` prop. */
  streaming?: boolean | undefined;
  /** Fade words in as they arrive. */
  animation?: boolean | undefined;
  /**
   * Maths, syntax highlighting and diagrams. None is bundled: import the ones
   * you want from `hypermarkdown/plugins/*` and pass them here. A slot left
   * empty degrades — `$x$` stays literal, code renders unhighlighted, a
   * mermaid fence renders as a code block.
   */
  plugins?: PluginConfig | undefined;
  /**
   * Fetch the heavy plugin engines in the background on mount, rather than
   * waiting for content that needs them.
   *
   * Mermaid is megabytes, and a diagram that arrives cold stalls on the
   * download. This starts that download on mount so it is already in hand.
   *
   * Off by default, so nothing pulls a large dependency without being asked.
   * Leaving it off is not the same as being slow: the renderer starts fetching
   * the engine the moment a diagram fence opens, which buys most of the same
   * head start and costs nothing when no diagram ever comes.
   */
  preload?: boolean | undefined;
  /** Class for a wrapping div. Without one, blocks render into a fragment. */
  className?: string | undefined;
  /**
   * Turn sanitization off. Raw HTML then reaches the DOM as written — only for
   * content you produced yourself.
   */
  sanitize?: boolean | undefined;
  /** Extra tags and attributes to let through sanitization. */
  allowedTags?: AllowedTags | undefined;
  /** Where links and images may point. */
  linkSafety?: LinkSafetyConfig | undefined;
  /**
   * Somewhere else to put reasoning blocks — an element, or a function
   * returning one. Reasoning renders in place when this is absent or returns
   * null, so a ref that is empty on the first pass is fine.
   */
  reasoningTarget?: HTMLElement | null | (() => HTMLElement | null) | undefined;
  /** Override any of the strings the toolbars show. */
  translations?: Partial<Translations> | undefined;
  /** Override any of the toolbar icons, as inline `<svg>` markup. */
  icons?: Partial<IconMap> | undefined;
  /** Which toolbar buttons each kind of block offers. */
  controls?: ControlsConfig | undefined;
  /** Show the line-number gutter on code blocks. @default true */
  lineNumbers?: boolean | undefined;
  /** Max height of a code block before it scrolls. Numbers are px. */
  codeBlockMaxHeight?: number | string | undefined;
  /** Max height of a table before it scrolls. Numbers are px. */
  tableMaxHeight?: number | string | undefined;
  /** Called after each render, so a host can keep the view pinned to the bottom. */
  scrollDown?: (() => void) | undefined;
  /**
   * A code block, table or diagram entered or left fullscreen.
   *
   * The block covers the viewport on its own, but only the host knows about
   * the rest of its chrome. Wire this up to hide navigation, sidebars and
   * input bars, or the block ends up fullscreen underneath them.
   */
  onFullscreenChange?: ((fullscreen: boolean) => void) | undefined;
  /**
   * A block needs to tell the reader something — a code preview that is not
   * ready yet, or one that could not be opened. Without a handler the message
   * is dropped, since the component has no dialog of its own.
   */
  onAlert?: ((alert: HyperMarkdownAlert) => void) | undefined;
}

export interface HyperMarkdownAlert {
  header: string;
  content: string;
  buttonText?: string | undefined;
}

/** Stable, supported operations exposed by HyperMarkdown's rendering store. */
export interface HyperMarkdownStore {
  readonly version: number;
  setMarkdown(md: string): void;
  streamMd(
    md: string,
    streaming: boolean,
    animation: boolean,
    finalize: boolean,
  ): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
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
  /** The rendering store owned by this component instance. */
  readonly store: HyperMarkdownStore;
  /** @deprecated Use `store`. */
  readonly stream: HyperMarkdownStore;
}

/**
 * Renders markdown, including markdown that is still arriving.
 *
 * The component owns one internal rendering store, subscribes to its updates,
 * and renders its current snapshot.
 */
const HyperMarkdown = forwardRef<HyperMarkdownHandle, HyperMarkdownProps>(
  function HyperMarkdown(props, ref) {
    const {
      md,
      streaming,
      animation,
      scrollDown,
      plugins,
      preload,
      onFullscreenChange,
      onAlert,
    } = props;

    // One engine per mounted component, created lazily so a re-render never
    // builds a second one.
    const storeRef = useRef<Renderer | null>(null);

    if (storeRef.current === null) {
      storeRef.current = new Renderer({
        ...props,
        md,
        streaming,
        animation,
        scrollDown,
      });
    }

    const store = storeRef.current;

    const subscribe = useCallback(
      (onChange: () => void) => store.subscribe(onChange),
      [store],
    );

    // The engine mutates in place, so the snapshot is a counter it bumps on
    // every update rather than the rendered output itself.
    const version = useSyncExternalStore(
      subscribe,
      () => store.version,
      () => store.version,
    );

    // Late-bound props the engine reads while rendering.
    store.setOptions({ scrollDown, animation, streaming });

    // write() is called from timers and network callbacks, so it reads the
    // props through a ref rather than closing over the ones it was built with.
    const latest = useRef({ streaming, animation });
    latest.current = { streaming, animation };

    useEffect(() => {
      if (streaming !== true && typeof md === "string") {
        store.setMarkdown(md);
      }
    }, [store, streaming, md]);

    useImperativeHandle(
      ref,
      () => ({
        write(chunk: string, finalize?: boolean) {
          store.streamMd(
            chunk,
            latest.current.streaming !== false,
            latest.current.animation === true,
            finalize === true,
          );
        },
        reset() {
          store.reset();
        },
        store,
        stream: store,
      }),
      [store],
    );

    // Straight away on mount, exactly as an app doing this by hand would: the
    // import is async, so it downloads in the background while everything else
    // carries on. Nothing waits on it.
    useEffect(() => {
      if (preload !== true) {
        return;
      }

      void plugins?.diagram?.load().catch(() => {});
    }, [preload, plugins]);

    // Blocks announce these on this renderer's own bus, because they sit deep
    // inside rendered markdown where threading callbacks down is impractical.
    // The bus is per renderer and stops here: what leaves the component is a
    // plain prop, and a page of many messages does not cross-talk.
    useEffect(() => {
      if (!onFullscreenChange) {
        return;
      }

      const id = guid();

      store.events.on("fullscreen:change", id, (payload) => {
        onFullscreenChange(payload === true);
      });

      return () => {
        store.events.off("fullscreen:change", id);
      };
    }, [store, onFullscreenChange]);

    useEffect(() => {
      if (!onAlert) {
        return;
      }

      const id = guid();

      store.events.on("show:modal", id, (payload: unknown) => {
        const alert = payload as HyperMarkdownAlert;

        onAlert({
          header: alert.header,
          content: alert.content,
          buttonText: alert.buttonText,
        });
      });

      return () => {
        store.events.off("show:modal", id);
      };
    }, [store, onAlert]);

    // Runs after every commit, so scrollDown() and friends measure the DOM
    // they were queued for rather than the one before it.
    useCommitEffect(() => {
      store.flush();
    });

    void version;

    return store.render();
  },
);

HyperMarkdown.displayName = "HyperMarkdown";

/** @deprecated Prefer the HyperMarkdown component and its imperative handle. */
export { default as MarkdownStream } from "./lib/renderer";
/** @deprecated Internal engine options retained for API compatibility. */
export type { RendererOptions as MarkdownStreamOptions } from "./lib/types";
export type { AllowedTags, LinkSafetyConfig } from "./lib/sanitize";
export type {
  ControlsConfig,
  BlockControls,
  IconMap,
  Translations,
} from "./lib/config";
export type {
  PluginConfig,
  MathPlugin,
  CodeHighlighterPlugin,
  DiagramPlugin,
  DiagramEngine,
  DiagramResult,
} from "./lib/plugin-types";

/**
 * Normalise the notations models emit for maths onto the "$"/"$$" remark-math
 * understands. Exported for hosts that run their own pipeline over the same
 * model output and want it to agree with what this component renders.
 */
export { convertMath } from "./lib/math-notation";

export { HyperMarkdown };
export default HyperMarkdown;
