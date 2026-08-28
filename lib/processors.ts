import React from "react";
import type { ElementType, ReactNode } from "react";

import { unified } from "unified";
import type { PluggableList } from "unified";
import { jsx, jsxs } from "react/jsx-runtime";

import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";

import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeReact from "rehype-react";

import { remarkFootnotes } from "./remark/footnotes";
import { rehypeCodeContext } from "./rehype/code-context";
import { rehypeData } from "./rehype/element-data";
import { rehypeMathPending } from "./rehype/math-pending";
import { rehypeMermaid } from "./rehype/mermaid";
import { rehypeAnimation } from "./rehype/animate-words";
import { rehypeLinkSafety } from "./rehype/link-safety";

import { buildSchema, resolveLinkSafety } from "./sanitize";

import type { PluginConfig } from "./plugin-types";
import type { AllowedTags, LinkSafetyConfig } from "./sanitize";
import type { ProcessorType } from "./types";
import type { Text as HastText } from "hast";

/**
 * The tags a renderer replaces with components of its own. rehype-react keys
 * elements by component identity, so every processor must be handed the same
 * map or the same block looks like a different component each time it moves
 * between pipelines — which remounts it.
 */
export type RendererComponents = Record<string, ElementType>;

/**
 * Props a replaced `code` component receives.
 *
 * The discriminant is what makes the three kinds of `<code>` tellable apart:
 * inline code, a fence with a language, and a fence without one. Narrowing on
 * `inline` is required before reading `className`, so treating a language-less
 * fence as inline code is a type error rather than a wrong answer at runtime.
 */
export type CodeComponentProps =
  | {
      /** Inline code: a `<code>` no `<pre>` encloses. */
      inline: true;
      /** Whether an `<a>` encloses it, so a host does not nest a control in a link. */
      insideLink: boolean;
      children?: ReactNode;
    }
  | {
      /** Fenced or indented code: the `<code>` inside a `<pre>`. */
      inline: false;
      /** `language-*` when the fence named one, absent otherwise. */
      className?: string | undefined;
      insideLink: boolean;
      children?: ReactNode;
    };

/** What each pipeline needs on top of the steps every one of them shares. */
interface PipelineShape {
  /** Hold footnote definitions back for the renderer to place. */
  footnotes: boolean;
  /** Stamp the props the component map reads. */
  data: boolean;
  /** Turn mermaid fences into diagram elements. */
  diagrams: boolean;
  /** Highlight fenced code. */
  highlight: boolean;
  /** Wrap words so they can fade in. */
  animation: boolean;
  /**
   * Finish as React. The cached-* pipelines stop at hast on purpose, so a
   * single row or line can be lifted out and turned into React on its own
   * without re-running the whole block.
   */
  react: boolean;
}

const PIPELINES: Record<ProcessorType, PipelineShape> = {
  regular: {
    footnotes: false,
    data: true,
    diagrams: true,
    highlight: true,
    animation: false,
    react: true,
  },
  "regular-stream": {
    footnotes: true,
    data: true,
    diagrams: true,
    highlight: false,
    animation: false,
    react: true,
  },
  "regular-animation": {
    footnotes: true,
    data: true,
    diagrams: true,
    highlight: false,
    animation: true,
    react: true,
  },
  "cached-table": {
    footnotes: false,
    data: false,
    diagrams: false,
    highlight: false,
    animation: false,
    react: false,
  },
  "cached-table-animation": {
    footnotes: false,
    data: false,
    diagrams: false,
    highlight: false,
    animation: true,
    react: false,
  },
  footnote: {
    footnotes: false,
    data: true,
    diagrams: false,
    highlight: false,
    animation: false,
    react: true,
  },
  "footnote-animation": {
    footnotes: false,
    data: true,
    diagrams: false,
    highlight: false,
    animation: true,
    react: true,
  },
};

/**
 * Build one of the pipelines the renderer keeps ready.
 *
 * `plugins` supplies the optional stages. A slot left empty is simply not
 * added: no maths plugin means `$x$` stays literal text, no code plugin means
 * unhighlighted code, no diagram plugin means a mermaid fence renders as the
 * code block it is written as.
 */
/** What a pipeline does with raw HTML written in the markdown source. */
export type HtmlMode = "sanitize" | "literal" | "raw";

/** The safety settings a pipeline is built with. */
export interface SafetyOptions {
  /**
   * How raw HTML in the source is treated.
   *
   * - `"sanitize"` (default) parses it and drops whatever the schema
   *   disallows, so vetted markup reaches the DOM.
   * - `"literal"` never parses it. The markup is rendered as visible text, so
   *   no author-supplied element can enter the DOM under any schema gap. This
   *   is the stronger guarantee for untrusted model output, and the weaker
   *   feature: a deliberate `<br>` shows up as characters.
   * - `"raw"` parses it and applies no schema at all. Only for content you
   *   produced yourself.
   *
   * Left unset, `sanitize: false` still selects `"raw"`.
   */
  html?: HtmlMode | undefined;
  /** Turn sanitization off. Superseded by `html`; kept for existing callers. */
  sanitize?: boolean | undefined;
  /** Extra tags and attributes to let through. */
  allowedTags?: AllowedTags | undefined;
  /** Where links and images may point. */
  linkSafety?: LinkSafetyConfig | undefined;
}

