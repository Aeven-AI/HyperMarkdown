import type { Root as HastRoot } from "hast";
import type { Pluggable } from "unified";

/**
 * The optional pieces of the renderer, supplied by the consumer.
 *
 * Maths, syntax highlighting and diagrams are the three heavy dependencies —
 * katex, highlight.js and mermaid between them dwarf everything else here. A
 * chat UI that never shows a formula should not pay to install katex, so none
 * of them is a dependency of this package: you pass in the ones you want and
 * the rest degrade rather than break.
 *
 * Import the ready-made ones from `hypermarkdown/plugins/*`, or write your own
 * against these interfaces to swap in a different highlighter or maths engine.
 */
export interface PluginConfig {
  math?: MathPlugin | undefined;
  code?: CodeHighlighterPlugin | undefined;
  diagram?: DiagramPlugin | undefined;
  cjk?: CjkPlugin | undefined;
}

/**
 * Renders maths. Without one, `$x$` and `$$x$$` stay literal text: the
 * `\(…\)` normalisation and the withholding of half-arrived formulas are both
 * skipped, since there is nothing downstream that would render them.
 */
export interface MathPlugin {
  type: "math";
  name: string;
  /** Parses the `$` delimiters into math nodes. */
  remarkPlugin: Pluggable;
  /** Turns those nodes into rendered markup. */
  rehypePlugin: Pluggable;
}

/**
 * Makes emphasis behave the way a CJK author expects.
 *
 * CommonMark's flanking rules assume words are separated by spaces, so
 * `**日本語（説明）**続き` renders its asterisks literally. Without this plugin
 * that is what happens — the text is still readable, just not emphasised.
 */
export interface CjkPlugin {
  type: "cjk";
  name: string;
  /** Runs before remark-gfm, which builds on the same delimiter machinery. */
  remarkPluginsBefore: Pluggable[];
}

/**
 * Highlights fenced code. Without one, code blocks still render — with their
 * line numbers, toolbar and streaming line cache — just unhighlighted.
 */
export interface CodeHighlighterPlugin {
  type: "code-highlighter";
  name: string;
  rehypePlugin: Pluggable;
  /**
   * Highlights a single line, for code that is still streaming.
   *
   * The rehype plugin above only runs once a fence closes, so without this a
   * block stays plain until its last line arrives. Optional: a highlighter
   * that cannot colour a line on its own simply leaves it undefined, and
   * streamed code renders unhighlighted as before.
   *
   * Returns a hast tree, or null when the line cannot be highlighted.
   */
  highlightLine?:
    | ((code: string, language: string | null) => HastRoot | null)
    | undefined;
}

/**
 * Renders diagrams. Without one, a ```mermaid fence stays an ordinary code
 * block, which is the right fallback: the source is still readable.
 */
export interface DiagramPlugin {
  type: "diagram";
  name: string;
  /** The info string this plugin claims, e.g. "mermaid". */
  language: string;
  /** Fetched on first use, so the engine is never in the initial bundle. */
  load(): Promise<DiagramEngine>;
  /** The engine, once loaded — lets a render skip awaiting on later diagrams. */
  loaded(): DiagramEngine | null;
}

/**
 * Structural, so this package needs no type dependency on mermaid itself.
 */
export interface DiagramEngine {
  initialize(config: Record<string, unknown>): void;
  render(
    id: string,
    source: string,
    container?: Element | undefined,
  ): Promise<DiagramResult>;
}

/** What a diagram engine hands back: the markup, and how to bind it. */
export interface DiagramResult {
  svg: string;
  bindFunctions?: ((element: Element) => void) | undefined;
}
