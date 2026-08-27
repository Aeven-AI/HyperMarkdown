import { createElement, createContext, Fragment, memo, useLayoutEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { directive } from "micromark-extension-directive";
import { directiveFromMarkdown } from "mdast-util-directive";
import { math } from "micromark-extension-math";
import { mathFromMarkdown } from "mdast-util-math";

/**
 * LibreChat's streaming strategy, ported from
 * danny-avila/LibreChat @ main:
 *   client/src/components/Chat/Messages/Content/splitMarkdown.ts
 *   client/src/components/Chat/Messages/Content/MarkdownBlocks.tsx
 *
 * The idea: parse the accumulated message to mdast on every chunk purely to
 * find top-level block boundaries, slice the exact source for each block, then
 * render every block through its own react-markdown instance memoized on that
 * slice. A completed block's slice is byte-identical from one token to the
 * next, so it bails out of both parsing and reconciliation; only the final,
 * still-growing block goes through react-markdown again.
 *
 * The plugin list is the one every renderer here uses (gfm only, no maths and
 * no syntax highlighting) rather than LibreChat's full set, so the comparison
 * stays like-for-like. The splitter keeps LibreChat's own extension list,
 * because that is what decides where the block boundaries fall.
 */

const renderedCodeLang = (lang) =>
  /language-(\w+)/.exec(`language-${lang}`)?.[1] ?? "";

const isExecutableCode = (lang) => {
  const normalized = renderedCodeLang(lang);
  return normalized !== "math" && normalized !== "mermaid";
};

const containsDefinition = (node) => {
  if (node.type === "definition" || node.type === "footnoteDefinition") {
    return true;
  }
  return (node.children ?? []).some(containsDefinition);
};

const ARTIFACT_DIRECTIVE_TYPES = new Set(["containerDirective", "leafDirective"]);

const countWithin = (node, counts) => {
  if (ARTIFACT_DIRECTIVE_TYPES.has(node.type) && node.name === "artifact") {
    counts.artifact += 1;
    return;
  }
  if (node.type === "code") {
    if (isExecutableCode(node.lang ?? "")) {
      counts.code += 1;
    } else if (renderedCodeLang(node.lang ?? "") === "mermaid") {
      counts.mermaid += 1;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      countWithin(child, counts);
    }
  }
};

const parseToMdast = (content) =>
  fromMarkdown(content, {
    extensions: [gfm(), directive(), math({ singleDollarTextMath: false })],
    mdastExtensions: [gfmFromMarkdown(), directiveFromMarkdown(), mathFromMarkdown()],
  });

const blockCounts = (children) => {
  const counts = { code: 0, artifact: 0, mermaid: 0 };
  for (const node of children) {
    countWithin(node, counts);
  }
  return {
    codeBlockCount: counts.code,
    artifactCount: counts.artifact,
    mermaidCount: counts.mermaid,
  };
};

export function splitMarkdownIntoBlocks(content) {
  if (!content) {
    return [];
  }

  const tree = parseToMdast(content);
  const children = tree.children ?? [];

  if (children.length === 0) {
    return [{ raw: content, codeBlockCount: 0, artifactCount: 0, mermaidCount: 0 }];
  }

  // Reference definitions and raw HTML need document-global context, so those
  // messages render as a single block and lose the per-block memoization.
  const requiresWholeMessage = children.some(
    (node) => node.type === "html" || containsDefinition(node)
  );
  if (requiresWholeMessage) {
    return [{ raw: content, ...blockCounts(children) }];
  }

  const blocks = [];

  for (const node of children) {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start == null || end == null) {
      return [{ raw: content, ...blockCounts(children) }];
    }
    const counts = { code: 0, artifact: 0, mermaid: 0 };
    countWithin(node, counts);
    blocks.push({
      raw: content.slice(start, end),
      codeBlockCount: counts.code,
      artifactCount: counts.artifact,
      mermaidCount: counts.mermaid,
    });
  }

  return blocks;
}

// Stand-ins for LibreChat's ArtifactProvider / CodeBlockProvider. They carry no
// behaviour here, but they keep the per-block component tree the same shape.
// Upstream creates a fade rehype plugin when animating; animation is off for
// every renderer in this benchmark, so this is never called.
const createFadePlugin = () => null;

const ArtifactContext = createContext(0);
const CodeBlockContext = createContext(0);

const remarkPlugins = [remarkGfm];
const rehypePlugins = [];

const MarkdownBlock = memo(
  function MarkdownBlock({
    content,
    codeBaseIndex,
    artifactBaseIndex,
    mermaidBaseIndex,
    animate = false,
    hydrated = false,
  }) {
    // Mirrors the upstream fade wiring. With animation off `fade` is null and
    // the block renders through the plain plugin list, but the hooks still run
    // on every render of the block that is still growing.
    const fade = useMemo(() => (animate ? createFadePlugin(hydrated) : null), [animate]);
    const blockRehypePlugins = useMemo(
      () => (fade == null ? rehypePlugins : [...rehypePlugins, fade.plugin]),
      [fade]
    );
    useLayoutEffect(() => {
      fade?.commit();
    });

    return createElement(
      ArtifactContext.Provider,
      { value: artifactBaseIndex },
      createElement(
        CodeBlockContext.Provider,
        { value: codeBaseIndex, mermaidBaseIndex },
        createElement(
          ReactMarkdown,
          { remarkPlugins, rehypePlugins: blockRehypePlugins },
          content
        )
      )
    );
  },
  (prev, next) =>
    prev.content === next.content &&
    prev.codeBaseIndex === next.codeBaseIndex &&
    prev.artifactBaseIndex === next.artifactBaseIndex &&
    prev.mermaidBaseIndex === next.mermaidBaseIndex &&
    prev.animate === next.animate
);

const MarkdownBlocks = memo(function MarkdownBlocks({ content }) {
  const blocks = useMemo(() => {
    let codeBaseIndex = 0;
    let artifactBaseIndex = 0;
    let mermaidBaseIndex = 0;
    return splitMarkdownIntoBlocks(content).map((block) => {
      const entry = { raw: block.raw, codeBaseIndex, artifactBaseIndex, mermaidBaseIndex };
      codeBaseIndex += block.codeBlockCount;
      artifactBaseIndex += block.artifactCount;
      mermaidBaseIndex += block.mermaidCount;
      return entry;
    });
  }, [content]);

  return createElement(
    Fragment,
    null,
    blocks.map((block, index) =>
      createElement(MarkdownBlock, {
        key: `${index}-${block.codeBaseIndex}-${block.artifactBaseIndex}-${block.mermaidBaseIndex}`,
        content: block.raw,
        codeBaseIndex: block.codeBaseIndex,
        artifactBaseIndex: block.artifactBaseIndex,
        mermaidBaseIndex: block.mermaidBaseIndex,
        animate: false,
        hydrated: false,
      })
    )
  );
});

export const librechat = {
  name: "librechat",
  strategy: "split into top-level blocks, memoize all but the last",

  create() {
    let text = "";

    return {
      write: (chunk) => {
        text += chunk;
      },
      finish: () => {},
      element: () => createElement(MarkdownBlocks, { content: text }),
    };
  },
};
