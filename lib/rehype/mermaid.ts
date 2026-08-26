import { visit } from "unist-util-visit";

import type { Root as HastRoot } from "hast";

interface DiagramOptions {
  /** The fence info string to claim. Defaults to "mermaid". */
  language?: string | undefined;
}

/**
 * Turn a diagram fence into an <m> element carrying the source, so the
 * component map can render it as a diagram rather than as code.
 *
 * Only added to a pipeline when a diagram plugin is configured; without one
 * the fence stays an ordinary code block.
 */
export function rehypeMermaid(options: DiagramOptions = {}) {
  const className = "language-" + (options.language ?? "mermaid");

  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "pre") {
        let rawCode: string;
        const codeNode = node.children[0];

        if (
          codeNode?.type === "element" &&
          codeNode.tagName === "code" &&
          codeNode.properties.className &&
          codeNode.properties.className.includes(className)
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
