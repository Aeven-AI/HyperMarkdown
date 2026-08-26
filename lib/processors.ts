import React from "react";
import type { ElementType } from "react";

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
import { rehypeData } from "./rehype/element-data";
import { rehypeMermaid } from "./rehype/mermaid";
import { rehypeAnimation } from "./rehype/animate-words";
import { rehypeLinkSafety } from "./rehype/link-safety";

import { buildSchema, resolveLinkSafety } from "./sanitize";

import type { PluginConfig } from "./plugin-types";
import type { AllowedTags, LinkSafetyConfig } from "./sanitize";
import type { ProcessorType } from "./types";

/**
 * The tags a renderer replaces with components of its own. rehype-react keys
 * elements by component identity, so every processor must be handed the same
 * map or the same block looks like a different component each time it moves
 * between pipelines — which remounts it.
 */
export type RendererComponents = Record<string, ElementType>;

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
/** The safety settings a pipeline is built with. */
export interface SafetyOptions {
  /** Turn sanitization off. Only for content you produced yourself. */
  sanitize?: boolean | undefined;
  /** Extra tags and attributes to let through. */
  allowedTags?: AllowedTags | undefined;
  /** Where links and images may point. */
  linkSafety?: LinkSafetyConfig | undefined;
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

  if (plugins.math) {
    beforeRehype.push(plugins.math.remarkPlugin);
  }

  beforeRehype.push(remarkGfm);

  if (shape.footnotes) {
    beforeRehype.push(remarkFootnotes);
  }

  // Straight after rehype-raw and before anything this renderer generates
  // itself: maths, highlighting, diagram elements and animation spans are all
  // built from already-clean content, so none of them needs whitelisting.
  if (safety.sanitize !== false) {
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
