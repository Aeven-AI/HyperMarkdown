import React, {
  Fragment,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";

import * as runtime from "./runtime";

import MarkdownCode from "./code";
import MarkdownTable from "./table";

import { patterns } from "./patterns";
import { convertMath } from "./math-notation";
import { createProcessor } from "./processors";
import type { SafetyOptions } from "./processors";

import { resolveUi } from "./config";
import type { UiConfig } from "./config";

import type { PluginConfig } from "./plugin-types";
import { cellComponents, createComponents } from "./components";
import { collectReferences } from "./stream/references";
import { CodeCache } from "./cache/code";
import { ListCache } from "./cache/list";
import { TableCache } from "./cache/table";
import { createInlineCaches } from "./repair/inline-tokens";
import { processInlineSyntax } from "./repair/process-inline-syntax";
import { repairTableSyntax } from "./repair/tables";
import { definitionsOnly } from "./stream/definitions";
import { detectBlockType } from "./stream/detect-block-type";
import { findBlockBoundary } from "./stream/find-block-boundary";
import { listCacheable } from "./stream/list-structure";

import type {
  BlockBoundary,
  BlockType,
  CacheType,
  ProcessorType,
  RenderBlock,
  RendererFileData,
  RendererOptions,
  RendererState,
} from "./types";

class Renderer {
  /** Read by the component maps in components.tsx as well as by the renderer. */
  options: RendererOptions;
  private listeners = new Set<() => void>();

  /** setState-style callbacks waiting for the host's next commit. */
  private pending: Array<() => void> = [];

  /** Bumped on every update, so a subscriber can tell something changed. */
  private versionValue = 0;

  private state: RendererState;
  private mdState: string[] | null;
  private blockType: BlockType | null;
  private buffering: boolean | null;
  private cachedFootnotes: ReactElement | null;
  private mdBuffer: string;
  private footnoteBuffer: string;
  private footnoteBufferProcessed: string;
  private streamData: RenderBlock[];
  private cachedData: RenderBlock[];
  private blockId: number;
  private mdExtra: Map<string, string>;
  private footnotes: Map<string, string>;
  private streamDataMap: Map<number, RenderBlock>;
  /** Where this renderer's own blocks report fullscreen and alerts. */
  readonly events = new runtime.Emitter();

  /** The optional stages — maths, highlighting, diagrams — the host supplied. */
  private readonly plugins: PluginConfig;

  /** What the pipelines let through from untrusted markdown. */
  private readonly safety: SafetyOptions;

  /** Strings, icons, toolbar buttons and sizing, resolved once. */
  readonly ui: UiConfig;

  private inlineCaches = createInlineCaches();

  // One cache per kind of block. Only one is ever active at a time, but each
  // keeps its own state so none has to know about the others.
  private codeCache = new CodeCache();
  private tableCache = new TableCache();
  private listCache = new ListCache();
  private components!: ReturnType<typeof createComponents>;
  private processor!: ReturnType<typeof createProcessor>;
  private processorStream!: ReturnType<typeof createProcessor>;
  private processorAnimation!: ReturnType<typeof createProcessor>;
  private processorTableCache!: ReturnType<typeof createProcessor>;
  private processorTableCacheAnimation!: ReturnType<typeof createProcessor>;
  private processorFootnote!: ReturnType<typeof createProcessor>;
  private processorFootnoteAnimation!: ReturnType<typeof createProcessor>;

  constructor(options: RendererOptions = {}) {
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

    this.cachedFootnotes = null;

    this.mdBuffer = "";
    this.footnoteBuffer = "";
    this.footnoteBufferProcessed = "";

    this.streamData = [];
    this.cachedData = [];

    this.blockId = 0;

    this.mdExtra = new Map();
    this.footnotes = new Map();
    this.streamDataMap = new Map();

    this.streamMd = this.streamMd.bind(this);
    this.processMd = this.processMd.bind(this);
    this.processCacheMd = this.processCacheMd.bind(this);

    this.streamText = this.streamText.bind(this);
    this.streamCode = this.streamCode.bind(this);
    this.streamTable = this.streamTable.bind(this);

    this.setMdState = this.setMdState.bind(this);
    this.initializeCache = this.initializeCache.bind(this);

    this.generateCachedData = this.generateCachedData.bind(this);
    this.generateStreamData = this.generateStreamData.bind(this);

    // rehype-react keys elements by the identity of the component it was given,
    // so a map rebuilt per processor makes the same block look like a different
    // component each time it moves between processors — which remounts it,
    // dropping fullscreen and restarting its animations. One map, built once.
    this.plugins = options.plugins ?? {};
    this.ui = resolveUi(options);
    this.safety = {
      sanitize: options.sanitize,
      allowedTags: options.allowedTags,
      linkSafety: options.linkSafety,
    };
    this.components = createComponents(this);

    const build = (type: ProcessorType) =>
      createProcessor(type, this.components, this.plugins, this.safety);

    this.processor = build("regular");
    this.processorStream = build("regular-stream");
    this.processorAnimation = build("regular-animation");

    this.processorTableCache = build("cached-table");
    this.processorTableCacheAnimation = build("cached-table-animation");

    this.processorFootnote = build("footnote");
    this.processorFootnoteAnimation = build("footnote-animation");

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
  setOptions(next: Partial<RendererOptions>): void {
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
  private resetLineCache(): void {
    this.codeCache.reset();
    this.tableCache.reset();
    this.listCache.reset();
  }

  // Components a table cell may contain. Kept narrow on purpose: a cell can
  // hold a link, an image or a mermaid ref, but never a nested table or fence.
  private initializeCache(state: RendererState): RenderBlock[] {
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
      md = repairTableSyntax(md, "renderer", false);

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
    finalize: boolean,
  ): void {
    let mdState;
    let blockType: BlockType;

    const vm = this;

    mdState = vm.setMdState(md);

    if (md && md !== "") {
      vm.mdBuffer += md;

      if (!vm.blockType) {
        blockType = detectBlockType(vm.mdBuffer, finalize);
      } else {
        blockType = vm.blockType;

        // A block typed from its first characters can still turn out to open a
        // fence — "`" alone reads as text until the other two backticks land.
        if (
          blockType === "text" &&
          patterns.fencedCodeRegex.test(vm.mdBuffer)
        ) {
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
    finalize: boolean,
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

      blockType = vm.blockType || detectBlockType(vm.mdBuffer, finalize);

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
    finalize: boolean,
  ): void {
    let pending;
    let mdBuffer;
    let closeObject;
    let buffering;

    const vm = this;

    const references = collectReferences(vm.mdBuffer, vm.footnotes);

    if (references !== null) {
      vm.footnoteBuffer = references;
    }
    closeObject = findBlockBoundary(vm.mdBuffer, blockType, {
      footnotes: vm.footnotes,
      mdExtra: vm.mdExtra,
    });

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

      blockType = detectBlockType(closeObject.md, finalize);

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
      mdBuffer = processInlineSyntax(
        mdBuffer,
        blockType,
        pending,
        vm.inlineCaches,
      );
      vm.streamText(
        mdBuffer,
        mdState,
        vm.blockId,
        closeObject,
        streaming,
        animation,
      );
      return;
    }

    if (blockType === "code") {
      mdBuffer = processInlineSyntax(
        mdBuffer,
        blockType,
        pending,
        vm.inlineCaches,
      );
      vm.streamCode(
        mdBuffer,
        mdState,
        vm.blockId,
        closeObject,
        streaming,
        animation,
      );
      return;
    }

    if (blockType === "table") {
      mdBuffer = processInlineSyntax(
        mdBuffer,
        blockType,
        pending,
        vm.inlineCaches,
      );
      vm.streamTable(
        mdBuffer,
        mdState,
        vm.blockId,
        closeObject,
        streaming,
        animation,
      );
    }
  }

  private streamText(
    mdBuffer: string,
    mdState: string[],
    blockId: number,
    closeObject: BlockBoundary,
    streaming: boolean,
    animation: boolean,
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
      if (listCacheable(mdBuffer) === true) {
        vm.processCacheMd(mdBuffer, "list", animation);
        processedData = vm.listElement();

        if (!processedData) {
          processedData = vm.processMd(mdBuffer, streaming, animation);
        }
      } else {
        vm.listCache.invalidate();
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
          },
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
    type: ElementType,
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
      (node.props as { children?: React.ReactNode }).children,
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
    closeObject: BlockBoundary,
    streaming: boolean,
    animation: boolean,
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
            },
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
        vm.processCacheMd(mdBuffer, "code", animation);

        codeElement = (
          <code
            className={
              vm.codeCache.language ? `language-${vm.codeCache.language}` : ""
            }
          >
            {vm.codeCache.data}
          </code>
        );

        processedData = (
          <MarkdownCode
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
          vm.processCacheMd(mdBuffer, "code", animation);

          codeElement = (
            <code
              className={
                vm.codeCache.language ? `language-${vm.codeCache.language}` : ""
              }
            >
              {vm.codeCache.data}
            </code>
          );

          if (closedCodeBlock) {
            preChildren = closedCodeBlock.props.children;
          }

          processedData = (
            <MarkdownCode
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

    rows = vm.tableCache.data.filter((row) => row);

    return (
      <MarkdownTable
        stream={stream}
        renderer={vm}
        scrollDown={vm.options.scrollDown}
      >
        <thead>{vm.tableCache.head}</thead>
        {rows.length > 0 ? <tbody>{vm.tableCache.data}</tbody> : null}
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

    items = vm.listCache.data.filter((item) => item);

    if (items.length === 0) {
      return null;
    }

    marker = (vm.listCache.itemText[0] || "").match(patterns.listMarkerRegex);
    ordered = marker ? /\d/.test(marker[1] ?? "") : false;

    className = items.some((item) => {
      let itemClass;

      if (!React.isValidElement<{ className?: string | string[] }>(item)) {
        return false;
      }

      itemClass = item.props.className;
      return (
        (Array.isArray(itemClass) &&
          itemClass.indexOf("task-list-item") !== -1) ||
        (typeof itemClass === "string" && itemClass.includes("task-list-item"))
      );
    })
      ? "contains-task-list"
      : undefined;

    if (ordered !== true) {
      return <ul className={className}>{vm.listCache.data}</ul>;
    }

    start = parseInt(marker?.[1] ?? "1", 10);

    return (
      <ol className={className} start={start === 1 ? undefined : start}>
        {vm.listCache.data}
      </ol>
    );
  }

  private streamTable(
    mdBuffer: string,
    mdState: string[],
    blockId: number,
    closeObject: BlockBoundary,
    streaming: boolean,
    animation: boolean,
  ): void {
    let key;

    let block;
    let blockItem;

    let timeNow;

    let processedData;

    const vm = this;

    timeNow = runtime.timeNow();

    if (closeObject.close !== true) {
      vm.processCacheMd(mdBuffer, "table", animation);

      // Fall back to a whole-buffer parse until the header row is cacheable —
      // a headless table has none until mdTable has synthesised one.
      if (vm.tableCache.head) {
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
          },
        );
      }
    } else {
      vm.buffering = false;

      // Close from the same cache the streaming frames were built from. Handing
      // React a differently shaped tree here — rehype-react's wrapper instead
      // of MarkdownTable — remounts the whole table, and with animation on
      // every cell restarts its fade.
      vm.processCacheMd(mdBuffer, "table", animation);

      if (vm.tableCache.head) {
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
  private processMd(
    md: string,
    streaming: boolean,
    animation: boolean,
    data: RendererFileData = {},
  ): ReactNode {
    let file;
    let processor;

    let mdExtraString: string;

    const vm = this;

    if (!md || md === "") {
      return null;
    } else if (definitionsOnly(md) === true) {
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

  /** Feed a still-arriving block to the cache that knows how to render it. */
  private processCacheMd(
    md: string,
    type: CacheType,
    animation: boolean,
  ): void {
    const vm = this;

    if (type === "code") {
      vm.codeCache.append(md, animation);
      return;
    }

    const processorCache =
      animation !== true
        ? vm.processorTableCache()
        : vm.processorTableCacheAnimation();

    if (type === "table") {
      vm.tableCache.append(md, processorCache, cellComponents(vm));
      return;
    }

    if (type === "list") {
      vm.listCache.append(md, processorCache, cellComponents(vm));
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

  private mdMath(mdBuffer: string, blockType: string): string {
    return convertMath(mdBuffer, blockType) ?? "";
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

    const className = vm.options.className;

    // Blocks are rendered into a fragment, so what the host laid out around
    // them is what surrounds them. A className is the one reason to introduce
    // a wrapper, so it only appears when one is asked for.
    if (className) {
      return (
        <div className={className}>
          {cachedData}
          {streamData}
          {footnoteData}
        </div>
      );
    }

    return (
      <>
        {cachedData}
        {streamData}
        {footnoteData}
      </>
    );
  }
}

export default Renderer;
