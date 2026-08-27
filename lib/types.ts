import type { ReactNode } from "react";
import type { Data } from "vfile";

import type { PluginConfig } from "./plugin-types";
import type { AllowedTags, LinkSafetyConfig } from "./sanitize";
import type { UiOptions } from "./config";

/** How a block of streamed markdown is classified while it is still arriving. */
export type BlockType = "text" | "code" | "table" | "reasoning" | "pending";

/** The kinds of block that render from a sub-block cache instead of a reparse. */
export type CacheType = "code" | "table" | "list";

/** The unified pipelines the renderer keeps built and ready. */
export type ProcessorType =
  | "regular"
  | "regular-stream"
  | "regular-animation"
  | "cached-table"
  | "cached-table-animation"
  | "footnote"
  | "footnote-animation";

/** What the renderer tells its subscribers about, on every update. */
export interface RendererState {
  md: string | null;
  streaming: boolean | null;
  animation: boolean | null;
}

/** One rendered block, kept by key so re-renders reuse rather than rebuild it. */
export interface RenderBlock {
  key: number;
  time: number;
  element: ReactNode;
}

/**
 * Where a block ends in the buffer.
 *
 * `md` is the block itself, `mdClose` the delimiter that ended it, and
 * `mdNext` whatever follows and belongs to the block after this one. When
 * `close` is false the block is still open and `md` is what can be shown so
 * far.
 */
export interface BlockBoundary {
  close: boolean;
  md: string;
  mdClose: string;
  mdNext: string;
}

/** Props the rehypeData plugin stamps onto every element of a given tag. */
export interface RehypeTagProps {
  [tagName: string]: Record<string, unknown>;
}

/** The vfile data the renderer's own plugins read. */
export interface RendererFileData extends Data {
  rehypeData?: RehypeTagProps;
}

export interface RendererOptions extends UiOptions {
  /**
   * The optional stages: maths, syntax highlighting, diagrams. Anything not
   * supplied is simply not part of the pipeline — see PluginConfig.
   */
  plugins?: PluginConfig | undefined;
  /**
   * Turn sanitization off. Raw HTML in the markdown then reaches the DOM as
   * written — only ever do this for content you produced yourself.
   */
  sanitize?: boolean | undefined;
  /** Extra tags and attributes to let through sanitization. */
  allowedTags?: AllowedTags | undefined;
  /** Where links and images are allowed to point. */
  linkSafety?: LinkSafetyConfig | undefined;
  /**
   * Somewhere else to put reasoning blocks.
   *
   * By default a model's reasoning renders where it appeared, inside this
   * component. A host that wants it elsewhere — above the message rather than
   * inside it — passes the element it should go into, or a function returning
   * one. Returning null renders it in place, so the callback can be handed a
   * ref that is not populated on the first pass.
   */
  reasoningTarget?: HTMLElement | null | (() => HTMLElement | null) | undefined;
  /**
   * Class for a wrapping element. Supplying one introduces a `<div>` around
   * the rendered blocks; without it they are rendered into a fragment and sit
   * directly inside whatever the host laid out.
   */
  className?: string | undefined;
  /** Markdown to render in one go. Ignored while `streaming` is true. */
  md?: string | undefined;
  /** Feed content through `streamMd()` instead of the `md` prop. */
  streaming?: boolean | undefined;
  /** Fade words in as they arrive. */
  animation?: boolean | undefined;
  /** Called after each render so the host can keep the view pinned to the bottom. */
  scrollDown?: (() => void) | undefined;
}
