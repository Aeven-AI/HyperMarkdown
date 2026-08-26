import type { ComponentProps } from "react";

import MarkdownLink from "./link";
import MermaidDiagram from "./mermaid";
import MarkdownImage from "./image";
import MarkdownCode from "./code";
import MarkdownTable from "./table";

import type { Emitter } from "./runtime";
import type { RendererOptions } from "./types";
import type { UiConfig } from "./config";

/**
 * What the rendered components need back from the renderer that made them: the
 * options they read, and the instance itself, which a few of them hand back to
 * the renderer when they need it to re-render them.
 */
export interface RendererHost {
  readonly options: RendererOptions;
  readonly events: Emitter;
  readonly ui: UiConfig;
}

/**
 * The tags a renderer replaces with components of its own.
 *
 * Built once per renderer and shared by all of its pipelines: rehype-react
 * keys elements by component identity, so a map rebuilt per pipeline would
 * make the same block look like a different component each time it moved
 * between them — remounting it, which drops fullscreen and restarts
 * animations.
 */
export function createComponents(renderer: RendererHost) {
  return {
    a: function MarkdownLinkTag(props: ComponentProps<typeof MarkdownLink>) {
      return (
        <MarkdownLink
          {...props}
          renderer={renderer}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
    m: function MermaidDiagramTag(
      props: ComponentProps<typeof MermaidDiagram>,
    ) {
      return (
        <MermaidDiagram
          {...props}
          renderer={renderer}
          events={renderer.events}
          ui={renderer.ui}
          diagram={renderer.options.plugins?.diagram}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
    img: function MarkdownImageTag(
      props: ComponentProps<typeof MarkdownImage>,
    ) {
      return (
        <MarkdownImage
          {...props}
          renderer={renderer}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
    pre: function CodeBlockTag(props: ComponentProps<typeof MarkdownCode>) {
      return (
        <MarkdownCode
          {...props}
          renderer={renderer}
          events={renderer.events}
          ui={renderer.ui}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
    table: function MarkdownTableTag(
      props: ComponentProps<typeof MarkdownTable>,
    ) {
      return (
        <MarkdownTable
          {...props}
          renderer={renderer}
          events={renderer.events}
          ui={renderer.ui}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
  };
}

/** Only one cache is ever active at a time, so all three start over. */

/**
 * Components a cached fragment may contain. Kept narrow on purpose: a table
 * cell or list item can hold a link, an image or a mermaid ref, but never a
 * nested table or fence.
 */
export function cellComponents(renderer: RendererHost) {
  return {
    a: (props: ComponentProps<typeof MarkdownLink>) => {
      return (
        <MarkdownLink
          {...props}
          renderer={renderer}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
    m: (props: ComponentProps<typeof MermaidDiagram>) => {
      return (
        <MermaidDiagram
          {...props}
          renderer={renderer}
          events={renderer.events}
          ui={renderer.ui}
          diagram={renderer.options.plugins?.diagram}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
    img: (props: ComponentProps<typeof MarkdownImage>) => {
      return (
        <MarkdownImage
          {...props}
          renderer={renderer}
          scrollDown={renderer.options.scrollDown}
        />
      );
    },
  };
}
