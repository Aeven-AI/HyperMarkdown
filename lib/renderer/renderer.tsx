import React, {
  Fragment,
  type ComponentProps,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";

import * as runtime from "./platform/runtime";

import { unified } from "unified";
import { EXIT, SKIP, visit } from "unist-util-visit";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type {
  Element as HastElement,
  Parent as HastParent,
  Root as HastRoot,
  RootContent as HastContent,
} from "hast";
import type { Root as MdastRoot } from "mdast";
import type { Node as UnistNode } from "unist";
import type { VFile } from "vfile";

import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";

import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import rehypeHighlight from "rehype-highlight";

import remarkGfm from "remark-gfm";

import MarkdownLink from "./link";
import MermaidDiagram from "./mermaid";
import MarkdownImage from "./image";
import MarkdownCodeBlock from "./code-block";
import MarkdownTable from "./table";

import MarkdownSyntax from "./streaming/markdown-syntax";

const markdownSyntax = new MarkdownSyntax();

type BlockType = "text" | "code" | "table" | "pending";
type CacheType = "code" | "table" | "list";
type ProcessorType =
  | "regular"
  | "regular-stream"
  | "regular-animation"
  | "cached"
  | "cached-stream"
  | "cached-table"
  | "cached-table-animation"
  | "footnote"
  | "footnote-animation";

interface StoreState {
  md: string | null;
  streaming: boolean | null;
  animation: boolean | null;
}

interface RenderBlock {
  key: number;
  time: number;
  element: ReactNode;
}

interface CloseObject {
  close: boolean;
  md: string;
  mdClose: string;
  mdNext: string;
}

interface MarkdownData {
  [key: string]: unknown;
}

interface TextRange {
  start: number;
  end: number;
}

interface PendingToken {
  token: string;
  close: boolean;
  index: number;
}

interface InlineTokenResult extends PendingToken {
  text: string;
}

interface EmphasisRun {
  char: "*" | "_";
  index: number;
  length: number;
  remaining: number;
  canOpen: boolean;
  canClose: boolean;
  canBoth: boolean;
}

interface EmphasisOpener {
  char: "*" | "_";
  index: number;
  length: number;
  remaining: number;
  canBoth: boolean;
}

interface EmphasisResult {
  text: string;
  pending: PendingToken[];
}

interface BacktickRun {
  index: number;
  length: number;
}

interface BacktickPairs {
  paired: boolean[];
  unmatched: number;
}

interface CodeRegexConfig {
  fencedCodeRegex: RegExp;
  indentedCodeRegex: RegExp;
}

export interface StoreOptions {
  /** Markdown to render in one go. Ignored while `streaming` is true. */
  md?: string | undefined;
  /** Feed content through `streamMd()` instead of the `md` prop. */
  streaming?: boolean | undefined;
  /** Fade words in as they arrive. */
  animation?: boolean | undefined;
  /** Called after each render so the host can keep the view pinned to the bottom. */
  scrollDown?: (() => void) | undefined;
}

class Store {
  private options: StoreOptions;
  private listeners = new Set<() => void>();

  /** setState-style callbacks waiting for the host's next commit. */
  private pending: Array<() => void> = [];

  /** Bumped on every update, so a subscriber can tell something changed. */
  private versionValue = 0;

  private state: StoreState;
  private mdState: string[] | null;
  private blockType: BlockType | null;
  private buffering: boolean | null;
  private cachedType: string | null;
  private lineBufferInit: boolean | null;
  private tableHead: ReactNode;
  private tableRowText: string[];
  private tableCommittedText: string;
  private listItemText: string[];
  private listSignature: string | null;
  private tableSignature: string | null;
  private cachedFootnotes: ReactElement | null;
  private mdBuffer: string;
  private lineBuffer: string;
  private footnoteBuffer: string;
  private footnoteBufferProcessed: string;
  private streamData: RenderBlock[];
  private cachedData: RenderBlock[];
  private lineCacheData: ReactNode[];
  private blockId: number;
  private lineCachedKey: number;
  private lineCachedSize: number;
  private mdExtra: Map<string, string>;
  private footnotes: Map<string, string>;
  private streamDataMap: Map<number, RenderBlock>;
  private readonly syntax = markdownSyntax;
  private inlineTokenRegexCache = new Map<string, RegExp>();
  private inlineTokenEdgeRegexCache = new Map<string, RegExp>();
  private components!: ReturnType<Store["createComponents"]>;
  private processor!: ReturnType<Store["createProcessor"]>;
  private processorStream!: ReturnType<Store["createProcessor"]>;
  private processorAnimation!: ReturnType<Store["createProcessor"]>;
  private processorCache!: ReturnType<Store["createProcessor"]>;
  private processorStreamCache!: ReturnType<Store["createProcessor"]>;
  private processorTableCache!: ReturnType<Store["createProcessor"]>;
  private processorTableCacheAnimation!: ReturnType<Store["createProcessor"]>;
  private processorFootnote!: ReturnType<Store["createProcessor"]>;
  private processorFootnoteAnimation!: ReturnType<Store["createProcessor"]>;


  constructor(options: StoreOptions = {}) {
    const props = options;
    this.options = options;

    this.state = {
      md: props.md || null,
      streaming: props.streaming || null,
      animation: props.animation || null,
    };

    this.mdState = null;

    this.blockType = null;

    this.buffering = null;

    this.cachedType = null;
    this.lineBufferInit = null;

    this.tableHead = null;
    this.tableRowText = [];
    this.tableCommittedText = "";
    this.listItemText = [];
    this.listSignature = null;
    this.tableSignature = null;

    this.cachedFootnotes = null;

    this.mdBuffer = "";
    this.lineBuffer = "";
    this.footnoteBuffer = "";
    this.footnoteBufferProcessed = "";

    this.streamData = [];
    this.cachedData = [];
    this.lineCacheData = [];

    this.blockId = 0;
    this.lineCachedKey = 0;
    this.lineCachedSize = 0;

    this.mdExtra = new Map();
    this.footnotes = new Map();
    this.streamDataMap = new Map();

    this.streamMd = this.streamMd.bind(this);
    this.processMd = this.processMd.bind(this);
    this.processCacheMd = this.processCacheMd.bind(this);

    this.streamText = this.streamText.bind(this);
    this.streamCode = this.streamCode.bind(this);
    this.streamTable = this.streamTable.bind(this);

    this.mdType = this.mdType.bind(this);
    this.mdTable = this.mdTable.bind(this);
    this.mdString = this.mdString.bind(this);

    this.mdCloseObject = this.mdCloseObject.bind(this);

    this.setMdState = this.setMdState.bind(this);
    this.createProcessor = this.createProcessor.bind(this);
    this.initializeCache = this.initializeCache.bind(this);

    this.remarkFootnotes = this.remarkFootnotes.bind(this);
    this.rehypeAnimation = this.rehypeAnimation.bind(this);

    this.generateCachedData = this.generateCachedData.bind(this);
    this.generateStreamData = this.generateStreamData.bind(this);

    // rehype-react keys elements by the identity of the component it was given,
    // so a map rebuilt per processor makes the same block look like a different
    // component each time it moves between processors — which remounts it,
    // dropping fullscreen and restarting its animations. One map, built once.
    this.components = this.createComponents();

    this.processor = this.createProcessor("regular");
    this.processorStream = this.createProcessor("regular-stream");
    this.processorAnimation = this.createProcessor("regular-animation");

    this.processorCache = this.createProcessor("cached");
    this.processorStreamCache = this.createProcessor("cached-stream");

    this.processorTableCache = this.createProcessor("cached-table");
    this.processorTableCacheAnimation = this.createProcessor(
      "cached-table-animation"
    );

    this.processorFootnote = this.createProcessor("footnote");
    this.processorFootnoteAnimation =
      this.createProcessor("footnote-animation");

    this.cachedData = this.initializeCache(this.state);
  }

  get version(): number {
    return this.versionValue;
  }

  /**
   * Merge streaming bookkeeping into local state and tell listeners to render.
   * The class used to be a React component; this is what setState did for it.
   *
   * `done` keeps setState's contract: it runs after the host has committed the
   * new content, not before. Callers use it to keep the view pinned to the
   * bottom, which only measures correctly once the rows are in the DOM. With
   * no subscriber there is nothing to wait for, so it runs straight away.
   */
  applyState(next: Record<string, unknown>, done?: () => void) {
    this.state = { ...this.state, ...next };
    this.versionValue += 1;

    if (typeof done === "function") {
      this.pending.push(done);
    }

    this.listeners.forEach((listener) => listener());

    if (this.listeners.size === 0) {
      this.flush();
    }
  }

  /**
   * Run the callbacks queued since the last flush. The host calls this from a
   * layout effect, so they see the committed DOM.
   */
  flush(): void {
    if (this.pending.length === 0) {
      return;
    }

    const queued = this.pending;
    this.pending = [];

    queued.forEach((callback) => {
      callback();
    });
  }

  /** Subscribe to renders. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update the options the engine reads while rendering. Called on every host
   * render, so it must stay cheap and must not invalidate cached output.
   */
  setOptions(next: Partial<StoreOptions>): void {
    this.options = { ...this.options, ...next };
  }

  /** Render a complete document, replacing anything shown before. */
  setMarkdown(md: string): void {
    if (this.state.md === md && this.cachedData?.length) {
      return;
    }

    this.reset();
    this.state = { ...this.state, md };
    this.cachedData = this.initializeCache(this.state);
    this.applyState({});
  }

  /** Drop everything and start again, keeping the configured options. */
  reset(): void {
    this.pending = [];

    this.mdBuffer = "";
    this.lineBuffer = "";
    this.footnoteBuffer = "";
    this.footnoteBufferProcessed = "";

    this.streamData = [];
    this.cachedData = [];
    this.streamDataMap = new Map();

    this.blockId = 0;
    this.blockType = null;
    this.buffering = null;
    this.mdState = null;

    this.mdExtra = new Map();
    this.footnotes = new Map();
    this.cachedFootnotes = null;

    this.resetLineCache();
    this.applyState({});
  }

  /** The tags this renderer replaces with components of its own. */
  private createComponents() {
    const vm = this;

    return {
      a: function MarkdownLinkTag(props: ComponentProps<typeof MarkdownLink>) {
        return (
          <MarkdownLink
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
      m: function MermaidDiagramTag(
        props: ComponentProps<typeof MermaidDiagram>
      ) {
        return (
          <MermaidDiagram
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
      img: function MarkdownImageTag(props: ComponentProps<typeof MarkdownImage>) {
        return (
          <MarkdownImage
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
      pre: function MarkdownCodeBlockTag(
        props: ComponentProps<typeof MarkdownCodeBlock>
      ) {
        return (
          <MarkdownCodeBlock
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
      table: function MarkdownTableTag(props: ComponentProps<typeof MarkdownTable>) {
        return (
          <MarkdownTable
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
    };
  }

  private createProcessor(type: ProcessorType) {
    const vm = this;

    const remarkFootnotes = vm.remarkFootnotes;

    const rehypeData = vm.rehypeData;
    const rehypeMermaid = vm.rehypeMermaid;
    const rehypeAnimation = vm.rehypeAnimation;

    switch (type) {
      default:
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex)
          .use(rehypeData)
          .use(rehypeMermaid)
          .use(rehypeHighlight)
          .use(rehypeReact, {
            jsx: customJsx,
            jsxs: customJsxs,
            Fragment: React.Fragment,
            createElement: React.createElement,
            components: vm.components,
          });

      case "cached":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex)
          .use(rehypeHighlight);

      case "cached-stream":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkFootnotes)
          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex);

      // Row-at-a-time table cache: stops at hast so a single <tr> can be
      // lifted out and turned into React without re-running the whole table.
      case "cached-table":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex);

      case "cached-table-animation":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex)
          .use(rehypeAnimation);

      case "regular":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex)
          .use(rehypeData)
          .use(rehypeMermaid)
          .use(rehypeHighlight)
          .use(rehypeReact, {
            jsx: customJsx,
            jsxs: customJsxs,
            Fragment: React.Fragment,
            createElement: React.createElement,
            components: vm.components,
          });

      case "regular-stream":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkFootnotes)
          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex)
          .use(rehypeData)
          .use(rehypeMermaid)
          .use(rehypeReact, {
            jsx: customJsx,
            jsxs: customJsxs,
            Fragment: React.Fragment,
            createElement: React.createElement,
            components: vm.components,
          });

      case "regular-animation":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)
          .use(remarkFootnotes)

          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeKatex)
          .use(rehypeData)
          .use(rehypeMermaid)
          .use(rehypeAnimation)
          .use(rehypeReact, {
            jsx: customJsx,
            jsxs: customJsxs,
            Fragment: React.Fragment,
            createElement: React.createElement,
            components: vm.components,
          });

      case "footnote":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)

          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeData)
          .use(rehypeReact, {
            jsx: customJsx,
            jsxs: customJsxs,
            Fragment: React.Fragment,
            createElement: React.createElement,
            components: vm.components,
          });

      case "footnote-animation":
        return unified()
          .use(remarkParse)
          .use(remarkMath)
          .use(remarkGfm)

          .use(remarkRehype, {
            allowDangerousHtml: true,
            footnoteLabel: "References",
          })
          .use(rehypeRaw)
          .use(rehypeData)
          .use(rehypeAnimation)
          .use(rehypeReact, {
            jsx: customJsx,
            jsxs: customJsxs,
            Fragment: React.Fragment,
            createElement: React.createElement,
            components: vm.components,
          });
    }

    function customJsx(
      type: ElementType,
      props: Record<string, unknown> & { key?: React.Key }
    ) {
      if (props && props.key) {
        const key = props.key;
        const newProps = { ...props };
        delete newProps.key;
        return jsx(type, newProps, key);
      }
      return jsx(type, props);
    }

    function customJsxs(
      type: ElementType,
      props: Record<string, unknown> & { key?: React.Key }
    ) {
      if (props && props.key) {
        const key = props.key;
        const newProps = { ...props };
        delete newProps.key;
        return jsxs(type, newProps, key);
      }
      return jsxs(type, props);
    }
  }

  private resetLineCache(): void {
    const vm = this;

    vm.lineBuffer = "";

    vm.lineCachedKey = 0;
    vm.lineCachedSize = 0;

    vm.lineCacheData = [];

    vm.tableHead = null;
    vm.tableRowText = [];
    vm.tableCommittedText = "";
    vm.listItemText = [];
    vm.listSignature = null;
    vm.tableSignature = null;

    vm.cachedType = null;

    vm.lineBufferInit = null;
  }

  // Components a table cell may contain. Kept narrow on purpose: a cell can
  // hold a link, an image or a mermaid ref, but never a nested table or fence.
  private cellComponents() {
    const vm = this;

    return {
      a: (props: ComponentProps<typeof MarkdownLink>) => {
        return (
          <MarkdownLink
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
      m: (props: ComponentProps<typeof MermaidDiagram>) => {
        return (
          <MermaidDiagram
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
      img: (props: ComponentProps<typeof MarkdownImage>) => {
        return (
          <MarkdownImage
            {...props}
            renderer={vm}
            scrollDown={vm.options.scrollDown}
          />
        );
      },
    };
  }

  private initializeCache(state: StoreState): RenderBlock[] {
    let md;
    let blockId;
    let blockItem;

    let timeNow;

    let processedData;

    const vm = this;
    vm.cachedData = [];

    timeNow = runtime.timeNow();

    if (state.md && state.md !== "") {
      blockId = vm.blockId;

      md = state.md;
      md = vm.mdMath(md, "renderer");
      md = vm.mdTable(md, "renderer", false);

      //md = state.md;

      processedData = vm.processMd(md, false, false);

      if (processedData) {
        blockItem = {
          key: blockId,
          time: timeNow,
          element: processedData,
        };

        vm.cachedData.push(blockItem);
        vm.blockId++;
      }
    }

    return vm.cachedData;
  }

  streamMd(
    md: string,
    streaming: boolean,
    animation: boolean,
    finalize: boolean
  ): void {
    let mdState;
    let blockType: BlockType;

    const vm = this;

    mdState = vm.setMdState(md);

    if (md && md !== "") {
      vm.mdBuffer += md;

      if (!vm.blockType) {
        blockType = vm.mdType(vm.mdBuffer, finalize);
      } else {
        blockType = vm.blockType;

        // A block typed from its first characters can still turn out to open a
        // fence — "`" alone reads as text until the other two backticks land.
        if (blockType === "text" && vm.syntax.fencedCodeRegex.test(vm.mdBuffer)) {
          blockType = "code";
          vm.blockType = "code";
        }
      }

      if (blockType === "pending") {
        // Nothing more is coming to resolve it, so settle for text.
        if (finalize !== true) {
          return;
        }

        blockType = "text";
      }

      vm.streamProcess(blockType, mdState, streaming, animation, finalize);

      if (finalize !== true) {
        return;
      }
    }

    vm.drainMd(mdState, streaming, animation, finalize);
  }

  // Closing a block consumes only the first one in the buffer and parks the
  // remainder in mdBuffer, relying on the next chunk to drive it. At finalize
  // there is no next chunk, so anything left has to be drained here or it is
  // silently dropped.
  private drainMd(
    mdState: string[],
    streaming: boolean,
    animation: boolean,
    finalize: boolean
  ): void {
    let guard;
    let blockType: BlockType;
    let previousBuffer;

    const vm = this;

    if (finalize !== true) {
      return;
    }

    guard = 0;

    while (vm.mdBuffer !== "" && guard < 1000) {
      previousBuffer = vm.mdBuffer;

      blockType = vm.blockType || vm.mdType(vm.mdBuffer, finalize);

      if (blockType === "pending") {
        blockType = "text";
      }

      vm.streamProcess(blockType, mdState, streaming, animation, true);

      if (vm.mdBuffer === previousBuffer) {
        return;
      }

      guard++;
    }
  }

  private streamProcess(
    blockType: BlockType,
    mdState: string[],
    streaming: boolean,
    animation: boolean,
    finalize: boolean
  ): void {
    let pending;
    let mdBuffer;
    let closeObject;
    let buffering;

    const vm = this;

    vm.mdReference(vm.mdBuffer, blockType);
    closeObject = vm.mdCloseObject(vm.mdBuffer, blockType);

    if (finalize === true && closeObject && closeObject.close !== true) {
      closeObject = {
        close: true,
        md: vm.mdBuffer,
        mdClose: closeObject.mdClose || "",
        mdNext: "",
      };
    }

    if (closeObject?.close !== true) {
      vm.blockType = blockType;
    } else {
      vm.blockType = null;

      blockType = vm.mdType(closeObject.md, finalize);

      if (blockType === "pending") {
        blockType = "text";
      }
    }

    buffering = vm.buffering || false;

    if (buffering !== true) {
      vm.blockId++;
      vm.buffering = true;

      vm.resetLineCache();
    }

    mdBuffer = closeObject?.md || vm.mdBuffer;

    mdBuffer = vm.mdMath(mdBuffer, blockType);

    // A closing block is complete, so nothing in it may be withheld.
    pending = closeObject?.close !== true;

    if (blockType === "text") {
      mdBuffer = vm.mdString(mdBuffer, blockType, pending);
      vm.streamText(
        mdBuffer,
        mdState,
        vm.blockId,
        closeObject,
        streaming,
        animation
      );
      return;
    }

    if (blockType === "code") {
      mdBuffer = vm.mdString(mdBuffer, blockType, pending);
      vm.streamCode(
        mdBuffer,
        mdState,
        vm.blockId,
        closeObject,
        streaming,
        animation
      );
      return;
    }

    if (blockType === "table") {
      mdBuffer = vm.mdString(mdBuffer, blockType, pending);
      vm.streamTable(
        mdBuffer,
        mdState,
        vm.blockId,
        closeObject,
        streaming,
        animation
      );
    }
  }

  private streamText(
    mdBuffer: string,
    mdState: string[],
    blockId: number,
    closeObject: CloseObject,
    streaming: boolean,
    animation: boolean
  ): void {
    let key;

    let block;
    let blockItem;

    let timeNow;

    let processedData;

    const vm = this;

    timeNow = runtime.timeNow();

    if (closeObject.close !== true) {
      // A long list is re-parsed whole on every chunk otherwise; cache its
      // settled items and re-parse only the one still being written.
      if (vm.listCacheable(mdBuffer) === true) {
        vm.processCacheMd(mdBuffer, "list", streaming, animation);
        processedData = vm.listElement();

        if (!processedData) {
          processedData = vm.processMd(mdBuffer, streaming, animation);
        }
      } else {
        vm.listSignature = null;
        processedData = vm.processMd(mdBuffer, streaming, animation);
      }

      key = blockId;
      block = vm.streamDataMap.get(blockId);

      if (block) {
        // Withholding can empty the buffer entirely; the block has to follow it
        // down, otherwise the last renderable frame stays on screen.
        block.time = timeNow;
        block.element = processedData;
      } else if (processedData) {
        blockItem = {
          key: key,
          time: timeNow,
          element: processedData,
        };

        vm.streamData.push(blockItem);
        vm.streamDataMap.set(blockId, blockItem);
      }

      if (block || processedData) {
        vm.applyState(
          {
            md: mdState,
          },
          () => {
            if (vm.options.scrollDown) {
              vm.options.scrollDown();
            }
          }
        );
      }
    } else {
      mdBuffer = closeObject.md;
      mdBuffer = vm.mdMath(mdBuffer, "text");

      vm.buffering = false;

      if (animation !== true) {
        processedData = vm.processMd(mdBuffer, streaming, animation);

        if (processedData) {
          key = blockId;
          block = vm.streamDataMap.get(blockId);

          if (block) {
            block.time = timeNow;
            block.element = processedData;
          } else {
            blockItem = {
              key: key,
              time: timeNow,
              element: processedData,
            };

            vm.streamData.push(blockItem);
            vm.streamDataMap.set(blockId, blockItem);
          }
        }
      } else {
        processedData = vm.processMd(mdBuffer, streaming, animation);

        if (processedData) {
          key = blockId;
          block = vm.streamDataMap.get(blockId);

          if (block) {
            block.time = timeNow;
            block.element = processedData;
          } else {
            blockItem = {
              key: key,
              time: timeNow,
              element: processedData,
            };

            vm.streamData.push(blockItem);
            vm.streamDataMap.set(blockId, blockItem);
          }
        }
      }

      vm.mdBuffer = closeObject.mdNext;

      vm.applyState({ md: mdState }, () => {
        if (vm.options.scrollDown) {
          vm.options.scrollDown();
        }
      });
    }
  }

  /**
   * Find a block of the given component type inside a processMd() result.
   *
   * processMd() hands back the whole document root, which is a Fragment even
   * when it holds a single block. Callers closing a block need to know whether
   * it parsed back into the same kind of block, and comparing the Fragment's
   * type never matches. Getting that wrong swaps the element type at a
   * position, which remounts the block: fullscreen turns itself off and every
   * animation inside starts over.
   */
  private blockOfType(
    node: ReactNode,
    type: ElementType
  ): ReactElement<{ children?: ReactNode }> | null {
    if (!React.isValidElement<{ children?: ReactNode }>(node)) {
      return null;
    }

    if (node.type === type) {
      return node;
    }

    if (node.type !== Fragment) {
      return null;
    }

    const children = React.Children.toArray(
      (node.props as { children?: React.ReactNode }).children
    );

    if (children.length !== 1) {
      return null;
    }

    const only = children[0];

    if (
      React.isValidElement<{ children?: ReactNode }>(only) &&
      only.type === type
    ) {
      return only;
    }

    return null;
  }

  private streamCode(
    mdBuffer: string,
    mdState: string[],
    blockId: number,
    closeObject: CloseObject,
    streaming: boolean,
    animation: boolean
  ): void {
    let key;
    let block;
    let blockItem;

    let codeElement;
    let preChildren;

    let processedData;
    let processedDataCode;
    let closedCodeBlock;

    const vm = this;
    const timeNow = runtime.timeNow();

    if (mdBuffer.trimStart().startsWith("```mermaid")) {
      mdBuffer = mdBuffer.trimStart();
      if (closeObject.close !== true) {
        processedData = vm.processMd(mdBuffer, streaming, false);

        if (processedData) {
          key = blockId;
          block = vm.streamDataMap.get(blockId);

          if (block) {
            block.time = timeNow;
            block.element = processedData;
          } else {
            blockItem = {
              key: key,
              time: timeNow,
              element: processedData,
            };

            vm.streamData.push(blockItem);
            vm.streamDataMap.set(blockId, blockItem);
          }
          vm.applyState(
            {
              md: mdState,
            },
            () => {
              if (vm.options.scrollDown) {
                vm.options.scrollDown();
              }
            }
          );
        }
      } else {
        mdBuffer = closeObject.md;
        mdBuffer = mdBuffer.trimStart();

        vm.buffering = false;

        processedData = vm.processMd(mdBuffer, streaming, false);

        if (processedData) {
          key = blockId;
          block = vm.streamDataMap.get(blockId);

          if (block) {
            block.time = timeNow;
            block.element = processedData;
          } else {
            blockItem = {
              key: key,
              time: timeNow,
              element: processedData,
            };

            vm.streamData.push(blockItem);
            vm.streamDataMap.set(blockId, blockItem);
          }
        }

        vm.mdBuffer = closeObject.mdNext;

        vm.applyState({ md: mdState }, () => {
          if (vm.options.scrollDown) {
            vm.options.scrollDown();
          }
        });
      }
    } else {
      if (closeObject.close !== true) {
        vm.processCacheMd(mdBuffer, "code", streaming, animation);

        codeElement = (
          <code className={vm.cachedType ? `language-${vm.cachedType}` : ""}>
            {vm.lineCacheData}
          </code>
        );

        processedData = (
          <MarkdownCodeBlock
            stream={true}
            streaming={streaming}
            animation={animation}
            children={codeElement}
          />
        );

        block = vm.streamDataMap.get(blockId);
        if (block) {
          block.time = timeNow;
          block.element = processedData;
        } else {
          blockItem = {
            key: blockId,
            time: timeNow,
            element: processedData,
          };
          vm.streamData.push(blockItem);
          vm.streamDataMap.set(blockId, blockItem);
        }

        vm.applyState({ md: mdState }, () => {
          if (vm.options.scrollDown) {
            vm.options.scrollDown();
          }
        });
      } else {
        vm.buffering = false;
        vm.mdBuffer = closeObject.mdNext;

        processedDataCode = vm.processMd(mdBuffer, false, false);
        closedCodeBlock = vm.blockOfType(processedDataCode, vm.components.pre);

        if (processedDataCode && !closedCodeBlock) {
          // The fence turned out to be something else once it closed, so there
          // is no code block to keep: render whatever it actually became.
          processedData = processedDataCode;
        } else {
          vm.processCacheMd(mdBuffer, "code", streaming, animation);

          codeElement = (
            <code className={vm.cachedType ? `language-${vm.cachedType}` : ""}>
              {vm.lineCacheData}
            </code>
          );

          if (closedCodeBlock) {
            preChildren = closedCodeBlock.props.children;
          }

          processedData = (
            <MarkdownCodeBlock
              stream={false}
              streaming={streaming}
              animation={animation}
              children={codeElement}
              preChildren={preChildren}
            />
          );
        }

        block = vm.streamDataMap.get(blockId);
        if (block) {
          block.time = timeNow;
          block.element = processedData;
        } else {
          blockItem = {
            key: blockId,
            time: timeNow,
            element: processedData,
          };
          vm.streamData.push(blockItem);
          vm.streamDataMap.set(blockId, blockItem);
        }

        vm.applyState({ md: mdState }, () => {
          if (vm.options.scrollDown) {
            vm.options.scrollDown();
          }
        });
      }
    }
  }

  // Both the streaming frames and the closed one are built here, so React
  // sees the same shape throughout and never remounts the table.
  private tableElement(stream: boolean): ReactElement {
    let rows;

    const vm = this;

    rows = vm.lineCacheData.filter((row) => row);

    return (
      <MarkdownTable
        stream={stream}
        renderer={vm}
        scrollDown={vm.options.scrollDown}
      >
        <thead>{vm.tableHead}</thead>
        {rows.length > 0 ? <tbody>{vm.lineCacheData}</tbody> : null}
      </MarkdownTable>
    );
  }

  // The list wrapper. Its attributes follow from the items themselves: the
  // start number from the first marker, the task-list class from whether any
  // item rendered a checkbox.
  private listElement(): ReactElement | null {
    let items;
    let start;
    let marker;
    let ordered;
    let className;

    const vm = this;

    items = vm.lineCacheData.filter((item) => item);

    if (items.length === 0) {
      return null;
    }

    marker = (vm.listItemText[0] || "").match(vm.syntax.listMarkerRegex);
    ordered = marker ? /\d/.test(marker[1] ?? "") : false;

    className = items.some((item) => {
      let itemClass;

      if (!React.isValidElement<{ className?: string | string[] }>(item)) {
        return false;
      }

      itemClass = item.props.className;
      return (
        (Array.isArray(itemClass) && itemClass.indexOf("task-list-item") !== -1) ||
        (typeof itemClass === "string" && itemClass.includes("task-list-item"))
      );
    })
      ? "contains-task-list"
      : undefined;

    if (ordered !== true) {
      return (
        <ul className={className}>{vm.lineCacheData}</ul>
      );
    }

    start = parseInt(marker?.[1] ?? "1", 10);

    return (
      <ol className={className} start={start === 1 ? undefined : start}>
        {vm.lineCacheData}
      </ol>
    );
  }

  private streamTable(
    mdBuffer: string,
    mdState: string[],
    blockId: number,
    closeObject: CloseObject,
    streaming: boolean,
    animation: boolean
  ): void {
    let key;

    let block;
    let blockItem;

    let timeNow;

    let processedData;

    const vm = this;

    timeNow = runtime.timeNow();

    if (closeObject.close !== true) {
      vm.processCacheMd(mdBuffer, "table", streaming, animation);

      // Fall back to a whole-buffer parse until the header row is cacheable —
      // a headless table has none until mdTable has synthesised one.
      if (vm.tableHead) {
        processedData = vm.tableElement(true);
      } else {
        processedData = vm.processMd(mdBuffer, streaming, animation);
      }

      if (processedData) {
        key = blockId;
        block = vm.streamDataMap.get(blockId);

        if (block) {
          block.time = timeNow;
          block.element = processedData;
        } else {
          blockItem = {
            key: key,
            time: timeNow,
            element: processedData,
          };

          vm.streamData.push(blockItem);
          vm.streamDataMap.set(blockId, blockItem);
        }
        vm.applyState(
          {
            md: mdState,
          },
          () => {
            if (vm.options.scrollDown) {
              vm.options.scrollDown();
            }
          }
        );
      }
    } else {
      vm.buffering = false;

      // Close from the same cache the streaming frames were built from. Handing
      // React a differently shaped tree here — rehype-react's wrapper instead
      // of MarkdownTable — remounts the whole table, and with animation on
      // every cell restarts its fade.
      vm.processCacheMd(mdBuffer, "table", streaming, animation);

      if (vm.tableHead) {
        processedData = vm.tableElement(false);
      } else {
        processedData = vm.processMd(mdBuffer, streaming, animation);
      }

      if (processedData) {
        key = blockId;
        block = vm.streamDataMap.get(blockId);

        if (block) {
          block.time = timeNow;
          block.element = processedData;
        } else {
          blockItem = {
            key: key,
            time: timeNow,
            element: processedData,
          };

          vm.streamData.push(blockItem);
          vm.streamDataMap.set(blockId, blockItem);
        }
      }

      vm.mdBuffer = closeObject.mdNext;

      vm.applyState({ md: mdState }, () => {
        if (vm.options.scrollDown) {
          vm.options.scrollDown();
        }
      });
    }
  }

  // A list block whose items can be cached one at a time. It has to be a
  // single plain list: it starts with an item, every top-level item shares a
  // marker family, and nothing sits at the base indent that is not an item.
  // Anything else — a marker change, which CommonMark reads as a second list,
  // or a lazy continuation — falls back to parsing the block whole.
  private listCacheable(md: string): boolean {
    let i;
    let line;
    let lines;
    let marker;
    let indent;
    let baseIndent;
    let itemCount;

    const vm = this;

    lines = md.split(vm.syntax.lineSplitRegex);

    marker = null;
    baseIndent = null;
    itemCount = 0;

    for (i = 0; i < lines.length; i++) {
      line = lines[i] ?? "";

      if (line.trim() === "") {
        continue;
      }

      indent = (line.match(vm.syntax.listIndentOnlyRegex)?.[0] ?? "").length;

      if (baseIndent === null) {
        if (vm.syntax.listItemRegex.test(line) !== true) {
          return false;
        }
        baseIndent = indent;
      }

      if (vm.syntax.listItemRegex.test(line) === true && indent <= baseIndent) {
        if (marker === null) {
          marker = vm.listMarkerFamily(line);
        } else if (vm.listMarkerFamily(line) !== marker) {
          return false;
        }

        itemCount++;
      } else if (indent <= baseIndent) {
        return false;
      }
    }

    return itemCount > 1;
  }

  // "-" and "*" start different lists; "1." and "1)" likewise.
  private listMarkerFamily(line: string): string | null {
    let match;

    const vm = this;

    match = line.match(vm.syntax.listMarkerRegex);

    if (!match) {
      return null;
    }

    if (/\d/.test(match[1] ?? "") === true) {
      return "ordered" + (match[1] ?? "").slice(-1);
    }

    return "bullet" + (match[1] ?? "");
  }

  // Split a list block into its top-level items. A deeper marker is a nested
  // list and stays with the item above it.
  private listItems(md: string): string[] {
    let i;
    let line;
    let lines;
    let items: string[];
    let indent;
    let current: string | null;
    let baseIndent;

    const vm = this;

    lines = md.split(vm.syntax.lineSplitRegex);

    items = [];
    current = null;
    baseIndent = null;

    for (i = 0; i < lines.length; i++) {
      line = lines[i] ?? "";
      indent = (line.match(vm.syntax.listIndentOnlyRegex)?.[0] ?? "").length;

      if (vm.syntax.listItemRegex.test(line) === true && baseIndent === null) {
        baseIndent = indent;
      }

      if (
        vm.syntax.listItemRegex.test(line) === true &&
        baseIndent !== null &&
        indent <= baseIndent
      ) {
        if (current !== null) {
          items.push(current);
        }
        current = line;
      } else if (current !== null) {
        current += "\n" + line;
      }
    }

    if (current !== null) {
      items.push(current);
    }

    return items;
  }

  // Footnote definitions render nothing where they are written: the notes are
  // gathered separately and emitted as one section at the end. A block holding
  // only definitions therefore parses to an empty result, and on a long note
  // list that same block is re-parsed on every chunk for no output at all.
  private definitionsOnly(md: string): boolean {
    let i;
    let line;
    let lines;
    let sawDefinition;

    const vm = this;

    lines = md.split(vm.syntax.lineSplitRegex);
    sawDefinition = false;

    for (i = 0; i < lines.length; i++) {
      line = lines[i] ?? "";

      if (line.trim() === "") {
        continue;
      }

      if (vm.syntax.footnoteDefinitionRegex.test(line) === true) {
        sawDefinition = true;
        continue;
      }

      if (sawDefinition === true && vm.syntax.footnoteContinuationRegex.test(line)) {
        continue;
      }

      return false;
    }

    return sawDefinition;
  }

  private processMd(
    md: string,
    streaming: boolean,
    animation: boolean,
    data: MarkdownData = {}
  ): ReactNode {
    let file;
    let processor;

    let mdExtraString: string;

    const vm = this;

    if (!md || md === "") {
      return null;
    } else if (vm.definitionsOnly(md) === true) {
      return null;
    } else {
      if (streaming !== true) {
        file = {
          value: md,
          data: data,
        };
        processor = vm.processor();
      } else {
        file = {
          value: md,
          data: data,
        };

        if (vm.mdExtra.size > 0) {
          mdExtraString = "";

          // Only the placeholders this block actually refers to change what it
          // renders. Appending the rest re-parses every known footnote on every
          // chunk, and remark then drops them as unused.
          vm.mdExtra.forEach((value, key) => {
            if (md.indexOf(key) !== -1) {
              mdExtraString += `\n\n${value}\n\n`;
            }
          });

          if (mdExtraString !== "") {
            file.value += mdExtraString;
          }
        }

        if (animation !== true) {
          processor = vm.processorStream();
        } else {
          processor = vm.processorAnimation();
        }
      }

      return processor.processSync(file).result;
    }
  }

  private processCacheMd(
    md: string,
    type: CacheType,
    streaming: boolean,
    animation: boolean
  ): void {
    let match;

    let lineIndex: number;
    let lineBuffer;
    let lineInitMatch;

    let items;
    let loose;
    let signature;

    let headIndex;
    let bodyLines;
    let bodyStart;
    let tailStart;
    let committedText;
    let delimiterIndex;
    let tableSignature;
    let committedCount;

    let separatorCount;

    let processorCache: ReturnType<Store["createProcessor"]>;
    let lineSeparatorRegex;

    const vm = this;

    if (type === "code") {
      lineSeparatorRegex = /\r\n?|\n/;

      if (md.length <= vm.lineCachedSize) {
        return;
      }

      vm.lineBuffer += md.substring(vm.lineCachedSize);
      vm.lineCachedSize = md.length;

      if (streaming !== true) {
        processorCache = vm.processorCache();
      } else {
        processorCache = vm.processorStreamCache();
      }

      if (vm.lineBufferInit !== true) {
        lineInitMatch = vm.lineBuffer.match(vm.syntax.codeCachedInitRegex);

        if (!lineInitMatch) {
          console.error("THIS SHOULD NEVER HAPPEN!", vm.lineBuffer);
          return;
        }

        vm.lineBufferInit = true;
        vm.cachedType = lineInitMatch[1] || null;
        vm.lineBuffer = vm.lineBuffer.substring(lineInitMatch[0].length);
      }

      while ((match = vm.lineBuffer.match(lineSeparatorRegex))) {
        lineIndex = match.index ?? 0;
        separatorCount = match[0].length;

        lineBuffer = vm.lineBuffer.substring(0, lineIndex + separatorCount);
        generateCodeData(vm.lineCachedKey, lineBuffer);

        vm.lineCachedKey++;

        vm.lineBuffer = vm.lineBuffer.substring(lineIndex + separatorCount);
      }

      // One or two backticks alone on the last line are most likely the
      // closing fence arriving; showing them would put the fence marker into
      // the code. A line that really is just a backtick still appears once its
      // newline lands and the line is committed above.
      if (
        vm.lineBuffer.length > 0 &&
        vm.syntax.partialFenceRegex.test(vm.lineBuffer) !== true
      ) {
        generateCodeData(vm.lineCachedKey, vm.lineBuffer);
      }
    }

    if (type === "table") {
      lineSeparatorRegex = /\r\n?|\n/;

      headIndex = md.indexOf("\n");
      if (headIndex === -1) {
        return;
      }

      delimiterIndex = md.indexOf("\n", headIndex + 1);
      if (delimiterIndex === -1) {
        return;
      }

      tableSignature = md.substring(0, delimiterIndex);

      if (animation !== true) {
        processorCache = vm.processorTableCache();
      } else {
        processorCache = vm.processorTableCacheAnimation();
      }

      // A headless table synthesises its header from the widest row so far, so
      // a wider row arriving later rewrites it. Rebuild from scratch then.
      if (vm.tableSignature !== tableSignature) {
        vm.tableSignature = tableSignature;
        vm.tableHead = generateHeadData(processorCache);

        vm.lineCacheData = [];
        vm.tableRowText = [];
        vm.tableCommittedText = "";
      }

      if (!vm.tableHead) {
        return;
      }

      // Unlike a code fence, the table buffer is not append-only: mdString
      // rewrites its tail every chunk (math placeholder, token balancing), so
      // rows are matched by text rather than by a consumed-length offset.
      // Splitting all of it every chunk is what made a long table quadratic,
      // so compare the committed region first and only split what is new.
      bodyStart = delimiterIndex + 1;
      tailStart = md.lastIndexOf("\n") + 1;

      if (tailStart < bodyStart) {
        tailStart = bodyStart;
      }

      committedText = md.substring(bodyStart, tailStart);

      if (committedText !== vm.tableCommittedText) {
        if (
          vm.tableCommittedText !== "" &&
          committedText.startsWith(vm.tableCommittedText) === true
        ) {
          bodyLines = committedText
            .substring(vm.tableCommittedText.length)
            .split(lineSeparatorRegex);

          bodyLines.pop();
          lineIndex = vm.tableRowText.length;
        } else {
          bodyLines = committedText.split(lineSeparatorRegex);

          bodyLines.pop();
          lineIndex = 0;

          vm.tableRowText.length = 0;
          vm.lineCacheData.length = 0;
        }

        bodyLines.forEach((row) => {
          if (vm.tableRowText[lineIndex] !== row) {
            vm.tableRowText[lineIndex] = row;
            vm.lineCacheData[lineIndex] = generateRowData(
              lineIndex,
              row,
              processorCache
            );
          }

          lineIndex++;
        });

        vm.tableRowText.length = lineIndex;
        vm.lineCacheData.length = lineIndex;
        vm.tableCommittedText = committedText;
      }

      committedCount = vm.tableRowText.length;
      bodyLines = [];
      bodyLines[committedCount] = md.substring(tailStart);

      // The last line has no newline yet, so it is still being written and is
      // re-rendered on every chunk instead of being cached.
      lineBuffer = bodyLines[committedCount];

      if (lineBuffer && lineBuffer.trim() !== "") {
        vm.lineCacheData[committedCount] = generateRowData(
          committedCount,
          lineBuffer,
          processorCache
        );
      }
    }

    if (type === "list") {
      items = vm.listItems(md);
      loose = vm.syntax.listLooseRegex.test(md);
      signature =
        vm.listMarkerFamily(items[0] ?? "") + (loose ? ":loose" : ":tight");

      if (animation !== true) {
        processorCache = vm.processorTableCache();
      } else {
        processorCache = vm.processorTableCacheAnimation();
      }

      // Looseness is a property of the whole list, so a change to it re-renders
      // every item: their contents gain or lose a wrapping paragraph.
      if (vm.listSignature !== signature) {
        vm.listSignature = signature;
        vm.lineCacheData = [];
        vm.listItemText = [];
      }

      // The last item is still being written; everything before it is settled.
      for (lineIndex = 0; lineIndex < items.length; lineIndex++) {
        lineBuffer = items[lineIndex] ?? "";

        if (vm.listItemText[lineIndex] !== lineBuffer) {
          vm.listItemText[lineIndex] = lineBuffer;
          vm.lineCacheData[lineIndex] = generateItemData(
            lineIndex,
            lineBuffer,
            loose,
            processorCache
          );
        }
      }

      vm.listItemText.length = items.length;
      vm.lineCacheData.length = items.length;

      return;
    }

    function generateItemData(
      key: number,
      itemBuffer: string,
      loose: boolean,
      processorCache: ReturnType<Store["createProcessor"]>
    ) {
      let block;
      let marker;
      let itemNode;
      let hastData;

      if (!itemBuffer || itemBuffer.trim() === "") {
        return null;
      }

      block = itemBuffer;

      // A lone item parses tight. Give a loose list a second item so the
      // parser marks it loose and the contents keep their paragraph.
      if (loose === true) {
        marker = itemBuffer.match(vm.syntax.listMarkerRegex);
        block = itemBuffer + "\n\n" + (marker ? marker[1] : "-") + " x";
      }

      hastData = processorCache.runSync(processorCache.parse(block));

      itemNode = findListItem(hastData as HastRoot);

      if (!itemNode) {
        return null;
      }

      return React.cloneElement(
        toJsxRuntime(itemNode, {
          jsx: jsx,
          jsxs: jsxs,
          Fragment: React.Fragment,
          components: vm.cellComponents(),
        }),
        { key: key }
      );
    }

    function findListItem(tree: HastRoot): HastElement | null {
      let itemNode: HastElement | null;

      itemNode = null;

      visit(tree, "element", (node) => {
        if (itemNode) {
          return EXIT;
        }

        if (node.tagName !== "ul" && node.tagName !== "ol") {
          return;
        }

        node.children.forEach((child: HastContent) => {
          if (!itemNode && child.type === "element" && child.tagName === "li") {
            itemNode = child;
          }
        });

        return undefined;
      });

      return itemNode;
    }

    function generateHeadData(
      processorCache: ReturnType<Store["createProcessor"]>
    ) {
      let rowNode;
      let hastData;

      hastData = processorCache.runSync(
        processorCache.parse(vm.tableSignature + "\n")
      );

      rowNode = findSectionRow(hastData as HastRoot, "thead");

      if (!rowNode) {
        return null;
      }

      return toJsxRuntime(rowNode, {
        jsx: jsx,
        jsxs: jsxs,
        Fragment: React.Fragment,
        components: vm.cellComponents(),
      });
    }

    function generateRowData(
      key: number,
      rowBuffer: string,
      processorCache: ReturnType<Store["createProcessor"]>
    ) {
      let rowNode;
      let hastData;
      let tableBlock;

      if (!rowBuffer || rowBuffer.trim() === "") {
        return null;
      }

      tableBlock = vm.tableSignature + "\n" + rowBuffer + "\n";
      hastData = processorCache.runSync(processorCache.parse(tableBlock));

      rowNode = findSectionRow(hastData as HastRoot, "tbody");

      if (!rowNode) {
        return null;
      }

      // toJsxRuntime has no key option, so the row lands in <tbody> unkeyed.
      return React.cloneElement(
        toJsxRuntime(rowNode, {
          jsx: jsx,
          jsxs: jsxs,
          Fragment: React.Fragment,
          components: vm.cellComponents(),
        }),
        { key: key }
      );
    }

    function findSectionRow(
      tree: HastRoot,
      sectionTag: "thead" | "tbody"
    ): HastElement | null {
      let rowNode: HastElement | null;

      rowNode = null;

      visit(tree, "element", (node) => {
        if (rowNode) {
          return EXIT;
        }

        if (node.tagName !== sectionTag) {
          return;
        }

        node.children.forEach((child: HastContent) => {
          if (!rowNode && child.type === "element" && child.tagName === "tr") {
            rowNode = child;
          }
        });

        return undefined;
      });

      return rowNode;
    }

    function generateCodeData(key: number, lineBuffer: string) {
      let tokens;
      let content;
      let keySpan;

      let lineData;

      // A line holding nothing but a fence closes the block; it is not part of
      // the code. Parsing used to drop it as a side effect.
      if (vm.syntax.fenceOnlyRegex.test(lineBuffer)) {
        return;
      }

      // Inside a fence the line is literal. Running it through remark only to
      // read the same text back costs a parse per chunk — measurably the bulk
      // of the time spent streaming a code block.
      lineData = lineBuffer;

      if (lineData) {
        if (animation !== true) {
          content = lineData;
        } else {
          tokens = lineData.split(vm.syntax.emptyRegex);

          content = tokens.map((token, idx) => {
            if (token.trim() === "") {
              return token;
            }

            keySpan = `${key}-w${idx}`;
            return (
              <span key={keySpan} data-animate-word={true}>
                {token}
              </span>
            );
          });
        }

        vm.lineCacheData[key] = <Fragment key={key}>{content}</Fragment>;
      }
    }
  }

  private setMdState(mdToken: string): string[] {
    const vm = this;

    if (!vm.mdState) {
      vm.mdState = [];
    }

    if (!mdToken && mdToken === "") {
      return vm.mdState;
    } else {
      vm.mdState.push(mdToken);
      return vm.mdState;
    }
  }

  private remarkFootnotes() {
    return (tree: MdastRoot, file: VFile) => {
      const data = file.data as typeof file.data & {
        footnoteDefinitions?: unknown[];
      };

      data.footnoteDefinitions ||= [];

      visit(tree, "footnoteDefinition", (_node, index, parent) => {
        if (parent && index !== undefined) {
          parent.children.splice(index, 1);
        }

        return [SKIP, index];
      });
    };
  }

  private rehypeData() {
    const dataKey = "rehypeData";

    return (tree: HastRoot, file: VFile) => {
      let tagName;
      let propsToAdd: Record<string, unknown>;
      let propsByTagName: Record<string, Record<string, unknown>>;

      const data = file.data as typeof file.data & {
        rehypeData?: Record<string, Record<string, unknown>>;
      };

      if (!data[dataKey]) {
        return;
      }

      propsByTagName = data[dataKey];

      for (tagName in propsByTagName) {
        if (Object.prototype.hasOwnProperty.call(propsByTagName, tagName)) {
          propsToAdd = propsByTagName[tagName] ?? {};

          visit(tree, { tagName }, (node) => {
            if (!node.properties) {
              node.properties = {};
            }

            Object.assign(node.properties, propsToAdd);
          });
        }
      }
    };
  }

  private rehypeMermaid() {
    return (tree: HastRoot) => {
      visit(tree, "element", (node, index, parent) => {
        if (node.tagName === "pre") {
          let rawCode: string;
          const codeNode = node.children[0];

          if (
            codeNode?.type === "element" &&
            codeNode.tagName === "code" &&
            codeNode.properties.className &&
            codeNode.properties.className.includes("language-mermaid")
          ) {
            const codeText = codeNode.children[0];
            rawCode = codeText?.type === "text" ? codeText.value : "";

            if (rawCode) {
              rawCode = rawCode.trimEnd();

              if (rawCode.endsWith("```")) {
                rawCode = rawCode.slice(0, -3);
              }
            }

            if (parent && index !== undefined) {
              parent.children[index] = {
                type: "element",
                tagName: "m",
                properties: {
                  chart: rawCode,
                },
                children: [],
              };
            }
          }
        }
      });
    };
  }

  private rehypeAnimation() {
    const vm = this;

    return (tree: HastRoot) => {
      visit(tree, visitor);
    };

    function visitor(
      node: UnistNode,
      index: number | undefined,
      parent: HastParent | undefined
    ) {
      let key;
      let texts;
      let spanNodes: HastContent[];

      // KaTeX lays out its own spans — wrapping its text nodes breaks the math.
      // Raw-text elements hold text and nothing else; React drops a <script>
      // whose child is an element, taking its content with it.
      if (isHastElement(node)) {
        if (isKatex(node) || vm.syntax.rawTextTags.indexOf(node.tagName) !== -1) {
          return SKIP;
        }
        return;
      }

      if (!isHastText(node) || !parent || index === undefined) {
        return;
      }

      // If the immediate parent is a link, annotate the <a> and skip wrapping
      if (isHastElement(parent) && parent.tagName === "a") {
        parent.properties ||= {};
        if (!("data-animate-word" in parent.properties)) {
          parent.properties["data-animate-word"] = true;
        }

        if (!("data-animate-key" in parent.properties)) {
          parent.properties["data-animate-key"] = `link-${index}`;
        }

        return SKIP;
      }

      if (
        isHastElement(parent) &&
        parent.properties["data-animate-word"]
      ) {
        return SKIP;
      }

      spanNodes = [];
      texts = node.value.split(vm.syntax.emptyRegex);

      texts.forEach((text, textIndex) => {
        if (text.trim() === "") {
          spanNodes.push({ type: "text", value: text });
        } else {
          key = `word-${index}-${textIndex}`;
          spanNodes.push({
            type: "element",
            tagName: "span",
            properties: {
              "data-animate-word": true,
              "data-animate-key": key,
            },
            children: [{ type: "text", value: text }],
          });
        }
      });

      parent.children.splice(index, 1, ...spanNodes);
      return index + spanNodes.length;
    }

    function isKatex(node: HastElement): boolean {
      let i;
      let className;

      className = node.properties && node.properties.className;

      if (!className) {
        return false;
      }

      if (!Array.isArray(className)) {
        className = String(className).split(" ");
      }

      for (i = 0; i < className.length; i++) {
        if (String(className[i]).indexOf("katex") === 0) {
          return true;
        }
      }

      return false;
    }

    function isHastElement(node: UnistNode): node is HastElement {
      return node.type === "element" && "tagName" in node;
    }

    function isHastText(
      node: UnistNode
    ): node is Extract<HastContent, { type: "text" }> {
      return node.type === "text" && "value" in node;
    }
  }

  private mdType(mdBuffer: string, finalize: boolean): BlockType {
    let blockType: BlockType | undefined;
    let trimmed;
    let hrPending;
    let lineBreakStart;
    let lineBreakPending;
    let codeBlockPending;
    let tableBlockPending;

    const vm = this;

    if (!mdBuffer || mdBuffer === "") {
      return "text";
    }

    hrPending = hrPendingCheck(mdBuffer);
    if (hrPending) {
      blockType = hrPending;
    }

    if (!blockType) {
      lineBreakStart = lineBreakStartCheck(mdBuffer);
      if (lineBreakStart) {
        blockType = lineBreakStart;
      }
    }

    if (!blockType) {
      lineBreakPending = lineBreakPendingCheck(mdBuffer);
      if (lineBreakPending) {
        blockType = lineBreakPending;
      }
    }

    if (!blockType) {
      codeBlockPending = codeBlockPendingCheck(mdBuffer);
      if (codeBlockPending) {
        blockType = codeBlockPending;
      }
    }

    if (!blockType) {
      tableBlockPending = tableBlockPendingCheck(mdBuffer);
      if (tableBlockPending) {
        blockType = tableBlockPending;
      }
    }

    if (!blockType) {
      blockType = "text";
    }

    if (blockType !== "pending") {
      return blockType;
    }

    trimmed = mdBuffer.trimEnd();

    if (vm.syntax.inlineLinkCloseRegex && vm.syntax.inlineLinkCloseRegex.test(trimmed)) {
      return "text";
    }

    // A table row need not end in a pipe, so a buffer held pending only by its
    // trailing newline still has to resolve to a table rather than a paragraph.
    if (tableBlockPendingCheck(trimmed) === "table") {
      return "table";
    }

    if (finalize === true) {
      return "text";
    }

    return blockType;

    function hrPendingCheck(mdBuffer: string): BlockType | undefined {
      const hrRegex = vm.syntax.hrRegex;

      if (hrRegex.test(mdBuffer)) {
        return "pending";
      }

      return undefined;
    }

    function lineBreakStartCheck(mdBuffer: string): BlockType | undefined {
      if (mdBuffer.startsWith("\n")) {
        return "text";
      }

      return undefined;
    }

    function lineBreakPendingCheck(mdBuffer: string): BlockType | undefined {
      if (mdBuffer.endsWith("\n")) {
        if (
          mdBuffer.trimStart().startsWith("```") ||
          mdBuffer.trimStart().startsWith("~~~")
        ) {
          return "code";
        }

        if (
          mdBuffer.endsWith("|\n") !== true &&
          mdBuffer.endsWith("|\n\n") !== true
        ) {
          return "pending";
        }
      }

      return undefined;
    }

    function codeBlockPendingCheck(mdBuffer: string): BlockType | undefined {
      const incompleteFenceRegex = vm.syntax.incompleteFenceRegex;
      if (incompleteFenceRegex.test(mdBuffer)) {
        return "pending";
      }

      const fencedCodeRegex = vm.syntax.fencedCodeRegex;
      if (fencedCodeRegex.test(mdBuffer)) {
        return "code";
      }

      const indentedCodeRegex = vm.syntax.indentedCodeRegex;
      if (indentedCodeRegex.test(mdBuffer)) {
        return "code";
      }

      return undefined;
    }

    function tableBlockPendingCheck(mdBuffer: string): BlockType | undefined {
      const pipeMatches = mdBuffer.match(vm.syntax.pipeRegex);
      const pipeCount = pipeMatches ? pipeMatches.length : 0;

      if (pipeCount >= 2) {
        return "table";
      } else if (pipeCount === 1) {
        return "pending";
      }

      return undefined;
    }
  }

  private mdMath(mdBuffer: string, blockType: string): string {
    return markdownSyntax.convertMath(mdBuffer, blockType) ?? "";
  }

  private mdTable(
    mdBuffer: string,
    blocktype: BlockType | "renderer",
    pending: boolean
  ): string {
    const vm = this;

    if (blocktype === "table") {
      return convertTable(mdBuffer);
    }

    if (blocktype === "renderer") {
      let lines;
      let headed;

      let match;
      let matchIndex;

      let result;
      let pointer;

      let trimmed;

      let replacement;
      let bufferLength;
      let fencedRanges;

      let delimiterLine;

      const tableRegex = vm.syntax.tableRendererInitRegex;

      result = "";

      pointer = 0;
      tableRegex.lastIndex = 0;

      bufferLength = mdBuffer.length;

      fencedRanges = collectFencedRanges(mdBuffer);

      while ((match = tableRegex.exec(mdBuffer))) {
        matchIndex = match.index;

        if (pointer < matchIndex) {
          result += mdBuffer.slice(pointer, matchIndex);
        }

        if (isInsideFenced(matchIndex, fencedRanges)) {
          result += match[0];
        } else {
          trimmed = match[0].trim();
          lines = trimmed.split("\n");

          delimiterLine = lines[1] || "";
          headed = checkHeaded(delimiterLine);

          if (headed !== true) {
            replacement = convertTableHeadless(match[0], lines);
            replacement = replacement + "\n";
            result += replacement;
          } else {
            result += match[0];
          }
        }

        pointer = matchIndex + match[0].length;
      }

      if (pointer < bufferLength) {
        result += mdBuffer.slice(pointer, bufferLength);
      }

      tableRegex.lastIndex = 0;

      mdBuffer = result;

      return mdBuffer;
    }

    return mdBuffer;

    function convertTable(mdBuffer: string): string {
      let headed;

      let lines;
      let headerLine;
      let delimiterLine;

      const trimmed = mdBuffer.trim();

      if (!vm.syntax.closeRegex.test(trimmed)) {
        return mdBuffer;
      } else {
        lines = trimmed.split("\n");
        headerLine = lines[0] || "";
        delimiterLine = lines[1] || "";

        headed = checkHeaded(delimiterLine);

        if (headed !== true) {
          mdBuffer = convertTableHeadless(mdBuffer, lines);

          return mdBuffer;
        } else {
          mdBuffer = convertTableWithHeader(mdBuffer, headerLine, lines);

          return mdBuffer;
        }
      }
    }

    function checkHeaded(delimiterLine: string): boolean {
      if (
        delimiterLine.includes("---") ||
        delimiterLine.indexOf("|-") !== -1 ||
        delimiterLine.indexOf("|:-") !== -1 ||
        delimiterLine.indexOf("|-:") !== -1 ||
        delimiterLine.indexOf("| :-") !== -1 ||
        delimiterLine.indexOf("| -:") !== -1
      ) {
        return true;
      } else {
        return false;
      }
    }

    function convertTableHeadless(mdBuffer: string, lines: string[]): string {
      let white;

      let trimmed;
      let bodyRows;

      let tableContent;

      let columns;
      let dummyHeader;
      let dummyDelimiter;

      let columnsMax = 0;

      // Normalise the outer pipes first: a headless row may arrive as "a | b",
      // and counting columns before adding them reports one column too few.
      bodyRows = lines
        .map((line) => {
          trimmed = line.trim();
          if (trimmed && !trimmed.endsWith("|")) {
            trimmed += " |";
          }
          if (trimmed && !trimmed.startsWith("|")) {
            trimmed = "| " + trimmed;
          }
          return trimmed;
        })
        .filter((line) => line !== "");

      bodyRows.forEach((line) => {
        columns = line.split(vm.syntax.closeRegex).length - 2;
        if (columns > columnsMax) {
          columnsMax = columns;
        }
      });

      if (columnsMax < 1) {
        return mdBuffer;
      } else {
        dummyHeader = "|" + " |".repeat(columnsMax);
        dummyDelimiter = "|" + " :--- |".repeat(columnsMax);

        white = mdBuffer.match(vm.syntax.whiteRegex)?.[0] ?? "";

        tableContent = [dummyHeader, dummyDelimiter, ...bodyRows].join("\n");

        if (!mdBuffer.endsWith("|\n\n")) {
          return white + tableContent;
        } else {
          return white + tableContent + "\n\n";
        }
      }
    }

    function collectFencedRanges(text: string): TextRange[] {
      let ranges: TextRange[];
      let fenceMatch;
      let rangeStart;
      let rangeEnd;
      const fencedBlockRegex =
        /(?:^|\n)([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?(?:\n\1\2[ \t]*(?=\n|$))/g;

      ranges = [];

      while ((fenceMatch = fencedBlockRegex.exec(text))) {
        rangeStart = fenceMatch.index;
        rangeEnd = rangeStart + fenceMatch[0].length;
        ranges.push({
          start: rangeStart,
          end: rangeEnd,
        });
      }

      return ranges;
    }

    function isInsideFenced(index: number, ranges: TextRange[]): boolean {
      let i;
      let range;

      if (!ranges || ranges.length === 0) {
        return false;
      }

      for (i = 0; i < ranges.length; i++) {
        range = ranges[i];
        if (!range) {
          continue;
        }
        if (index >= range.start && index < range.end) {
          return true;
        }
      }

      return false;
    }

    function convertTableWithHeader(
      mdBuffer: string,
      headerLine: string,
      lines: string[]
    ): string {
      let white;

      let delimiter;
      let tableContent;

      const headerRow = headerLine;
      const bodyRows = lines.slice(2);

      const headerColumnCount = headerRow.split(vm.syntax.closeRegex).length;

      // Stand-in delimiter and placeholder row so a table shows up while its
      // real delimiter is still arriving. Once closed the table is whatever it
      // is — a header with no rows stays that way, keeping its own alignment.
      if (pending === true && headerColumnCount > 0 && lines.length < 3) {
        white = mdBuffer.match(vm.syntax.whiteRegex)?.[0] ?? "";
        delimiter = "|" + " :--- |".repeat(headerColumnCount - 2);
        tableContent = [headerRow, delimiter, ...bodyRows].join("\n");

        return white + tableContent + "\n|";
      } else {
        return mdBuffer;
      }
    }
  }

  private mdString(
    mdBuffer: string,
    blockType: BlockType,
    pending: boolean
  ): string {
    let baseBuffer;
    let processedBuffer;

    const vm = this;

    if (blockType === "code") {
      return mdBuffer;
    } else {
      processedBuffer = mdBuffer;

      processedBuffer = fixTasklist(processedBuffer);
      processedBuffer = fixPartialEntity(processedBuffer);
      processedBuffer = fixTrailingEscape(processedBuffer);
      processedBuffer = fixPartialMarker(processedBuffer);
      processedBuffer = fixSetext(processedBuffer);
      processedBuffer = fixLinkRefs(processedBuffer);
      processedBuffer = fixMath(processedBuffer);

      baseBuffer = processedBuffer;

      if (blockType !== "table") {
        processedBuffer = fixTempTable(processedBuffer);
        if (processedBuffer !== baseBuffer) {
          return processedBuffer;
        }
      } else {
        // Cell contents are inline markdown too, so balance them before the
        // table is reshaped — afterwards the row layout is settled and a
        // dangling backtick would be left sitting in a cell.
        processedBuffer = fixPartialRow(processedBuffer);
        processedBuffer = fixInlineTokens(processedBuffer);

        return vm.mdTable(processedBuffer, blockType, pending);
      }

      processedBuffer = fixInlineTokens(processedBuffer);

      // Dropping a dangling marker can expose what was sitting behind it — a
      // backslash, or a task marker that is now at the end of the line.
      processedBuffer = fixTrailingEscape(processedBuffer);
      processedBuffer = fixTasklist(processedBuffer);
      processedBuffer = fixPartialMarker(processedBuffer);

      return processedBuffer;
    }

    function fixTasklist(text: string): string {
      const invalidTaskRegex = vm.syntax.invalidTaskRegex;

      return text.replace(invalidTaskRegex, "$1$2");
    }

    // A delimiter row is only a delimiter once its dashes arrive; until then
    // "| :" renders as a cell holding a colon.
    function fixPartialRow(text: string): string {
      let lastLine;
      let lineStart;

      if (!text || text === "" || pending !== true) {
        return text;
      }

      lineStart = text.lastIndexOf("\n");
      lastLine = text.substring(lineStart + 1);

      if (vm.syntax.partialRowRegex.test(lastLine) !== true) {
        return text;
      }

      if (lastLine.indexOf("---") !== -1) {
        return text;
      }

      return text.substring(0, lineStart + 1);
    }

    // "&copy;" is a symbol only once its semicolon lands; until then it reads
    // as a literal ampersand followed by letters.
    function fixPartialEntity(text: string): string {
      if (!text || text === "" || pending !== true) {
        return text;
      }

      return text.replace(vm.syntax.partialEntityRegex, "");
    }

    // A trailing backslash is either escaping the character that has not
    // arrived yet or is a hard line break. Either way it is markup, not text.
    function fixTrailingEscape(text: string): string {
      let i;
      let count;

      if (!text || text === "" || pending !== true) {
        return text;
      }

      // Look past any trailing blank line: a backslash at the end of the last
      // line is the hard-break form, and equally not text.
      i = text.length - 1;

      while (i >= 0 && vm.syntax.blankCharRegex.test(text.charAt(i))) {
        i--;
      }

      count = 0;

      while (i >= 0 && text.charAt(i) === "\\") {
        count++;
        i--;
      }

      if (count % 2 === 0) {
        return text;
      }

      return text.substring(0, i + count) + text.substring(i + count + 1);
    }

    // A list marker with nothing after it yet: "1." reads as the digit 1 until
    // its item text lands, and "- " as a stray dash.
    function fixPartialMarker(text: string): string {
      let lastLine;
      let lineStart;

      if (!text || text === "" || pending !== true) {
        return text;
      }

      lineStart = text.lastIndexOf("\n");
      lastLine = text.substring(lineStart + 1);

      if (vm.syntax.markerOnlyRegex.test(lastLine) === true) {
        return text.substring(0, lineStart + 1);
      }

      // A nested marker opening inside an item — "-   -" — is equally a marker
      // with no item text behind it yet.
      return text.replace(vm.syntax.nestedMarkerRegex, "$1");
    }

    // A bare line of "-" or "=" under a line of text is a setext heading, so a
    // nested list marker turns its own parent into a heading for the instant
    // before the rest of the item arrives. Hold that line back until it says
    // what it is.
    function fixSetext(text: string): string {
      let lastLine;
      let lineStart;
      let previousLine;
      let previousStart;

      if (!text || text === "" || pending !== true) {
        return text;
      }

      lineStart = text.lastIndexOf("\n");

      if (lineStart === -1) {
        return text;
      }

      lastLine = text.substring(lineStart + 1);

      if (vm.syntax.setextRegex.test(lastLine) !== true) {
        return text;
      }

      // Only underlines text: after a blank line the same characters are a
      // thematic break, which is not ambiguous and renders straight away.
      previousStart = text.lastIndexOf("\n", lineStart - 1);
      previousLine = text.substring(previousStart + 1, lineStart);

      if (previousLine.trim() === "") {
        return text;
      }

      return text.substring(0, lineStart + 1);
    }

    // A link only becomes a link when its closing ")" lands. Until then hold it
    // back: streaming "[text](htt" shows raw markup, and GFM autolinks the
    // half-typed URL inside it, producing a live link to a truncated address.
    function fixLinkRefs(text: string): string {
      let i;

      let chunk;
      let chunks;

      let offset;
      let openIndex;
      let linkIndex;

      const tokens = vm.syntax.mathProtectedRegex;

      if (!text || text === "" || pending !== true) {
        return text;
      }

      tokens.lastIndex = 0;
      chunks = text.split(tokens);

      offset = 0;
      openIndex = -1;

      for (i = 0; i < chunks.length; i++) {
        chunk = chunks[i] || "";

        if (i % 2 === 0) {
          linkIndex = findOpenLink(chunk, i === chunks.length - 1, text);

          if (linkIndex !== -1) {
            openIndex = offset + linkIndex;
          }
        }

        offset += chunk.length;
      }

      if (openIndex === -1) {
        return text;
      }

      return text.substring(0, openIndex);
    }

    function findOpenLink(
      chunk: string,
      isTail: boolean,
      fullText: string
    ): number {
      let i;
      let char;
      let next;
      let start;
      let label;
      let labelEnd;
      let closeIndex;

      i = 0;

      while (i < chunk.length) {
        char = chunk.charAt(i);

        if (char === "\\") {
          i += 2;
          continue;
        }

        // "<" opens either an angle autolink or raw HTML. Both read as stray
        // markup until the ">" lands, and GFM autolinks the half-typed URL
        // inside an unfinished one, so hold the whole construct back.
        if (char === "<") {
          next = chunk.charAt(i + 1);

          if (next !== "" && vm.syntax.angleOpenRegex.test(next) !== true) {
            i++;
            continue;
          }

          closeIndex = findUnescaped(chunk, ">", i + 1);

          if (closeIndex === -1) {
            return isTail === true ? i : -1;
          }

          i = closeIndex + 1;
          continue;
        }

        if (char !== "[") {
          i++;
          continue;
        }

        start = i;

        if (i > 0 && chunk.charAt(i - 1) === "!") {
          start = i - 1;
        }

        closeIndex = findUnescaped(chunk, "]", i + 1);

        if (closeIndex === -1) {
          return start;
        }

        // What follows "]" decides whether these brackets are a link at all,
        // so one character past it is still undecided.
        if (closeIndex + 1 >= chunk.length) {
          return isTail === true ? start : -1;
        }

        char = chunk.charAt(closeIndex + 1);

        if (char === "(") {
          closeIndex = findClosingParen(chunk, closeIndex + 2);

          if (closeIndex === -1) {
            return start;
          }

          i = closeIndex + 1;
          continue;
        }

        if (char === "[") {
          labelEnd = findUnescaped(chunk, "]", closeIndex + 2);

          if (labelEnd === -1) {
            return start;
          }

          // A reference link is only a link once its definition has arrived;
          // until then it would stream as "[text][label]". Holding it back
          // also holds back what follows, so a reference whose definition
          // never comes keeps the rest of the block waiting until the block
          // closes — at which point everything renders.
          label = chunk.substring(closeIndex + 2, labelEnd);

          if (hasDefinition(fullText, label) !== true) {
            return start;
          }

          i = labelEnd + 1;
          continue;
        }

        i = closeIndex + 1;
      }

      return -1;
    }

    // Reference labels are case-insensitive, and an empty label ("[text][]")
    // refers back to the link text itself.
    function hasDefinition(fullText: string, label: string): boolean {
      let i;
      let line;
      let lines;
      let needle;

      needle = "[" + label.trim().toLowerCase() + "]:";
      lines = fullText.split("\n");

      for (i = 0; i < lines.length; i++) {
        line = (lines[i] ?? "").trim();

        // The destination has to be there too, or the link still has nowhere
        // to point and remark leaves the whole thing as text.
        if (line.toLowerCase().indexOf(needle) === 0) {
          // The last line is still being written; remark only resolves a
          // definition once the line that holds it has ended.
          if (i === lines.length - 1) {
            continue;
          }

          if (line.substring(needle.length).trim() !== "") {
            return true;
          }
        }
      }

      return false;
    }

    function findUnescaped(
      chunk: string,
      target: string,
      from: number
    ): number {
      let i;
      let char;

      for (i = from; i < chunk.length; i++) {
        char = chunk.charAt(i);

        if (char === "\\") {
          i++;
          continue;
        }

        if (char === target) {
          return i;
        }
      }

      return -1;
    }

    // Link destinations may contain balanced parens, as in "/path(inner)".
    function findClosingParen(chunk: string, from: number): number {
      let i;
      let char;
      let depth;

      depth = 1;

      for (i = from; i < chunk.length; i++) {
        char = chunk.charAt(i);

        if (char === "\\") {
          i++;
          continue;
        }

        if (char === "(") {
          depth++;
          continue;
        }

        if (char === ")") {
          depth--;

          if (depth === 0) {
            return i;
          }
        }
      }

      return -1;
    }

    // Withhold a formula that is still arriving: an unclosed delimiter would
    // otherwise stream through as raw TeX and only snap into KaTeX on close.
    function fixMath(text: string): string {
      let i;

      let chunk;
      let chunks;

      let offset;
      let openIndex;
      let mathIndex;

      const tokens = vm.syntax.mathProtectedRegex;

      if (!text || text === "" || pending !== true) {
        return text;
      }

      tokens.lastIndex = 0;
      chunks = text.split(tokens);

      offset = 0;
      openIndex = -1;

      for (i = 0; i < chunks.length; i++) {
        chunk = chunks[i] || "";

        if (i % 2 === 0) {
          mathIndex = findOpenMath(chunk);

          if (mathIndex !== -1) {
            openIndex = offset + mathIndex;
          }
        }

        offset += chunk.length;
      }

      if (openIndex === -1) {
        return text;
      }

      return text.substring(0, openIndex) + vm.syntax.mathPendingTag;
    }

    function findOpenMath(chunk: string): number {
      let i;

      let char;
      let next;

      let closeIndex;
      let closeToken;

      i = 0;

      while (i < chunk.length) {
        char = chunk.charAt(i);

        if (char === "\\") {
          next = chunk.charAt(i + 1);

          if (next === "(" || next === "[") {
            closeToken = next === "(" ? "\\)" : "\\]";
            closeIndex = chunk.indexOf(closeToken, i + 2);

            if (closeIndex === -1) {
              return i;
            }

            i = closeIndex + closeToken.length;
            continue;
          }

          i += 2;
          continue;
        }

        if (char === "$") {
          if (chunk.charAt(i + 1) === "$") {
            closeIndex = chunk.indexOf("$$", i + 2);

            if (closeIndex === -1) {
              return i;
            }

            i = closeIndex + 2;
            continue;
          }

          next = chunk.charAt(i + 1);

          // remark-math never opens on "$ " — leave prose dollars alone.
          if (next !== "" && vm.syntax.mathSpaceRegex.test(next)) {
            i++;
            continue;
          }

          closeIndex = findInlineClose(chunk, i + 1);

          if (closeIndex === -1) {
            return i;
          }

          i = closeIndex + 1;
          continue;
        }

        i++;
      }

      return -1;
    }

    function findInlineClose(chunk: string, from: number): number {
      let i;
      let char;

      for (i = from; i < chunk.length; i++) {
        char = chunk.charAt(i);

        if (char === "\\") {
          i++;
          continue;
        }

        if (char === "$") {
          return i;
        }
      }

      return -1;
    }

    function fixTempTable(text: string): string {
      if (text.includes("\n\n")) {
        return text;
      }
      const pipeIndex = text.search(vm.syntax.pipeRegex);
      if (pipeIndex === -1) {
        return text;
      }
      return text.substring(0, pipeIndex);
    }

    // Emphasis nests, so the marker that opened last must be closed first:
    // "**_bold" has to become "**_bold_**", never "**_bold**_". Collect every
    // unclosed marker with the offset it opened at, then close in reverse.
    function fixInlineTokens(text: string): string {
      let i;
      let token;
      let passes;
      let result: InlineTokenResult | EmphasisResult;
      let pending: PendingToken[];
      let previous;

      // Dropping one dangling marker can leave the next one dangling, so let
      // the strips settle before deciding what still needs a closer. Deciding
      // too early appends to text that no longer ends the way it did — which
      // is how "**_" once became "****", a thematic break.
      passes = 0;

      do {
        previous = text;

        for (i = 0; i < vm.syntax.inlineTokens.length; i++) {
          text = fixInlineToken(text, vm.syntax.inlineTokens[i] ?? "").text;
        }

        // Emphasis strips belong in the same settling pass: dropping a
        // dangling "**" can leave a "~~" at the end that then has to be
        // dropped too, rather than closed into the fence "~~~~".
        text = fixEmphasis(text).text;

        passes++;
      } while (text !== previous && passes < vm.syntax.inlineTokens.length + 2);

      pending = [];

      for (i = 0; i < vm.syntax.inlineTokens.length; i++) {
        result = fixInlineToken(text, vm.syntax.inlineTokens[i] ?? "");

        if (result.close === true) {
          pending.push(result);
        }
      }

      // "*" and "_" cannot be counted per token: in "**Bold *italic*** the
      // trailing "***" closes both the "*" and the "**" before it. They are
      // matched as delimiter runs instead, the way CommonMark does it.
      result = fixEmphasis(text);
      text = result.text;

      pending.push(...result.pending);

      if (pending.length === 0) {
        return text;
      }

      // An emphasis closer may not be preceded by whitespace, so "**mixed "
      // would close as "**mixed **" and render as literal asterisks. Dropping
      // the trailing blank costs nothing on screen and keeps it emphasis. Code
      // spans have no such rule, and their whitespace is content.
      if (pending.some((item) => vm.syntax.emphasisTokenRegex.test(item.token))) {
        text = text.replace(vm.syntax.trailingSpaceRegex, "");
      }

      pending.sort((a, b) => {
        return b.index - a.index;
      });

      for (i = 0; i < pending.length; i++) {
        token = pending[i]?.token ?? "";

        // Appending onto a run that was already there merges with it: "~" plus
        // "~~" is "~~~", which is a code fence, not strikethrough. That run is
        // dangling anyway, so drop it instead of closing onto it. Only the
        // first closer can hit this — the ones after it meet our own output,
        // where "*" followed by "**" is the intended "***".
        if (i === 0 && text.charAt(text.length - 1) === token.charAt(0)) {
          text = trimTrailingRun(text, token.charAt(0));
          continue;
        }

        text += token;
      }

      return text;
    }

    function trimTrailingRun(text: string, char: string): string {
      let end;

      end = text.length;

      while (end > 0 && text.charAt(end - 1) === char) {
        end--;
      }

      return text.substring(0, end);
    }

    // Every "*" / "_" run in the text, with the flanking flags that decide
    // whether it may open or close emphasis. Runs inside a code span, and a
    // "*" acting as a list bullet, are not delimiters at all.
    function emphasisRuns(text: string): EmphasisRun[] {
      let i;
      let run: EmphasisRun;
      let runs: EmphasisRun[];
      let char: "*" | "_";
      let current;
      let start;
      let after;
      let before;
      let leftFlanking;
      let rightFlanking;
      let canOpen;
      let canClose;

      runs = [];
      i = 0;

      while (i < text.length) {
        current = text.charAt(i);

        if (current === "\\") {
          i += 2;
          continue;
        }

        if (current !== "*" && current !== "_") {
          i++;
          continue;
        }

        char = current;

        start = i;

        while (i < text.length && text.charAt(i) === char) {
          i++;
        }

        if (insideCodeSpan(text, start) === true) {
          continue;
        }

        if (char === "*" && bulletMarker(text, start) === true) {
          continue;
        }

        // Text boundaries count as whitespace for flanking purposes.
        before = start === 0 ? " " : text.charAt(start - 1);
        after = i >= text.length ? " " : text.charAt(i);

        leftFlanking =
          vm.syntax.blankCharRegex.test(after) !== true &&
          (vm.syntax.punctuationRegex.test(after) !== true ||
            vm.syntax.blankCharRegex.test(before) === true ||
            vm.syntax.punctuationRegex.test(before) === true);

        rightFlanking =
          vm.syntax.blankCharRegex.test(before) !== true &&
          (vm.syntax.punctuationRegex.test(before) !== true ||
            vm.syntax.blankCharRegex.test(after) === true ||
            vm.syntax.punctuationRegex.test(after) === true);

        if (char === "*") {
          canOpen = leftFlanking;
          canClose = rightFlanking;
        } else {
          canOpen =
            leftFlanking &&
            (rightFlanking !== true || vm.syntax.punctuationRegex.test(before));
          canClose =
            rightFlanking &&
            (leftFlanking !== true || vm.syntax.punctuationRegex.test(after));
        }

        run = {
          char,
          index: start,
          length: i - start,
          remaining: i - start,
          canOpen,
          canClose,
          canBoth: canOpen === true && canClose === true,
        };

        runs.push(run);
      }

      return runs;
    }

    // CommonMark's "rule of three": when either side can both open and close,
    // the lengths may only sum to a multiple of three if both are.
    function emphasisPairs(
      opener: EmphasisRun | EmphasisOpener,
      closer: EmphasisRun
    ): boolean {
      if (opener.canBoth !== true && closer.canBoth !== true) {
        return true;
      }

      if ((opener.length + closer.length) % 3 !== 0) {
        return true;
      }

      return opener.length % 3 === 0 && closer.length % 3 === 0;
    }

    function insideHtmlBlock(text: string): boolean {
      let start;
      let lineEnd;
      let firstLine;

      start = text.lastIndexOf("\n\n");
      start = start === -1 ? 0 : start + 2;

      lineEnd = text.indexOf("\n", start);
      firstLine =
        lineEnd === -1 ? text.substring(start) : text.substring(start, lineEnd);

      return (
        vm.syntax.htmlBlockStartRegex.test(firstLine) ||
        vm.syntax.htmlBlockTagRegex.test(firstLine)
      );
    }

    function fixEmphasis(text: string): EmphasisResult {
      let i;
      let j;
      let use;
      let run;
      let runs;
      let last;
      let stack: EmphasisOpener[];
      let opener;
      let pending: PendingToken[];
      let remaining: number;

      // A line that is nothing but a tag opens an HTML block, and everything
      // up to the next blank line belongs to it as raw text — emphasis markers
      // in there are literal.
      if (insideHtmlBlock(text) === true) {
        return { text: text, pending: [] };
      }

      runs = emphasisRuns(text);

      // Runs sitting at the very end have nothing to emphasise yet. Dropping
      // one can expose another, as in "**_", so keep going until the text no
      // longer ends in a delimiter.
      while (runs.length > 0) {
        last = runs[runs.length - 1];

        if (!last) {
          break;
        }

        if (last.index + last.length !== text.length) {
          break;
        }

        text = text.substring(0, last.index);
        runs = emphasisRuns(text);
      }

      stack = [];
      pending = [];

      for (i = 0; i < runs.length; i++) {
        run = runs[i];

        if (!run) {
          continue;
        }

        remaining = run.length;

        if (run.canClose === true) {
          j = stack.length - 1;

          while (j >= 0 && remaining > 0) {
            opener = stack[j];

            if (!opener) {
              j--;
              continue;
            }

            if (
              opener.char !== run.char ||
              emphasisPairs(opener, run) !== true
            ) {
              j--;
              continue;
            }

            use = opener.remaining >= 2 && remaining >= 2 ? 2 : 1;

            opener.remaining -= use;
            remaining -= use;

            // Delimiters between the pair are discarded, as CommonMark does.
            stack.length = j + 1;

            if (opener.remaining === 0) {
              stack.pop();
              j = stack.length - 1;
            }
          }
        }

        if (run.canOpen === true && remaining > 0) {
          stack.push({
            char: run.char,
            index: run.index,
            length: run.length,
            canBoth: run.canBoth,
            remaining: remaining,
          });
        }
      }

      for (i = 0; i < stack.length; i++) {
        opener = stack[i];

        if (opener && opener.remaining > 0) {
          pending.push({
            close: true,
            index: opener.index,
            token: opener.char.repeat(opener.remaining),
          });
        }
      }

      return { text: text, pending: pending };
    }

    // Asterisks and underscores inside a code span are literal text, so the
    // emphasis balancing has to leave them alone. An opener with no closer yet
    // covers everything after it, since that is where the span will end up.
    function insideCodeSpan(text: string, index: number): boolean {
      let i;
      let j;
      let runs;
      let opener;
      let closer;
      let candidate;
      let closerRun;

      runs = backtickRuns(text);
      i = 0;

      while (i < runs.length) {
        opener = runs[i];

        if (!opener) {
          break;
        }

        closer = -1;

        for (j = i + 1; j < runs.length; j++) {
          candidate = runs[j];

          if (candidate && candidate.length === opener.length) {
            closer = j;
            break;
          }
        }

        if (closer === -1) {
          return index > opener.index;
        }

        closerRun = runs[closer];

        if (closerRun && index > opener.index && index < closerRun.index) {
          return true;
        }

        i = closer + 1;
      }

      return false;
    }

    // A run of three or more backticks at the start of a line opens a fenced
    // block, not a code span. Balancing it as a span would append a closer and
    // pull the fence marker into the code content.
    function backtickRuns(text: string): BacktickRun[] {
      let i;
      let runs;
      let start;

      if (vm.syntax.fenceLineRegex.test(text)) {
        return [];
      }

      runs = [];
      i = 0;

      while (i < text.length) {
        if (text.charAt(i) !== "`") {
          i++;
          continue;
        }

        start = i;

        while (i < text.length && text.charAt(i) === "`") {
          i++;
        }

        runs.push({ index: start, length: i - start });
      }

      return runs;
    }

    // Code spans are delimited by backtick *runs*, and a run of n only closes
    // on another run of exactly n. Counting lone backticks instead reports an
    // odd count for text like "\`this\`\`" and appends a stray backtick.
    // Pair backtick runs left to right: a run of n closes on the next run of
    // exactly n. Returns which runs got paired and the first that did not.
    function pairBacktickRuns(runs: BacktickRun[]): BacktickPairs {
      let i;
      let j;
      let paired;
      let closerIndex;
      let opener;
      let candidate;

      paired = [];
      i = 0;

      while (i < runs.length) {
        opener = runs[i];

        if (!opener) {
          break;
        }

        closerIndex = -1;

        for (j = i + 1; j < runs.length; j++) {
          candidate = runs[j];

          if (candidate && candidate.length === opener.length) {
            closerIndex = j;
            break;
          }
        }

        if (closerIndex === -1) {
          return { paired: paired, unmatched: i };
        }

        paired[i] = true;
        paired[closerIndex] = true;

        i = closerIndex + 1;
      }

      return { paired: paired, unmatched: -1 };
    }

    function fixCodeSpan(text: string): InlineTokenResult {
      let last;
      let runs;
      let result;
      let opener;

      runs = backtickRuns(text);
      result = pairBacktickRuns(runs);

      // A trailing run that closes nothing is the start of content still on
      // its way. Drop it, or the closer appended below would merge into it and
      // "`` `" would become five backticks instead of an empty code span.
      if (runs.length > 0) {
        last = runs[runs.length - 1];

        if (
          last &&
          last.index + last.length === text.length &&
          result.paired[runs.length - 1] !== true
        ) {
          text = text.substring(0, last.index);
          runs = backtickRuns(text);
          result = pairBacktickRuns(runs);
        }
      }

      if (result.unmatched === -1) {
        return { text: text, token: "`", close: false, index: -1 };
      }

      opener = runs[result.unmatched];

      if (!opener) {
        return { text: text, token: "`", close: false, index: -1 };
      }

      return {
        text: text,
        token: "`".repeat(opener.length),
        close: true,
        index: opener.index,
      };
    }

    function fixInlineToken(text: string, token: string): InlineTokenResult {
      let regex;
      let edgeRegex;
      let matches;
      let lastIndex;
      let tokenCount;
      let tokenLength;
      let inlineTokenRegexCache;
      let inlineTokenEdgeRegexCache;
      let char;
      let escapedChar;
      let escapedToken;

      if (token === "`") {
        return fixCodeSpan(text);
      }

      inlineTokenRegexCache = vm.inlineTokenRegexCache;
      inlineTokenEdgeRegexCache = vm.inlineTokenEdgeRegexCache;

      regex = inlineTokenRegexCache.get(token);
      edgeRegex = inlineTokenEdgeRegexCache.get(token);

      if (!regex || !edgeRegex) {
        char = token.charAt(0);
        escapedChar = char.replace(vm.syntax.escapedChar, "\\$&");
        escapedToken = token.replace(vm.syntax.escapedChar, "\\$&");

        // Escaping is decided by escapedMarker below, which counts the
        // backslashes: in "\\\\~" the backslash is itself escaped, so the
        // tilde is not, and a lookbehind of one character gets that wrong.
        regex = new RegExp(
          `(?<!${escapedChar})${escapedToken}(?!${escapedChar})`,
          "g"
        );
        edgeRegex = new RegExp(`^${escapedToken}\\W*$`);

        inlineTokenRegexCache.set(token, regex);
        inlineTokenEdgeRegexCache.set(token, edgeRegex);
      }

      if (regex.global) {
        regex.lastIndex = 0;
      }

      tokenCount = 0;
      lastIndex = -1;
      tokenLength = token.length;

      // "*" is also a list bullet, and asterisks inside a code span are text
      // rather than emphasis, so neither kind counts here.
      while ((matches = regex.exec(text))) {
        if (insideCodeSpan(text, matches.index) === true) {
          continue;
        }

        if (escapedMarker(text, matches.index) === true) {
          continue;
        }

        if (token !== "*" || bulletMarker(text, matches.index) !== true) {
          tokenCount++;
          lastIndex = matches.index;
        }
      }

      if (edgeRegex.test(text)) {
        if (token === "*" && bulletMarker(text, 0) === true) {
          return { text: text, token: token, close: false, index: -1 };
        }
        return {
          text: text.substring(tokenLength),
          token: token,
          close: false,
          index: -1,
        };
      }

      if (tokenCount % 2 !== 0) {
        if (text.endsWith(token)) {
          return {
            text: text.slice(0, -tokenLength),
            token: token,
            close: false,
            index: -1,
          };
        }

        return { text: text, token: token, close: true, index: lastIndex };
      }

      return { text: text, token: token, close: false, index: -1 };
    }

    // A marker is escaped only when an odd number of backslashes precedes it.
    function escapedMarker(text: string, index: number): boolean {
      let i;
      let count;

      count = 0;
      i = index - 1;

      while (i >= 0 && text.charAt(i) === "\\") {
        count++;
        i--;
      }

      return count % 2 === 1;
    }

    // A "*" that opens a list item: line start, optional indent, then a space.
    // While the character after it is still unknown, assume a bullet — that
    // way a nascent list is never rewritten into emphasis.
    function bulletMarker(text: string, index: number): boolean {
      let i;
      let next;

      i = index - 1;

      while (i >= 0 && (text.charAt(i) === " " || text.charAt(i) === "\t")) {
        i--;
      }

      if (i >= 0 && text.charAt(i) !== "\n") {
        return false;
      }

      next = text.charAt(index + 1);

      return next === "" || next === " " || next === "\t";
    }
  }

  private mdReference(mdBuffer: string, _blockType: BlockType): void {
    let refKeys;
    let refString;

    let defValues;
    let defString;

    const vm = this;

    const footnotes = mdBuffer.match(vm.syntax.footnoteRegex);

    if (footnotes) {
      const footnoteDefinitions = mdBuffer.match(vm.syntax.footnoteDefRegex);

      if (footnoteDefinitions) {
        footnotes.forEach((footnote) => {
          footnoteDefinitions.forEach((footnoteDef) => {
            if (footnoteDef.trim().startsWith(footnote)) {
              vm.footnotes.set(footnote, footnoteDef);
            }
          });
        });
      }

      if (vm.footnotes.size > 0) {
        refKeys = Array.from(vm.footnotes.keys());
        refString = refKeys.join(" "); // Join with spaces

        defValues = Array.from(vm.footnotes.values());
        defString = defValues.join("\n");

        vm.footnoteBuffer = refString + "\n\n" + defString;
      }
    }
  }

  private mdCloseObject(mdBuffer: string, blockType: BlockType): CloseObject {
    let refClose;
    let lineClose;
    let hrRuleClose;
    let codeBlockClose;
    let doubleLineClose;

    const vm = this;
    const doubleLine = "\n\n";

    const hrRegex = vm.syntax.hrCloseRegex;
    const fencedCodeRegex = vm.syntax.fencedCloseRegex;
    const indentedCodeRegex = vm.syntax.indentedCodeRegex;

    if (blockType === "text") {
      mdBuffer = mapNotes(mdBuffer, blockType);

      refClose = getRefClose(mdBuffer, blockType);
      if (refClose) {
        return refClose;
      }

      lineClose = getLineClose(mdBuffer, blockType);
      if (lineClose) {
        return lineClose;
      }

      hrRuleClose = getHrRuleClose(mdBuffer, blockType, hrRegex);
      if (hrRuleClose) {
        return hrRuleClose;
      }

      doubleLineClose = getDoubleLineClose(mdBuffer, blockType, doubleLine);
      if (doubleLineClose) {
        return doubleLineClose;
      }

      codeBlockClose = getCodeBlockClose(mdBuffer, blockType, {
        fencedCodeRegex,
        indentedCodeRegex,
      });
      if (codeBlockClose) {
        return codeBlockClose;
      }

      return {
        close: false,
        md: mdBuffer,
        mdClose: "",
        mdNext: "",
      };
    }

    if (blockType === "code") {
      codeBlockClose = getCodeBlockClose(mdBuffer, blockType, {
        fencedCodeRegex,
        indentedCodeRegex,
      });

      if (codeBlockClose) {
        return codeBlockClose;
      }

      return {
        close: false,
        md: mdBuffer,
        mdClose: "",
        mdNext: "",
      };
    }

    if (blockType === "table") {
      mdBuffer = mapNotes(mdBuffer, blockType);
      doubleLineClose = getDoubleLineClose(mdBuffer, blockType, doubleLine);
      if (doubleLineClose) {
        return doubleLineClose;
      }

      return {
        close: false,
        md: mdBuffer,
        mdClose: "",
        mdNext: "",
      };
    }

    return {
      close: false,
      md: mdBuffer,
      mdClose: "",
      mdNext: "",
    };

    function mapNotes(mdBuffer: string, blockType: BlockType): string {
      let id;
      let seen: Record<string, true>;

      let match;
      let matches;

      let definition;

      if (blockType === "code") {
        return mdBuffer;
      } else {
        matches = mdBuffer.match(vm.syntax.footnoteRegex);
        if (!matches) {
          return mdBuffer;
        } else {
          seen = {};
          for (match of matches) {
            if (!seen[match]) {
              seen[match] = true;
              if (!vm.footnotes.has(match)) {
                id = match.substring(2, match.length - 1);
                definition = `${match}: ${id}`;
                vm.mdExtra.set(match, definition);
              }
            }
          }

          return mdBuffer;
        }
      }
    }

    function getRefClose(
      mdBuffer: string,
      blockType: BlockType
    ): CloseObject | undefined | null {
      if (blockType === "code") {
        return null;
      } else {
        const usageMatch = mdBuffer.match(vm.syntax.refRegex);
        const definitionMatch = mdBuffer.match(vm.syntax.definitionRegex);

        const hasUsage = Array.isArray(usageMatch) && usageMatch.length > 0;
        const hasDefinition =
          Array.isArray(definitionMatch) && definitionMatch.length > 0;

        if (hasUsage === true && hasDefinition !== true) {
          return {
            close: false,
            md: mdBuffer,
            mdClose: "",
            mdNext: "",
          };
        }
      }

      return undefined;
    }

    function getLineClose(
      mdBuffer: string,
      _blockType: BlockType
    ): CloseObject | undefined {
      let closeIndex;

      const singleLine = "\n";
      const doubleLine = "\n\n";

      if (mdBuffer.startsWith(singleLine)) {
        // if the next character is not is a hr character [-_*]
        if (mdBuffer[2] !== "-" && mdBuffer[2] !== "_" && mdBuffer[2] !== "*") {
          if (mdBuffer.startsWith(doubleLine) !== true) {
            return {
              close: true,
              md: mdBuffer.substring(0, singleLine.length),
              mdNext: mdBuffer.substring(singleLine.length),
              mdClose: singleLine,
            };
          }
        }
      } else {
        closeIndex = mdBuffer.indexOf(singleLine);
        if (closeIndex !== -1) {
          if (mdBuffer[closeIndex + 2] === singleLine) {
            if (
              mdBuffer[closeIndex + singleLine.length + 1] === "-" ||
              mdBuffer[closeIndex + singleLine.length + 1] === "_" ||
              mdBuffer[closeIndex + singleLine.length + 1] === "*"
            ) {
              return {
                close: true,
                md: mdBuffer.substring(0, closeIndex + 1),
                mdNext: mdBuffer.substring(closeIndex + 1),
                mdClose: singleLine,
              };
            }
          }

          // A new bullet used to close the block here, which rendered every
          // item of a tight list as its own <ul>. The list stays in one block
          // now; its settled items are cached so that costs nothing.
        }
      }

      return undefined;
    }

    function getHrRuleClose(
      mdBuffer: string,
      _blockType: BlockType,
      hrRegex: RegExp
    ): CloseObject | null {
      const match = mdBuffer.match(hrRegex);
      if (match) {
        const hrString = match[0];
        const startIndex = match.index ?? 0;
        const endIndex = startIndex + hrString.length;

        return {
          close: true,
          md: mdBuffer.substring(0, endIndex),
          mdNext: mdBuffer.substring(endIndex),
          mdClose: hrString,
        };
      }
      return null;
    }

    function getDoubleLineClose(
      mdBuffer: string,
      _blockType: BlockType,
      doubleLine: string
    ): CloseObject | undefined {
      let closeTag;
      let closeIndex;
      let closeEndIndex;

      // A blank line does not end a loose list, so the block has to stay open
      // across it — for ordered markers as much as for bullets. It must still
      // end where the list does, though: holding it open unconditionally makes
      // one block swallow the rest of the document.
      if (vm.syntax.listItemRegex.test(mdBuffer) === true) {
        closeIndex = mdBuffer.indexOf(doubleLine);

        while (closeIndex !== -1) {
          closeEndIndex = closeIndex + doubleLine.length;

          if (listContinues(mdBuffer.substring(closeEndIndex)) !== true) {
            return {
              close: true,
              md: mdBuffer.substring(0, closeEndIndex),
              mdNext: mdBuffer.substring(closeEndIndex),
              mdClose: doubleLine,
            };
          }

          closeIndex = mdBuffer.indexOf(doubleLine, closeIndex + 1);
        }

        // No blank line ends this list, but something else still might — a
        // fence opening on the next line, say. Fall through rather than
        // declaring the block open, or that check never runs.
        return undefined;
      }

      closeTag = doubleLine;
      closeIndex = mdBuffer.lastIndexOf(closeTag);
      closeEndIndex = closeIndex + closeTag.length;
      if (closeIndex !== -1) {
        // An indented block after a definition is that definition's second
        // paragraph, not a code block, so the two must stay together.
        if (definitionContinues(mdBuffer, closeIndex, closeEndIndex) === true) {
          return {
            close: false,
            md: mdBuffer,
            mdClose: "",
            mdNext: "",
          };
        }

        return {
          close: true,
          md: mdBuffer.substring(0, closeEndIndex),
          mdNext: mdBuffer.substring(closeEndIndex),
          mdClose: closeTag,
        };
      }

      return undefined;
    }

    function definitionContinues(
      mdBuffer: string,
      closeIndex: number,
      closeEndIndex: number
    ): boolean {
      let rest;
      let lineStart;
      let lastLine;

      rest = mdBuffer.substring(closeEndIndex);

      // Whitespace alone is undecided: the indent may still be arriving.
      if (
        vm.syntax.indentedRegex.test(rest) !== true &&
        vm.syntax.blankOnlyRegex.test(rest) !== true
      ) {
        return false;
      }

      lineStart = mdBuffer.lastIndexOf("\n", closeIndex - 1);
      lastLine = mdBuffer.substring(lineStart + 1, closeIndex);

      return vm.syntax.definitionLineRegex.test(lastLine);
    }

    // After a blank line a list carries on only if what follows is another
    // item or an indented continuation. A marker that is still arriving counts
    // as carrying on, so the list is never cut in half mid-bullet.
    function listContinues(rest: string): boolean {
      if (rest === "") {
        return true;
      }

      if (vm.syntax.listPartialRegex.test(rest)) {
        return true;
      }

      // A fenced block indented under an item opens its own block, the way it
      // did before lists were held open across blank lines. Swallowing it here
      // leaves the fence sitting inside a paragraph.
      if (vm.syntax.indentedFenceRegex.test(rest) === true) {
        return false;
      }

      return vm.syntax.listItemRegex.test(rest) || vm.syntax.listIndentRegex.test(rest);
    }

    function getCodeBlockClose(
      mdBuffer: string,
      blockType: BlockType,
      codeRegexConfig: CodeRegexConfig
    ): CloseObject | undefined {
      let match;
      let ended;

      let matchIndex;
      let matchCount;
      let matchStart;
      let matchFinal;

      const fencedCodeRegex = codeRegexConfig.fencedCodeRegex;
      const indentedCodeRegex = codeRegexConfig.indentedCodeRegex;

      if (blockType === "text") {
        const interruptionMatch = mdBuffer.match(vm.syntax.interuptRegex);

        if (interruptionMatch) {
          const mdCloseEndIndex = (interruptionMatch.index ?? 0) + 1; // End at \n
          return {
            close: true,
            md: mdBuffer.substring(0, mdCloseEndIndex),
            mdNext: mdBuffer.substring(mdCloseEndIndex),
            mdClose: "\n",
          };
        }

        match = mdBuffer.match(indentedCodeRegex);
        if (match) {
          matchStart = match.index ?? 0;
          matchFinal = matchStart + match[0].length;
          return {
            close: true,
            md: mdBuffer.substring(0, matchFinal),
            mdNext: mdBuffer.substring(matchFinal),
            mdClose: mdBuffer.substring(matchStart, matchFinal),
          };
        }

        return {
          close: false,
          md: mdBuffer,
          mdClose: "",
          mdNext: "",
        };
      }

      if (blockType === "code") {
        match = mdBuffer.match(fencedCodeRegex);
        if (match) {
          matchCount = match.length;
          if (matchCount === 1) {
            return {
              close: false,
              md: mdBuffer,
              mdClose: "",
              mdNext: "",
            };
          } else {
            matchStart = match.index ?? 0;
            matchFinal = matchStart + match[0].length;

            const remainder = mdBuffer.substring(matchFinal);

            if (remainder.startsWith("\n")) {
              const mdCloseEndIndex = matchFinal + 1;
              return {
                close: true,
                md: mdBuffer.substring(0, mdCloseEndIndex),
                mdNext: mdBuffer.substring(mdCloseEndIndex),
                mdClose: "\n",
              };
            }

            if (remainder.startsWith("\n\n")) {
              const mdCloseEndIndex = matchFinal + 2;
              return {
                close: true,
                md: mdBuffer.substring(0, mdCloseEndIndex),
                mdNext: mdBuffer.substring(mdCloseEndIndex),
                mdClose: "\n\n",
              };
            }

            return {
              close: false,
              md: mdBuffer,
              mdClose: "",
              mdNext: "",
            };
          }
        }

        match = mdBuffer.match(indentedCodeRegex);
        if (match) {
          matchCount = match.length;
          matchIndex = mdBuffer.indexOf(doubleLine);
          if (matchIndex !== -1) {
            return {
              close: true,
              md: mdBuffer.substring(0, matchIndex),
              mdNext: mdBuffer.substring(matchIndex),
              mdClose: mdBuffer.substring(matchIndex),
            };
          }

          ended = indentedCodeBlockEnd(mdBuffer);
          if (ended.close) {
            return {
              close: true,
              md: ended.md,
              mdClose: ended.mdClose,
              mdNext: ended.mdNext,
            };
          }
        }
      }

      return undefined;
    }

    function indentedCodeBlockEnd(mdBuffer: string): CloseObject {
      const lines = mdBuffer.split("\n");
      let blockLineCount = 0;

      for (const line of lines) {
        const isBlank = vm.syntax.blankRegex.test(line);
        const isIndented = vm.syntax.indentedRegex.test(line);

        if (isBlank || isIndented) {
          blockLineCount++;
        } else {
          break;
        }
      }

      if (blockLineCount === lines.length) {
        return {
          close: false,
          md: mdBuffer,
          mdClose: "",
          mdNext: "",
        };
      }

      const blockContent = lines.slice(0, blockLineCount).join("\n");
      const mdCloseEndIndex = blockContent.length;

      return {
        close: true,
        md: mdBuffer.substring(0, mdCloseEndIndex),

        mdClose: "\n",
        mdNext: mdBuffer.substring(mdCloseEndIndex),
      };
    }
  }

  private generateCachedData(): ReactNode {
    const vm = this;
    if (!vm.cachedData) {
      return null;
    } else {
      return vm.cachedData.map((item) => (
        <Fragment key={item.key}>{item.element}</Fragment>
      ));
    }
  }

  private generateStreamData(): ReactNode {
    const vm = this;
    if (!vm.streamData) {
      return null;
    } else {
      return vm.streamData.map((item) => (
        <Fragment key={item.key}>{item.element}</Fragment>
      ));
    }
  }

  private generateFootnoteData(): ReactNode {
    let i;
    let iCount;

    let processor;

    let footnotes;

    const vm = this;
    const state = vm.state;

    if (vm.footnoteBuffer === "") {
      return null;
    } else {
      if (vm.footnoteBuffer === vm.footnoteBufferProcessed) {
        return vm.cachedFootnotes;
      } else {
        if (state.animation !== true) {
          processor = vm.processorFootnote();
        } else {
          processor = vm.processorFootnoteAnimation();
        }

        footnotes = processor.processSync(vm.footnoteBuffer).result;

        if (footnotes && footnotes.props.children) {
          for (
            i = 0, iCount = footnotes.props.children.length;
            i < iCount;
            i++
          ) {
            if (footnotes.props.children[i]?.type === "section") {
              vm.cachedFootnotes = footnotes.props.children[i];
            }
          }
        }

        vm.footnoteBufferProcessed = vm.footnoteBuffer;
        return vm.cachedFootnotes;
      }
    }
  }

  render(): ReactElement {
    const vm = this;
    const cachedData = vm.generateCachedData();
    const streamData = vm.generateStreamData();
    const footnoteData = vm.generateFootnoteData();

    return (
      <>
        {cachedData}
        {streamData}
        {footnoteData}
      </>
    );
  }
}

export default Store;
