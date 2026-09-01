import { SKIP, visit } from "unist-util-visit";

import type {
  Element as HastElement,
  Parent as HastParent,
  RootContent as HastContent,
} from "hast";
import type { Node as UnistNode } from "unist";
import type { Root as HastRoot } from "hast";

import { patterns } from "../patterns";

/**
 * Wrap each word in a span the stylesheet can fade in, so text appears word by
 * word as it streams. Raw-text elements are left alone: their children must
 * stay plain text.
 */
export function rehypeAnimation() {
  return (tree: HastRoot) => {
    visit(tree, visitor);
  };

  function visitor(
    node: UnistNode,
    index: number | undefined,
    parent: HastParent | undefined,
  ) {
    let key;
    let texts;
    let spanNodes: HastContent[];

    // KaTeX lays out its own spans — wrapping its text nodes breaks the math.
    // Raw-text elements hold text and nothing else; React drops a <script>
    // whose child is an element, taking its content with it.
    if (isHastElement(node)) {
      if (isKatex(node)) {
        // Fade the formula in as one unit: KaTeX lays out its own spans, so the
        // root is the only place a fade can attach without breaking the math.
        if (!("data-animate-word" in node.properties)) {
          node.properties["data-animate-word"] = true;
          node.properties["data-animate-key"] = `math-${index}`;
        }
        return SKIP;
      }
      if (patterns.rawTextTags.indexOf(node.tagName) !== -1) {
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

    if (isHastElement(parent) && parent.properties["data-animate-word"]) {
      return SKIP;
    }

    spanNodes = [];
    texts = node.value.split(patterns.emptyRegex);

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
    node: UnistNode,
  ): node is Extract<HastContent, { type: "text" }> {
    return node.type === "text" && "value" in node;
  }
}