/**
 * Resolve the effective HTML mode from the two settings that can express it.
 * @param safety - The pipeline's safety settings.
 * @returns The mode to build the pipeline with.
 */
function htmlMode(safety: SafetyOptions): HtmlMode {
  if (safety.html !== undefined) {
    return safety.html;
  }

  return safety.sanitize === false ? "raw" : "sanitize";
}

/**
 * remark-rehype handler turning a raw HTML node into the text of its own
 * markup.
 *
 * Without a handler, remark-rehype drops raw HTML rather than showing it, so
 * `<b>hi</b>` would vanish instead of reading literally.
 * @param _state - remark-rehype's transform state, unused.
 * @param node - The mdast html node.
 * @returns A hast text node carrying the markup verbatim.
 */
function literalHtml(_state: unknown, node: { value: string }): HastText {
  return { type: "text", value: node.value };
}

export function createProcessor(
  type: ProcessorType,
  components: RendererComponents,
  plugins: PluginConfig = {},
  safety: SafetyOptions = {},
) {
  const shape = PIPELINES[type] ?? PIPELINES.regular;

  // Collected as lists rather than chained conditionally: unified's fluent
  // types collapse to `unknown` the moment the chain forks, and callers rely
  // on knowing whether a pipeline ends at hast or at React.
  const beforeRehype: PluggableList = [];
  const afterRehype: PluggableList = [];

  // Before remark-gfm on purpose: it retokenises emphasis, which gfm's
  // strikethrough builds on.
  if (plugins.cjk) {
    beforeRehype.push(...plugins.cjk.remarkPluginsBefore);
  }

  if (plugins.math) {
    if (plugins.math.remarkPluginsBefore) {
      beforeRehype.push(...plugins.math.remarkPluginsBefore);
    }
    beforeRehype.push(plugins.math.remarkPlugin);
  }

  beforeRehype.push(remarkGfm);

  if (shape.footnotes) {
    beforeRehype.push(remarkFootnotes);
  }

  // Straight after rehype-raw and before anything this renderer generates
  // itself: maths, highlighting, diagram elements and animation spans are all
  // built from already-clean content, so none of them needs whitelisting.
  const mode = htmlMode(safety);

  if (mode !== "raw") {
    const linkSafety = resolveLinkSafety(safety.linkSafety);

    afterRehype.push([
      rehypeSanitize,
      buildSchema(safety.allowedTags, linkSafety),
    ]);
    afterRehype.push([rehypeLinkSafety, linkSafety]);
  }

  if (plugins.math) {
    afterRehype.push(plugins.math.rehypePlugin);
  }

  // After sanitization, and in every HTML mode: the marker is renderer chrome
  // that the repair pass leaves in the text, not author markup.
  afterRehype.push(rehypeMathPending);

  // After sanitization, which would drop unknown properties, and only when the
  // host replaced `code`: on the built-in element these become DOM attributes.
  if (shape.react && components["code"] !== undefined) {
    afterRehype.push(rehypeCodeContext);
  }

  if (shape.data) {
    afterRehype.push(rehypeData);
  }

  if (shape.diagrams && plugins.diagram) {
    afterRehype.push([rehypeMermaid, { language: plugins.diagram.language }]);
  }

  if (shape.highlight && plugins.code) {
    afterRehype.push(plugins.code.rehypePlugin);
  }

  if (shape.animation) {
    afterRehype.push(rehypeAnimation);
  }

  if (shape.react) {
    afterRehype.push([
      rehypeReact,
      {
        jsx: customJsx,
        jsxs: customJsxs,
        Fragment: React.Fragment,
        createElement: React.createElement,
        components,
      },
    ]);
  }

  if (mode === "literal") {
    // No rehype-raw: the markup never becomes elements, so there is no schema
    // for a gap to open in. It reaches the reader as the characters written.
    return unified()
      .use(remarkParse)
      .use(beforeRehype)
      .use(remarkRehype, {
        handlers: { html: literalHtml },
        footnoteLabel: "References",
      })
      .use(afterRehype);
  }

  return unified()
    .use(remarkParse)
    .use(beforeRehype)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel: "References",
    })
    .use(rehypeRaw)
    .use(afterRehype);
}

// rehype-react passes `key` inside props; the jsx runtime wants it as the
// third argument, and silently drops it otherwise.
function customJsx(
  type: ElementType,
  props: Record<string, unknown> & { key?: React.Key },
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
  props: Record<string, unknown> & { key?: React.Key },
) {
  if (props && props.key) {
    const key = props.key;
    const newProps = { ...props };
    delete newProps.key;
    return jsxs(type, newProps, key);
  }
  return jsxs(type, props);
}
