import type { ReactNode } from "react";
import type { Data } from "vfile";

/** How a block of streamed markdown is classified while it is still arriving. */
export type BlockType = "text" | "code" | "table" | "pending";

/** The kinds of block that render from a sub-block cache instead of a reparse. */
export type CacheType = "code" | "table" | "list";

/** The unified pipelines the renderer keeps built and ready. */
export type ProcessorType =
  | "regular"
  | "regular-stream"
  | "regular-animation"
  | "cached"
  | "cached-stream"
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

export interface RendererOptions {
  /** Markdown to render in one go. Ignored while `streaming` is true. */
  md?: string | undefined;
  /** Feed content through `streamMd()` instead of the `md` prop. */
  streaming?: boolean | undefined;
  /** Fade words in as they arrive. */
  animation?: boolean | undefined;
  /** Called after each render so the host can keep the view pinned to the bottom. */
  scrollDown?: (() => void) | undefined;
}
